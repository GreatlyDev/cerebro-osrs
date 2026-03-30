from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.account_snapshot import AccountSnapshot
from app.models.chat import ChatMessage, ChatSession
from app.models.goal import Goal
from app.models.profile import Profile
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreateRequest,
    ChatMessageResponse,
    ChatMessageSummary,
    ChatSessionCreateRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
)
from app.services.bosses import boss_advisor_service
from app.services.gear import gear_service
from app.services.money_makers import money_maker_service
from app.services.planner import planner_service
from app.services.quests import QUEST_CATALOG, quest_service
from app.services.recommendations import recommendation_service
from app.services.skills import skill_service
from app.services.teleports import teleport_service
from app.services.account_context import account_context_service
from app.services.user_context import user_context_service
from app.services.assistant import AssistantChatContext, assistant_service
from app.schemas.gear import GearRecommendationRequest
from app.schemas.recommendation import NextActionRequest
from app.schemas.teleport import TeleportRouteRequest


class ChatService:
    async def create_session(
        self,
        db_session: AsyncSession,
        user: User,
        payload: ChatSessionCreateRequest,
    ) -> ChatSessionResponse:
        session = ChatSession(user_id=user.id, title=payload.title)
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        return ChatSessionResponse.model_validate(session)

    async def list_sessions(self, db_session: AsyncSession, user: User) -> ChatSessionListResponse:
        sessions = list(
            (
                await db_session.scalars(
                    select(ChatSession).where(ChatSession.user_id == user.id).order_by(desc(ChatSession.id))
                )
            ).all()
        )
        return ChatSessionListResponse(
            items=[ChatSessionResponse.model_validate(session) for session in sessions],
            total=len(sessions),
        )

    async def send_message(
        self,
        db_session: AsyncSession,
        user: User,
        session_id: int,
        payload: ChatMessageCreateRequest,
    ) -> ChatMessageResponse:
        session = await db_session.scalar(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
        )
        if session is None:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")

        user_message = ChatMessage(session_id=session_id, role="user", content=payload.content)
        db_session.add(user_message)
        await db_session.flush()

        assistant_content = await self._generate_response(
            db_session=db_session,
            user=user,
            session=session,
            message=payload.content,
        )
        assistant_message = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=assistant_content,
        )
        db_session.add(assistant_message)
        await db_session.commit()
        await db_session.refresh(user_message)
        await db_session.refresh(assistant_message)

        return ChatMessageResponse(
            session_id=session_id,
            user_message=ChatMessageSummary.model_validate(user_message),
            assistant_message=ChatMessageSummary.model_validate(assistant_message),
        )

    async def _generate_response(
        self,
        db_session: AsyncSession,
        user: User,
        session: ChatSession,
        message: str,
    ) -> str:
        recent_messages = await self._get_recent_messages(
            db_session=db_session,
            session_id=session.id,
        )
        resolved_message = self._resolve_follow_up_message(
            message=message,
            recent_messages=recent_messages,
        )
        profile = await user_context_service.get_profile(db_session=db_session, user=user)
        latest_goal = await user_context_service.get_latest_goal(db_session=db_session, user=user)
        latest_account = await user_context_service.get_latest_account(db_session=db_session, user=user)
        focus_account = await self._resolve_focus_account(
            db_session=db_session,
            user=user,
            profile=profile,
            latest_goal=latest_goal,
            latest_account=latest_account,
        )
        latest_snapshot = await self._get_latest_snapshot(
            db_session=db_session,
            account=focus_account,
        )
        previous_snapshot = await self._get_previous_snapshot(
            db_session=db_session,
            account=focus_account,
        )
        progress = await self._get_progress(
            db_session=db_session,
            account=focus_account,
        )
        stat_answer = await self._build_direct_stat_answer(
            db_session=db_session,
            user=user,
            message=resolved_message,
            account=focus_account,
            profile=profile,
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
            progress=progress,
        )
        if stat_answer is not None:
            return stat_answer

        structured_response = await self._generate_structured_response(
            db_session=db_session,
            user=user,
            session=session,
            message=resolved_message,
            profile=profile,
            latest_goal=latest_goal,
            latest_account=focus_account,
            latest_snapshot=latest_snapshot,
        )
        ai_response = await assistant_service.generate_chat_reply(
            AssistantChatContext(
                session_title=session.title,
                user_display_name=user.display_name,
                user_message=resolved_message,
                structured_fallback=structured_response,
                recent_messages=recent_messages,
                profile_summary=self._summarize_profile(profile),
                account_summary=self._summarize_account(focus_account),
                snapshot_summary=self._summarize_snapshot(latest_snapshot),
                skills_summary=self._summarize_skills(latest_snapshot),
                progress_summary=self._summarize_progress(progress),
                snapshot_delta_summary=self._summarize_snapshot_delta(latest_snapshot, previous_snapshot),
                goal_summary=self._summarize_goal(latest_goal),
            )
        )
        return ai_response or structured_response

    async def _generate_structured_response(
        self,
        db_session: AsyncSession,
        user: User,
        session: ChatSession,
        message: str,
        profile: Profile | None,
        latest_goal: Goal | None,
        latest_account: Account | None,
        latest_snapshot: AccountSnapshot | None,
    ) -> str:
        normalized = message.lower()

        if "skill" in normalized or "train" in normalized:
            recommendations = await skill_service.get_recommendations(
                db_session=db_session,
                user=user,
                skill_name="magic" if "magic" in normalized else "woodcutting",
                account_rsn=latest_account.rsn if latest_account else None,
                preference=None,
            )
            top = recommendations.recommendations[0]
            return (
                f"For {recommendations.skill}, I'd start with {top.method}. "
                f"It fits a {recommendations.preference} preference and is a strong next step "
                f"from your current context."
            )

        if "gear" in normalized or "upgrade" in normalized:
            gear = await gear_service.get_recommendations(
                db_session=db_session,
                user=user,
                payload=GearRecommendationRequest(
                    combat_style="magic" if "magic" in normalized else "melee",
                    budget_tier="midgame",
                    current_gear=[],
                    account_rsn=latest_account.rsn if latest_account else None,
                ),
            )
            top = gear.recommendations[0]
            return (
                f"A strong next upgrade is {top.item_name} for your {top.slot} slot. "
                f"{top.upgrade_reason}"
            )

        if "teleport" in normalized or "travel" in normalized or "route" in normalized:
            route = await teleport_service.get_route(
                db_session=db_session,
                user=user,
                payload=TeleportRouteRequest(
                    destination="fossil island" if "fossil" in normalized else "barrows",
                    account_rsn=latest_account.rsn if latest_account else None,
                    preference=None,
                ),
            )
            return (
                f"For {route.destination}, I'd use {route.recommended_route.method}. "
                f"{route.recommended_route.travel_notes}"
            )

        if "quest" in normalized:
            quest = quest_service.get_quest(
                "recipe-for-disaster" if "barrows" in normalized else "bone-voyage"
            )
            return (
                f"{quest.name} is worth prioritizing because {quest.why_it_matters} "
                f"Next, I'd {quest.next_steps[0].lower()}"
            )

        if "best action" in normalized or "next best" in normalized:
            next_actions = await recommendation_service.get_next_actions(
                db_session=db_session,
                user=user,
                payload=NextActionRequest(
                    account_rsn=latest_account.rsn if latest_account else None,
                    goal_id=latest_goal.id if latest_goal else None,
                    limit=3,
                ),
            )
            top_action = next_actions.top_action
            if top_action is not None:
                return (
                    f"Your next best action is to {top_action.title.lower()}. "
                    f"{top_action.summary}"
                )

        if latest_goal is None and ("work on next" in normalized or "do next" in normalized):
            next_actions = await recommendation_service.get_next_actions(
                db_session=db_session,
                user=user,
                payload=NextActionRequest(
                    account_rsn=latest_account.rsn if latest_account else None,
                    goal_id=latest_goal.id if latest_goal else None,
                    limit=3,
                ),
            )
            top_action = next_actions.top_action
            if top_action is not None:
                return (
                    f"If I were steering this account, I'd start with {top_action.title.lower()}. "
                    f"{top_action.summary}"
                )

        if "goal" in normalized and latest_goal is not None:
            recommendations = await planner_service.build_goal_recommendations(
                db_session=db_session,
                user=user,
                goal=latest_goal,
                profile=profile,
                snapshot=latest_snapshot,
                target_rsn=latest_goal.target_account_rsn
                or (latest_account.rsn if latest_account else None),
            )
            return planner_service.summarize_next_action(latest_goal, recommendations)

        if ("next" in normalized or "should i do" in normalized) and latest_goal is not None:
            recommendations = await planner_service.build_goal_recommendations(
                db_session=db_session,
                user=user,
                goal=latest_goal,
                profile=profile,
                snapshot=latest_snapshot,
                target_rsn=latest_goal.target_account_rsn
                or (latest_account.rsn if latest_account else None),
            )
            return planner_service.summarize_next_action(latest_goal, recommendations)

        if latest_snapshot is not None and profile is not None:
            return (
                f"You're sitting around overall level {latest_snapshot.summary.get('overall_level')} "
                f"with a {profile.play_style} play style. I can help with skills, quests, gear, teleports, or goals next."
            )

        return (
            f"This chat session '{session.title}' is ready. Ask me about skills, quests, gear, teleports, or goals and "
            "I'll answer from the structured data we've built so far."
        )

    async def _get_latest_snapshot(
        self,
        db_session: AsyncSession,
        account: Account | None,
    ) -> AccountSnapshot | None:
        if account is None:
            return None

        return await db_session.scalar(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account.id)
            .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
        )

    async def _resolve_focus_account(
        self,
        db_session: AsyncSession,
        user: User,
        profile: Profile | None,
        latest_goal: Goal | None,
        latest_account: Account | None,
    ) -> Account | None:
        candidate_rsns = [
            profile.primary_account_rsn if profile is not None else None,
            latest_goal.target_account_rsn if latest_goal is not None else None,
        ]
        for candidate_rsn in candidate_rsns:
            if candidate_rsn is None:
                continue
            account = await account_context_service.get_account_by_rsn(
                db_session=db_session,
                user=user,
                account_rsn=candidate_rsn,
            )
            if account is not None:
                return account
        return latest_account

    def _resolve_follow_up_message(
        self,
        *,
        message: str,
        recent_messages: list[tuple[str, str]],
    ) -> str:
        normalized = message.lower().strip()
        if not self._is_follow_up_message(normalized):
            return message

        previous_user_message = self._get_previous_user_message(
            current_message=message,
            recent_messages=recent_messages,
        )
        if previous_user_message is None:
            return message

        previous_normalized = previous_user_message.lower()
        current_style = self._detect_combat_style(normalized)
        current_destination = self._detect_destination(normalized)
        current_quest_id = self._detect_quest_id(normalized)
        current_boss_id = boss_advisor_service.detect_boss_id(normalized)
        current_money_target = self._detect_money_target(normalized)

        if ("gear" in previous_normalized or "upgrade" in previous_normalized) and current_style is not None:
            return f"What {current_style} gear upgrade should I get next?"

        if any(token in previous_normalized for token in ("teleport", "route", "get to", "travel")):
            if current_destination is not None:
                return f"How do I get to {current_destination}?"

        if any(
            phrase in previous_normalized
            for phrase in ("am i ready for", "what am i missing for", "requirements for", "ready for")
        ):
            if current_quest_id is not None:
                quest = quest_service.get_quest(current_quest_id)
                return f"What am I missing for {quest.name}?"

        if any(token in previous_normalized for token in ("boss", "jad", "fight caves", "barrows", "demonic gorillas")):
            if current_boss_id is not None:
                boss_label = self._boss_label(current_boss_id)
                return f"Am I ready for {boss_label}?"

        if any(token in previous_normalized for token in ("money", "money maker", "profit", "gp")):
            if current_money_target is not None:
                return f"What money maker should I do for {current_money_target}?"

        if any(token in previous_normalized for token in ("skill", "train")):
            current_skill = self._detect_skill_name(
                normalized,
                {
                    "attack": {},
                    "strength": {},
                    "defence": {},
                    "ranged": {},
                    "prayer": {},
                    "magic": {},
                    "runecraft": {},
                    "construction": {},
                    "hitpoints": {},
                    "agility": {},
                    "herblore": {},
                    "thieving": {},
                    "crafting": {},
                    "fletching": {},
                    "slayer": {},
                    "hunter": {},
                    "mining": {},
                    "smithing": {},
                    "fishing": {},
                    "cooking": {},
                    "firemaking": {},
                    "woodcutting": {},
                    "farming": {},
                },
            )
            if current_skill is not None:
                return f"What skill should I train next for {current_skill}?"

        return message

    def _is_follow_up_message(self, normalized_message: str) -> bool:
        follow_up_starts = (
            "what about",
            "how about",
            "and for",
            "and what about",
            "what about for",
        )
        return normalized_message.startswith(follow_up_starts)

    def _get_previous_user_message(
        self,
        *,
        current_message: str,
        recent_messages: list[tuple[str, str]],
    ) -> str | None:
        skipped_current = False
        for role, content in reversed(recent_messages):
            if role != "user":
                continue
            if not skipped_current and content.strip() == current_message.strip():
                skipped_current = True
                continue
            return content
        return None

    async def _get_recent_messages(
        self,
        db_session: AsyncSession,
        session_id: int,
        limit: int = 6,
    ) -> list[tuple[str, str]]:
        messages = list(
            reversed(
                list(
                    (
                        await db_session.scalars(
                            select(ChatMessage)
                            .where(ChatMessage.session_id == session_id)
                            .order_by(desc(ChatMessage.id))
                            .limit(limit)
                        )
                    ).all()
                )
            )
        )
        return [(message.role, message.content) for message in messages]

    async def _get_previous_snapshot(
        self,
        db_session: AsyncSession,
        account: Account | None,
    ) -> AccountSnapshot | None:
        if account is None:
            return None

        snapshots = list(
            (
                await db_session.scalars(
                    select(AccountSnapshot)
                    .where(AccountSnapshot.account_id == account.id)
                    .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
                    .limit(2)
                )
            ).all()
        )
        return snapshots[1] if len(snapshots) > 1 else None

    async def _get_progress(
        self,
        db_session: AsyncSession,
        account: Account | None,
    ) -> AccountProgress | None:
        if account is None:
            return None

        return await db_session.scalar(
            select(AccountProgress).where(AccountProgress.account_id == account.id)
        )

    def _summarize_profile(self, profile: Profile | None) -> str | None:
        if profile is None:
            return None
        return (
            f"display_name={profile.display_name}, play_style={profile.play_style}, "
            f"goals_focus={profile.goals_focus}, prefers_afk={profile.prefers_afk_methods}, "
            f"prefers_profitable={profile.prefers_profitable_methods}, "
            f"primary_account={profile.primary_account_rsn or 'none'}"
        )

    def _summarize_account(self, account: Account | None) -> str | None:
        if account is None:
            return None
        return f"focused_account={account.rsn}, active={account.is_active}"

    def _summarize_goal(self, goal: Goal | None) -> str | None:
        if goal is None:
            return None
        return (
            f"title={goal.title}, type={goal.goal_type}, status={goal.status}, "
            f"target_account={goal.target_account_rsn or 'none'}"
        )

    def _summarize_snapshot(self, snapshot: AccountSnapshot | None) -> str | None:
        if snapshot is None:
            return None

        summary = snapshot.summary or {}
        top_skills = self._join_preview(summary.get("top_skills"))
        activity_overview = self._join_preview(summary.get("activity_overview"))
        return (
            f"overall_level={summary.get('overall_level')}, combat_level={summary.get('combat_level')}, "
            f"progression_profile={summary.get('progression_profile')}, "
            f"top_skills={top_skills or 'unknown'}, activity_overview={activity_overview or 'unknown'}"
        )

    def _summarize_progress(self, progress: AccountProgress | None) -> str | None:
        if progress is None:
            return None

        return (
            f"completed_quests={len(progress.completed_quests)}, "
            f"unlocked_transports={len(progress.unlocked_transports)}, "
            f"owned_gear={len(progress.owned_gear)}, "
            f"active_unlocks={len(progress.active_unlocks)}, "
            f"completed_quest_preview={self._preview_list(progress.completed_quests)}, "
            f"transport_preview={self._preview_list(progress.unlocked_transports)}, "
            f"gear_preview={self._preview_list(progress.owned_gear)}, "
            f"unlock_preview={self._preview_list(progress.active_unlocks)}"
        )

    def _summarize_snapshot_delta(
        self,
        latest_snapshot: AccountSnapshot | None,
        previous_snapshot: AccountSnapshot | None,
    ) -> str | None:
        if latest_snapshot is None or previous_snapshot is None:
            return None

        latest_summary = latest_snapshot.summary or {}
        previous_summary = previous_snapshot.summary or {}
        overall_delta = int(latest_summary.get("overall_level", 0) or 0) - int(
            previous_summary.get("overall_level", 0) or 0
        )
        combat_delta = int(latest_summary.get("combat_level", 0) or 0) - int(
            previous_summary.get("combat_level", 0) or 0
        )
        improved = self._collect_improved_skills(latest_snapshot, previous_snapshot)
        improved_text = ", ".join(improved[:4]) if improved else "none"
        return (
            f"overall_level_delta={overall_delta}, combat_level_delta={combat_delta}, "
            f"improved_skills={improved_text}"
        )

    def _summarize_skills(self, snapshot: AccountSnapshot | None) -> str | None:
        if snapshot is None:
            return None

        skills = snapshot.summary.get("skills")
        if not isinstance(skills, dict):
            return None

        parts: list[str] = []
        for skill_name, data in skills.items():
            if skill_name == "overall" or not isinstance(data, dict):
                continue
            level = data.get("level")
            if isinstance(level, int):
                parts.append(f"{skill_name}={level}")

        return ", ".join(parts) if parts else None

    async def _build_direct_stat_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        profile: Profile | None,
        latest_snapshot: AccountSnapshot | None,
        previous_snapshot: AccountSnapshot | None,
        progress: AccountProgress | None,
    ) -> str | None:
        account_answer = self._build_account_focus_answer(message=message, account=account)
        if account_answer is not None:
            return account_answer

        if latest_snapshot is None:
            if progress is not None:
                return self._build_progress_answer(message=message, progress=progress)
            return None

        normalized = message.lower()
        summary = latest_snapshot.summary or {}
        skills = summary.get("skills")
        if not isinstance(skills, dict):
            skills = {}

        progress_answer = self._build_progress_answer(message=message, progress=progress)
        if progress_answer is not None:
            return progress_answer

        change_answer = self._build_snapshot_change_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )
        if change_answer is not None:
            return change_answer

        readiness_answer = self._build_quest_readiness_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if readiness_answer is not None:
            return readiness_answer

        boss_answer = self._build_boss_readiness_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if boss_answer is not None:
            return boss_answer

        money_maker_answer = self._build_money_maker_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
            profile=profile,
        )
        if money_maker_answer is not None:
            return money_maker_answer

        teleport_answer = await self._build_teleport_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
        )
        if teleport_answer is not None:
            return teleport_answer

        gear_answer = await self._build_gear_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            progress=progress,
        )
        if gear_answer is not None:
            return gear_answer

        top_skills_answer = self._build_top_skills_answer(message=message, latest_snapshot=latest_snapshot)
        if top_skills_answer is not None:
            return top_skills_answer

        lowest_skill_answer = self._build_low_skills_answer(message=message, latest_snapshot=latest_snapshot)
        if lowest_skill_answer is not None:
            return lowest_skill_answer

        metric = self._detect_stat_metric(normalized)
        skill_name = self._detect_skill_name(normalized, skills)

        if skill_name is not None:
            skill_data = skills.get(skill_name)
            if isinstance(skill_data, dict):
                label = skill_name.replace("_", " ").title()
                if metric == "experience":
                    experience = skill_data.get("experience")
                    if isinstance(experience, int):
                        return f"Your {label} experience is {experience:,}."
                elif metric == "rank":
                    rank = skill_data.get("rank")
                    if isinstance(rank, int):
                        return f"Your {label} rank is {rank:,}."
                else:
                    level = skill_data.get("level")
                    if isinstance(level, int):
                        return f"Your {label} level is {level}."

        if "combat" in normalized and "level" in normalized:
            combat_level = summary.get("combat_level")
            if isinstance(combat_level, int):
                return f"Your combat level is {combat_level}."

        if ("overall" in normalized or "total" in normalized) and "level" in normalized:
            overall_level = summary.get("overall_level")
            if isinstance(overall_level, int):
                return f"Your overall level is {overall_level}."

        if ("overall" in normalized or "total" in normalized) and "rank" in normalized:
            overall_rank = summary.get("overall_rank")
            if isinstance(overall_rank, int):
                return f"Your overall rank is {overall_rank:,}."

        return None

    def _build_account_focus_answer(
        self,
        *,
        message: str,
        account: Account | None,
    ) -> str | None:
        if account is None:
            return None

        normalized = message.lower()
        if (
            "which account" in normalized
            or "what account" in normalized
            or "who am i asking about" in normalized
            or "what rsn" in normalized
        ):
            return f"I'm currently using {account.rsn} as your account context."

        return None

    def _build_top_skills_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
    ) -> str | None:
        normalized = message.lower()
        if "top skill" not in normalized and "best skill" not in normalized and "highest skill" not in normalized:
            return None

        top_skills = latest_snapshot.summary.get("top_skills")
        if not isinstance(top_skills, list) or not top_skills:
            return None

        top_skill = top_skills[0] if isinstance(top_skills[0], dict) else None
        if (
            top_skill is not None
            and ("highest skill" in normalized or "best skill" in normalized)
            and "skills" not in normalized
        ):
            skill_name = str(top_skill.get("skill", "")).replace("_", " ").title()
            level = top_skill.get("level")
            if skill_name and isinstance(level, int):
                return f"Your highest tracked skill right now is {skill_name} at level {level}."

        formatted = []
        for skill in top_skills[:5]:
            if not isinstance(skill, dict):
                continue
            skill_name = str(skill.get("skill", "")).replace("_", " ").title()
            level = skill.get("level")
            if skill_name and isinstance(level, int):
                formatted.append(f"{skill_name} {level}")

        if not formatted:
            return None

        return f"Your top skills right now are {', '.join(formatted)}."

    def _build_quest_readiness_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in ("am i ready for", "what am i missing for", "requirements for", "ready for")
        ):
            return None

        quest_id = self._detect_quest_id(normalized)
        if quest_id is None:
            return None

        quest = quest_service.get_quest(quest_id)
        readiness = quest_service.evaluate_readiness(
            quest_id=quest_id,
            skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
            completed_quests=progress.completed_quests if progress else None,
            unlocked_transports=progress.unlocked_transports if progress else None,
        )

        missing_skills = readiness.get("missing_skills", [])
        missing_quests = readiness.get("missing_quests", [])
        missing_other = readiness.get("missing_other_requirements", [])

        if not missing_skills and not missing_quests and not missing_other:
            return (
                f"You're in a good spot for {quest.name}. "
                f"Your currently tracked stats and unlocks cover the structured blockers I know about."
            )

        parts: list[str] = [f"For {quest.name}, you're still missing a few things."]
        if missing_skills:
            skill_bits = [
                f"{gap['skill'].replace('_', ' ').title()} {gap['current_level']}->{gap['required_level']}"
                for gap in missing_skills[:4]
                if isinstance(gap, dict)
            ]
            if skill_bits:
                parts.append(f"Skill gaps: {', '.join(skill_bits)}.")
        if missing_quests:
            parts.append(f"Quest blockers: {', '.join(missing_quests[:4])}.")
        if missing_other:
            parts.append(f"Other blockers: {', '.join(missing_other[:4])}.")

        return " ".join(parts)

    def _build_boss_readiness_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(phrase in normalized for phrase in ("am i ready for", "ready for", "can i do")):
            return None

        boss_id = boss_advisor_service.detect_boss_id(normalized)
        if boss_id is None:
            return None

        readiness = boss_advisor_service.evaluate_readiness(
            boss_id=boss_id,
            skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
            unlocked_transports=progress.unlocked_transports if progress else None,
            completed_quests=progress.completed_quests if progress else None,
        )
        label = str(readiness["label"])
        missing_skills = readiness["missing_skills"]
        missing_unlocks = readiness["missing_unlocks"]

        if not missing_skills and not missing_unlocks:
            return f"You're in a good spot for {label}. {readiness['notes']}"

        parts = [f"For {label}, you're not fully ready yet."]
        if missing_skills:
            parts.append(
                "Skill gaps: "
                + ", ".join(
                    f"{gap['skill'].replace('_', ' ').title()} {gap['current_level']}->{gap['required_level']}"
                    for gap in missing_skills[:4]
                    if isinstance(gap, dict)
                )
                + "."
            )
        if missing_unlocks:
            parts.append(f"Unlock blockers: {', '.join(missing_unlocks[:4])}.")
        parts.append(str(readiness["notes"]))
        return " ".join(parts)

    def _build_money_maker_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
        profile: Profile | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(token in normalized for token in ("money maker", "make money", "profit", "gp")):
            return None

        options = money_maker_service.get_best_options(
            skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
            unlocked_transports=progress.unlocked_transports if progress else None,
            completed_quests=progress.completed_quests if progress else None,
            prefers_profitable_methods=profile.prefers_profitable_methods if profile is not None else False,
        )
        if not options:
            return None

        target = self._detect_money_target(normalized)
        if target is not None:
            matching = next((option for option in options if target in option["name"].lower()), None)
            if matching is not None:
                if matching["missing_requirements"]:
                    return (
                        f"{matching['name']} is a good target, but you're still missing "
                        f"{', '.join(matching['missing_requirements'][:4])}. {matching['why']}"
                    )
                return f"{matching['name']} is a strong fit right now. {matching['summary']} {matching['why']}"

        top = options[0]
        if top["missing_requirements"]:
            return (
                f"Your best tracked money maker to work toward is {top['name']}. "
                f"You're still missing {', '.join(top['missing_requirements'][:4])}. {top['why']}"
            )
        return f"Your best tracked money maker right now is {top['name']}. {top['summary']} {top['why']}"

    async def _build_teleport_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(token in normalized for token in ("teleport", "route", "get to", "travel")):
            return None

        destination = self._detect_destination(normalized)
        if destination is None:
            return None

        route = await teleport_service.get_route(
            db_session=db_session,
            user=user,
            payload=TeleportRouteRequest(
                destination=destination,
                account_rsn=account.rsn if account is not None else None,
                preference=None,
            ),
        )

        locked_routes = route.context.get("locked_routes", [])
        locked_note = ""
        if isinstance(locked_routes, list) and locked_routes:
            locked_note = f" Locked alternatives right now include {', '.join(str(item) for item in locked_routes[:2])}."

        return (
            f"For {route.destination.title()}, your best tracked route right now is {route.recommended_route.method}. "
            f"{route.recommended_route.travel_notes}{locked_note}"
        )

    async def _build_gear_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if "gear" not in normalized and "upgrade" not in normalized:
            return None

        combat_style = self._detect_combat_style(normalized)
        if combat_style is None:
            return None

        gear_response = await gear_service.get_recommendations(
            db_session=db_session,
            user=user,
            payload=GearRecommendationRequest(
                combat_style=combat_style,
                budget_tier="midgame",
                current_gear=progress.owned_gear if progress is not None else [],
                account_rsn=account.rsn if account is not None else None,
            ),
        )
        if not gear_response.recommendations:
            return None

        top = gear_response.recommendations[0]
        return (
            f"For {combat_style}, your best tracked next upgrade is {top.item_name} for your {top.slot} slot. "
            f"{top.upgrade_reason}"
        )

    def _build_low_skills_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
    ) -> str | None:
        normalized = message.lower()
        if "lowest skill" not in normalized and "weakest skill" not in normalized:
            return None

        skills = latest_snapshot.summary.get("skills")
        if not isinstance(skills, dict):
            return None

        ranked_skills: list[tuple[int, str]] = []
        for skill_name, skill_data in skills.items():
            if skill_name == "overall" or not isinstance(skill_data, dict):
                continue
            level = skill_data.get("level")
            if isinstance(level, int):
                ranked_skills.append((level, skill_name.replace("_", " ").title()))

        if not ranked_skills:
            return None

        ranked_skills.sort(key=lambda item: (item[0], item[1]))
        if "skills" not in normalized:
            level, skill_name = ranked_skills[0]
            return f"Your lowest tracked skill right now is {skill_name} at level {level}."

        preview = ", ".join(f"{skill_name} {level}" for level, skill_name in ranked_skills[:5])
        return f"Your lowest tracked skills right now are {preview}."

    def _build_progress_answer(
        self,
        *,
        message: str,
        progress: AccountProgress | None,
    ) -> str | None:
        if progress is None:
            return None

        normalized = message.lower()

        if "completed quest" in normalized:
            if progress.completed_quests:
                preview = ", ".join(progress.completed_quests[:5])
                return (
                    f"You currently have {len(progress.completed_quests)} tracked completed quests, "
                    f"including {preview}."
                )
            return "You do not have any tracked completed quests yet."

        if "unlock" in normalized and ("transport" in normalized or "teleport" in normalized or "travel" in normalized):
            if progress.unlocked_transports:
                preview = ", ".join(progress.unlocked_transports[:5])
                return f"Your tracked transport unlocks include {preview}."
            return "You do not have any tracked transport unlocks yet."

        if "how many" in normalized and ("transport" in normalized or "teleport" in normalized or "travel unlock" in normalized):
            return f"You currently have {len(progress.unlocked_transports)} tracked transport unlocks."

        if "owned gear" in normalized or ("gear" in normalized and ("own" in normalized or "have" in normalized)):
            if progress.owned_gear:
                preview = ", ".join(progress.owned_gear[:5])
                return f"Your tracked owned gear includes {preview}."
            return "You do not have any tracked owned gear yet."

        if "how many" in normalized and "completed quest" in normalized:
            return f"You currently have {len(progress.completed_quests)} tracked completed quests."

        if "how many" in normalized and "active unlock" in normalized:
            return f"You currently have {len(progress.active_unlocks)} active unlock chains tracked."

        if "active unlock" in normalized:
            if progress.active_unlocks:
                preview = ", ".join(progress.active_unlocks[:5])
                return f"Your active unlock chains include {preview}."
            return "You do not have any active unlock chains tracked yet."

        return None

    def _build_snapshot_change_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        previous_snapshot: AccountSnapshot | None,
    ) -> str | None:
        normalized = message.lower()
        if "changed since" not in normalized and "last sync" not in normalized:
            return None

        if previous_snapshot is None:
            return "I only have one synced snapshot so far, so I cannot compare changes yet."

        latest_summary = latest_snapshot.summary or {}
        previous_summary = previous_snapshot.summary or {}
        overall_delta = int(latest_summary.get("overall_level", 0) or 0) - int(
            previous_summary.get("overall_level", 0) or 0
        )
        combat_delta = int(latest_summary.get("combat_level", 0) or 0) - int(
            previous_summary.get("combat_level", 0) or 0
        )
        improved_skills = self._collect_improved_skills(latest_snapshot, previous_snapshot)

        parts = [
            f"Since your last sync, your overall level changed by {overall_delta:+d}",
            f"and your combat level changed by {combat_delta:+d}.",
        ]
        if improved_skills:
            parts.append(f"The skills with visible level gains were {', '.join(improved_skills[:5])}.")
        else:
            parts.append("No tracked skill levels moved between the last two snapshots.")
        return " ".join(parts)

    def _collect_improved_skills(
        self,
        latest_snapshot: AccountSnapshot,
        previous_snapshot: AccountSnapshot,
    ) -> list[str]:
        latest_skills = latest_snapshot.summary.get("skills", {})
        previous_skills = previous_snapshot.summary.get("skills", {})
        if not isinstance(latest_skills, dict) or not isinstance(previous_skills, dict):
            return []

        improved: list[str] = []
        for skill_name, latest_data in latest_skills.items():
            if skill_name == "overall" or not isinstance(latest_data, dict):
                continue
            previous_data = previous_skills.get(skill_name)
            if not isinstance(previous_data, dict):
                continue
            latest_level = latest_data.get("level")
            previous_level = previous_data.get("level")
            if isinstance(latest_level, int) and isinstance(previous_level, int) and latest_level > previous_level:
                improved.append(skill_name.replace("_", " ").title())
        return improved

    def _detect_skill_name(
        self,
        normalized_message: str,
        skills: dict[str, Any],
    ) -> str | None:
        aliases = {
            "hp": "hitpoints",
            "hits": "hitpoints",
            "range": "ranged",
            "rc": "runecraft",
            "wc": "woodcutting",
            "con": "construction",
            "def": "defence",
            "pray": "prayer",
        }

        for alias, canonical in aliases.items():
            if alias in normalized_message and canonical in skills:
                return canonical

        for skill_name in skills:
            if skill_name == "overall":
                continue
            if skill_name in normalized_message:
                return skill_name

        return None

    def _detect_stat_metric(self, normalized_message: str) -> str:
        if "xp" in normalized_message or "experience" in normalized_message:
            return "experience"
        if "rank" in normalized_message:
            return "rank"
        return "level"

    def _join_preview(self, value: Any) -> str | None:
        if isinstance(value, list):
            preview = value[:3]
            return ", ".join(str(item) for item in preview)
        return None

    def _preview_list(self, values: list[str], limit: int = 3) -> str:
        if not values:
            return "none"
        return ", ".join(values[:limit])

    def _detect_destination(self, normalized_message: str) -> str | None:
        aliases = {
            "fossil island": "fossil island",
            "barrows": "barrows",
            "wintertodt": "wintertodt",
            "fairy ring": "fairy ring network",
            "fairy rings": "fairy ring network",
        }
        for alias, destination in aliases.items():
            if alias in normalized_message:
                return destination
        return None

    def _detect_combat_style(self, normalized_message: str) -> str | None:
        if "magic" in normalized_message or "mage" in normalized_message:
            return "magic"
        if "melee" in normalized_message:
            return "melee"
        if "ranged" in normalized_message or "range" in normalized_message:
            return "ranged"
        return None

    def _detect_quest_id(self, normalized_message: str) -> str | None:
        for quest_id, quest in QUEST_CATALOG.items():
            if quest_id in normalized_message:
                return quest_id
            if quest.name.lower() in normalized_message:
                return quest_id

        aliases = {
            "rfd": "recipe-for-disaster",
            "barrows gloves": "recipe-for-disaster",
            "bone voyage": "bone-voyage",
            "fairytale ii": "fairytale-ii",
            "fairytale 2": "fairytale-ii",
            "monkey madness ii": "monkey-madness-ii",
            "monkey madness 2": "monkey-madness-ii",
            "waterfall quest": "waterfall-quest",
        }
        for alias, quest_id in aliases.items():
            if alias in normalized_message:
                return quest_id
        return None

    def _detect_money_target(self, normalized_message: str) -> str | None:
        aliases = {
            "birdhouse": "birdhouse runs",
            "birdhouses": "birdhouse runs",
            "barrows": "barrows",
            "karambwan": "karambwans",
            "karambwans": "karambwans",
            "demonic gorillas": "demonic gorillas",
            "zenytes": "demonic gorillas",
        }
        for alias, target in aliases.items():
            if alias in normalized_message:
                return target
        return None

    def _boss_label(self, boss_id: str) -> str:
        readiness = boss_advisor_service.evaluate_readiness(
            boss_id=boss_id,
            skills=None,
            unlocked_transports=None,
            completed_quests=None,
        )
        return str(readiness["label"])


chat_service = ChatService()
