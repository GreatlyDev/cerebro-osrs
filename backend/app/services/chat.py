from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
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
from app.services.gear import gear_service
from app.services.planner import planner_service
from app.services.quests import quest_service
from app.services.recommendations import recommendation_service
from app.services.skills import skill_service
from app.services.teleports import teleport_service
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
        profile = await user_context_service.get_profile(db_session=db_session, user=user)
        latest_goal = await user_context_service.get_latest_goal(db_session=db_session, user=user)
        latest_account = await user_context_service.get_latest_account(db_session=db_session, user=user)
        latest_snapshot = await self._get_latest_snapshot(
            db_session=db_session,
            account=latest_account,
        )
        stat_answer = self._build_direct_stat_answer(
            message=message,
            latest_snapshot=latest_snapshot,
        )
        if stat_answer is not None:
            return stat_answer

        structured_response = await self._generate_structured_response(
            db_session=db_session,
            user=user,
            session=session,
            message=message,
            profile=profile,
            latest_goal=latest_goal,
            latest_account=latest_account,
            latest_snapshot=latest_snapshot,
        )
        ai_response = await assistant_service.generate_chat_reply(
            AssistantChatContext(
                session_title=session.title,
                user_display_name=user.display_name,
                user_message=message,
                structured_fallback=structured_response,
                recent_messages=await self._get_recent_messages(
                    db_session=db_session,
                    session_id=session.id,
                ),
                profile_summary=self._summarize_profile(profile),
                account_summary=self._summarize_account(latest_account),
                snapshot_summary=self._summarize_snapshot(latest_snapshot),
                skills_summary=self._summarize_skills(latest_snapshot),
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
        return f"latest_account={account.rsn}, active={account.is_active}"

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

    def _build_direct_stat_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot | None,
    ) -> str | None:
        if latest_snapshot is None:
            return None

        normalized = message.lower()
        summary = latest_snapshot.summary or {}
        skills = summary.get("skills")
        if not isinstance(skills, dict):
            skills = {}

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


chat_service = ChatService()
