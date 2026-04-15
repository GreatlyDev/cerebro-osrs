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
from app.services.knowledge_answering import knowledge_answering_service
from app.services.knowledge_base import knowledge_base_service
from app.services.knowledge_models import KnowledgeRetrievalPacket
from app.schemas.gear import GearRecommendationRequest
from app.schemas.recommendation import NextActionRecommendation, NextActionRequest
from app.schemas.teleport import TeleportRouteRequest


class ChatService:
    async def create_session(
        self,
        db_session: AsyncSession,
        user: User,
        payload: ChatSessionCreateRequest,
    ) -> ChatSessionResponse:
        session = ChatSession(user_id=user.id, title=payload.title, session_state={})
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

        assistant_content, session_state_update = await self._generate_response(
            db_session=db_session,
            user=user,
            session=session,
            message=payload.content,
        )
        session.session_state = self._merge_session_state(
            existing_state=session.session_state,
            update=session_state_update,
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
    ) -> tuple[str, dict[str, object]]:
        recent_messages = await self._get_recent_messages(
            db_session=db_session,
            session_id=session.id,
        )
        resolved_message = self._resolve_follow_up_message(
            message=message,
            recent_messages=recent_messages,
            session_state=session.session_state or {},
        )
        session_focus = self._infer_session_focus_from_messages(recent_messages)
        session_intent = self._infer_session_intent_from_messages(recent_messages)
        emphasize_goal = self._should_emphasize_goal_context(
            message=resolved_message,
            session_focus=session_focus,
            session_intent=session_intent,
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
        session_focus_summary = self._summarize_session_focus(
            session_focus=session_focus,
            latest_goal=latest_goal,
            account=focus_account,
            include_goal=emphasize_goal,
        )
        retrieval_packet = knowledge_base_service.retrieve_packet(
            query=resolved_message,
            session_intent=session_intent,
            session_focus_summary=session_focus_summary,
        )
        stat_answer = await self._build_direct_stat_answer(
            db_session=db_session,
            user=user,
            message=resolved_message,
            account=focus_account,
            profile=profile,
            latest_goal=latest_goal,
            session_focus=session_focus,
            session_intent=session_intent,
            session_state=session.session_state or {},
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
            progress=progress,
            retrieval_packet=retrieval_packet,
        )
        if stat_answer is not None:
            return stat_answer, self._build_session_state_update(
                message=resolved_message,
                session_intent=session_intent,
                latest_goal=latest_goal,
                account=focus_account,
            )

        structured_response, structured_state = await self._generate_structured_response(
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
                goal_summary=self._summarize_goal(latest_goal) if emphasize_goal else None,
                session_focus_summary=session_focus_summary,
                session_intent_summary=self._summarize_session_intent(session_intent=session_intent),
                retrieval_route_summary=(
                    f"Question mode={retrieval_packet.question_mode or 'unknown'}, "
                    f"primary domain={retrieval_packet.primary_domain or 'none'}, "
                    f"secondary domains={', '.join(retrieval_packet.secondary_domains) or 'none'}, "
                    f"supporting docs={retrieval_packet.include_supporting_documents}"
                ),
                retrieval_match_notes_summary="\n".join(retrieval_packet.match_notes) or None,
                retrieval_summary=retrieval_packet.summary,
                retrieval_entries_summary="\n".join(
                    f"- {entry.canonical_name}: {entry.summary}" for entry in retrieval_packet.entries
                )
                or None,
                retrieval_documents_summary="\n".join(
                    f"- {document.title}: {document.summary}" for document in retrieval_packet.documents
                )
                or None,
            )
        )
        return (ai_response or structured_response), self._merge_session_state(
            existing_state=self._build_session_state_update(
                message=resolved_message,
                session_intent=session_intent,
                latest_goal=latest_goal,
                account=focus_account,
            ),
            update=structured_state,
        )

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
    ) -> tuple[str, dict[str, object]]:
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
                (
                    f"For {recommendations.skill}, I'd start with {top.method}. "
                    f"It fits a {recommendations.preference} preference and is a strong next step "
                    f"from your current context."
                ),
                {
                    "last_recommended_skill": recommendations.skill,
                    "last_session_intent": "training",
                },
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
                (
                    f"A strong next upgrade is {top.item_name} for your {top.slot} slot. "
                    f"{top.upgrade_reason}"
                ),
                {
                    "last_recommended_gear": top.item_name,
                    "last_combat_style": "magic" if "magic" in normalized else "melee",
                    "last_session_intent": "gearing",
                },
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
                (
                    f"For {route.destination}, I'd use {route.recommended_route.method}. "
                    f"{route.recommended_route.travel_notes}"
                ),
                {
                    "last_destination": route.destination,
                    "last_session_intent": "travel",
                },
            )

        if "quest" in normalized:
            quest = quest_service.get_quest(
                "recipe-for-disaster" if "barrows" in normalized else "bone-voyage"
            )
            return (
                (
                    f"{quest.name} is worth prioritizing because {quest.why_it_matters} "
                    f"Next, I'd {quest.next_steps[0].lower()}"
                ),
                {
                    "last_quest_id": quest.id,
                    "last_session_intent": "questing",
                },
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
                    (
                        f"Your next best action is to {top_action.title.lower()}. "
                        f"{top_action.summary}"
                    ),
                    self._state_from_next_action(top_action),
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
                    (
                        f"If I were steering this account, I'd start with {top_action.title.lower()}. "
                        f"{top_action.summary}"
                    ),
                    self._state_from_next_action(top_action),
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
            next_actions = await recommendation_service.get_next_actions(
                db_session=db_session,
                user=user,
                payload=NextActionRequest(
                    account_rsn=latest_account.rsn if latest_account else None,
                    goal_id=latest_goal.id,
                    limit=1,
                ),
            )
            state_update = self._state_from_planner_recommendations(recommendations)
            if next_actions.top_action is not None:
                state_update = self._merge_session_state(
                    existing_state=state_update,
                    update=self._state_from_next_action(next_actions.top_action),
                )
            return (
                planner_service.summarize_next_action(latest_goal, recommendations),
                state_update,
            )

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
            next_actions = await recommendation_service.get_next_actions(
                db_session=db_session,
                user=user,
                payload=NextActionRequest(
                    account_rsn=latest_account.rsn if latest_account else None,
                    goal_id=latest_goal.id,
                    limit=1,
                ),
            )
            state_update = self._state_from_planner_recommendations(recommendations)
            if next_actions.top_action is not None:
                state_update = self._merge_session_state(
                    existing_state=state_update,
                    update=self._state_from_next_action(next_actions.top_action),
                )
            return (
                planner_service.summarize_next_action(latest_goal, recommendations),
                state_update,
            )

        if latest_snapshot is not None and profile is not None:
            return (
                (
                    f"You're sitting around overall level {latest_snapshot.summary.get('overall_level')} "
                    f"with a {profile.play_style} play style. I can help with skills, quests, gear, teleports, or goals next."
                ),
                {},
            )

        return (
            (
                f"This chat session '{session.title}' is ready. Ask me about skills, quests, gear, teleports, or goals and "
                "I'll answer from the structured data we've built so far."
            ),
            {},
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
        session_state: dict[str, object],
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
        previous_assistant_message = self._get_previous_assistant_message(recent_messages=recent_messages)

        previous_normalized = previous_user_message.lower()
        previous_assistant_normalized = previous_assistant_message.lower() if previous_assistant_message else ""
        current_style = self._detect_combat_style(normalized)
        current_destination = self._detect_destination(normalized)
        current_quest_id = self._detect_quest_id(normalized)
        current_boss_id = boss_advisor_service.detect_boss_id(normalized)
        current_money_target = self._detect_money_target(normalized)
        previous_focus = self._infer_focus_from_message(previous_normalized)
        session_focus = self._focus_from_session_state(session_state)

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

        if "worth it" in normalized:
            prior_money_target = (
                previous_focus["money_target"]
                or self._detect_money_target(previous_assistant_normalized)
                or session_focus["money_target"]
            )
            if prior_money_target is not None:
                return f"Is {prior_money_target} worth it as a money maker?"
            prior_quest_id = previous_focus["quest_id"] or session_focus["quest_id"]
            if prior_quest_id is not None:
                quest = quest_service.get_quest(prior_quest_id)
                return f"Is {quest.name} worth it right now?"
            prior_boss_id = previous_focus["boss_id"] or session_focus["boss_id"]
            if prior_boss_id is not None:
                return f"Is {self._boss_label(prior_boss_id)} worth it right now?"

        if "train for that" in normalized or "train for it" in normalized:
            prior_quest_id = previous_focus["quest_id"] or session_focus["quest_id"]
            if prior_quest_id is not None:
                quest = quest_service.get_quest(prior_quest_id)
                return f"What should I train for {quest.name}?"
            prior_boss_id = previous_focus["boss_id"] or session_focus["boss_id"]
            if prior_boss_id is not None:
                return f"What should I train for {self._boss_label(prior_boss_id)}?"

        if normalized in {"what else?", "what else", "anything else?", "anything else"}:
            prior_quest_id = previous_focus["quest_id"] or session_focus["quest_id"]
            if prior_quest_id is not None:
                quest = quest_service.get_quest(prior_quest_id)
                return f"What else should I do for {quest.name}?"
            prior_boss_id = previous_focus["boss_id"] or session_focus["boss_id"]
            if prior_boss_id is not None:
                return f"What else should I do to get ready for {self._boss_label(prior_boss_id)}?"
            prior_money_target = (
                previous_focus["money_target"]
                or self._detect_money_target(previous_assistant_normalized)
                or session_focus["money_target"]
            )
            if prior_money_target is not None:
                return f"What else should I do for profit after {prior_money_target}?"

        return message

    def _is_follow_up_message(self, normalized_message: str) -> bool:
        follow_up_starts = (
            "what about",
            "how about",
            "and for",
            "and what about",
            "what about for",
            "is that",
            "is it",
            "what should i train",
            "what do i train",
            "what else",
            "anything else",
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

    def _get_previous_assistant_message(
        self,
        *,
        recent_messages: list[tuple[str, str]],
    ) -> str | None:
        for role, content in reversed(recent_messages):
            if role == "assistant":
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
        latest_goal: Goal | None,
        session_focus: dict[str, str | None],
        session_intent: str | None,
        session_state: dict[str, object],
        latest_snapshot: AccountSnapshot | None,
        previous_snapshot: AccountSnapshot | None,
        progress: AccountProgress | None,
        retrieval_packet: KnowledgeRetrievalPacket,
    ) -> str | None:
        account_answer = self._build_account_focus_answer(message=message, account=account)
        if account_answer is not None:
            return account_answer

        focus_answer = self._build_focus_summary_answer(
            message=message,
            account=account,
            latest_goal=latest_goal,
            session_focus=session_focus,
            session_intent=session_intent,
        )
        if focus_answer is not None:
            return focus_answer

        if latest_snapshot is None:
            if progress is not None:
                return self._build_progress_answer(message=message, progress=progress)
            return None

        normalized = message.lower()
        summary = latest_snapshot.summary or {}
        skills = summary.get("skills")
        if not isinstance(skills, dict):
            skills = {}
        comparison_skill_names = self._detect_skill_names(normalized, skills)

        progress_answer = self._build_progress_answer(message=message, progress=progress)
        if progress_answer is not None:
            return progress_answer

        knowledge_unlock_answer = knowledge_answering_service.build_utility_unlock_answer(
            message=message,
            packet=retrieval_packet,
            account_rsn=account.rsn if account is not None else None,
        )
        if knowledge_unlock_answer is not None:
            return knowledge_unlock_answer

        knowledge_money_answer = knowledge_answering_service.build_money_tradeoff_answer(
            message=message,
            packet=retrieval_packet,
        )
        if knowledge_money_answer is not None:
            return knowledge_money_answer

        salient_change_answer = await self._build_salient_change_answer(
            db_session=db_session,
            user=user,
            message=message,
            profile=profile,
            latest_goal=latest_goal,
            account=account,
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )
        if salient_change_answer is not None:
            return salient_change_answer

        plan_order_answer = await self._build_plan_order_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            profile=profile,
            latest_goal=latest_goal,
            latest_snapshot=latest_snapshot,
            progress=progress,
            session_state=session_state,
        )
        if plan_order_answer is not None:
            return plan_order_answer

        coaching_answer = await self._build_coaching_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            profile=profile,
            latest_goal=latest_goal,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if coaching_answer is not None:
            return coaching_answer

        blocker_answer = await self._build_blocker_priority_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            latest_goal=latest_goal,
            session_state=session_state,
        )
        if blocker_answer is not None:
            return blocker_answer

        confidence_answer = await self._build_confidence_and_tradeoff_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            latest_goal=latest_goal,
            latest_snapshot=latest_snapshot,
            progress=progress,
            session_state=session_state,
        )
        if confidence_answer is not None:
            return confidence_answer

        why_now_answer = await self._build_why_now_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            latest_goal=latest_goal,
            session_state=session_state,
        )
        if why_now_answer is not None:
            return why_now_answer

        change_answer = self._build_snapshot_change_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )
        if change_answer is not None:
            return change_answer

        recommendation_change_answer = await self._build_recommendation_change_answer(
            db_session=db_session,
            user=user,
            message=message,
            profile=profile,
            latest_goal=latest_goal,
            account=account,
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )
        if recommendation_change_answer is not None:
            return recommendation_change_answer

        readiness_answer = self._build_quest_readiness_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if readiness_answer is not None:
            return readiness_answer

        quest_chain_answer = self._build_quest_chain_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if quest_chain_answer is not None:
            return quest_chain_answer

        boss_answer = self._build_boss_readiness_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if boss_answer is not None:
            return boss_answer

        boss_prep_answer = self._build_boss_prep_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if boss_prep_answer is not None:
            return boss_prep_answer

        money_maker_answer = self._build_money_maker_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
            profile=profile,
        )
        if money_maker_answer is not None:
            return money_maker_answer

        money_comparison_answer = self._build_money_maker_comparison_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
            profile=profile,
        )
        if money_comparison_answer is not None:
            return money_comparison_answer

        training_answer = self._build_target_training_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
            session_state=session_state,
        )
        if training_answer is not None:
            return training_answer

        skill_comparison_answer = self._build_skill_comparison_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            session_state=session_state,
        )
        if skill_comparison_answer is not None:
            return skill_comparison_answer

        unlock_answer = await self._build_unlock_priority_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            latest_goal=latest_goal,
            progress=progress,
        )
        if unlock_answer is not None:
            return unlock_answer

        unlock_chain_answer = self._build_unlock_chain_priority_answer(
            message=message,
            progress=progress,
        )
        if unlock_chain_answer is not None:
            return unlock_chain_answer

        utility_unlock_answer = await self._build_utility_unlock_answer(
            db_session=db_session,
            user=user,
            message=message,
            account=account,
            latest_goal=latest_goal,
        )
        if utility_unlock_answer is not None:
            return utility_unlock_answer

        value_answer = self._build_value_judgment_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
            profile=profile,
        )
        if value_answer is not None:
            return value_answer

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

        account_telemetry_answer = self._build_account_telemetry_answer(
            message=message,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )
        if account_telemetry_answer is not None:
            return account_telemetry_answer

        metric = self._detect_stat_metric(normalized)
        skill_name = self._detect_skill_name(normalized, skills)

        if skill_name is not None and len(comparison_skill_names) < 2:
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

    async def _build_salient_change_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        profile: Profile | None,
        latest_goal: Goal | None,
        account: Account | None,
        latest_snapshot: AccountSnapshot,
        previous_snapshot: AccountSnapshot | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "what changed that matters most",
                "what changed that matters",
                "what matters most from the last sync",
                "what matters most from my last sync",
                "most important change",
                "what changed most that matters",
            )
        ):
            return None

        if previous_snapshot is None:
            return "I only have one synced snapshot so far, so I can't tell which new change matters most yet."

        overall_delta, combat_delta, improved_skills = self._snapshot_delta_bits(
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )

        if latest_goal is not None:
            current_recommendations = await planner_service.build_goal_recommendations(
                db_session=db_session,
                user=user,
                goal=latest_goal,
                profile=profile,
                snapshot=latest_snapshot,
                target_rsn=latest_goal.target_account_rsn or (account.rsn if account is not None else None),
            )
            previous_recommendations = await planner_service.build_goal_recommendations(
                db_session=db_session,
                user=user,
                goal=latest_goal,
                profile=profile,
                snapshot=previous_snapshot,
                target_rsn=latest_goal.target_account_rsn or (account.rsn if account is not None else None),
            )
            current_focus = self._planner_focus_label(current_recommendations)
            previous_focus = self._planner_focus_label(previous_recommendations)
            if current_focus != previous_focus:
                return (
                    f"The biggest change is that your plan shifted from {previous_focus} to {current_focus}. "
                    f"That's the most meaningful thing from the latest sync for {latest_goal.title}."
                )

            recommended_skill = str(
                (current_recommendations.get("recommended_skill", {}) or {}).get("skill") or ""
            ).replace("_", " ").title()
            improved_lookup = {skill.lower(): skill for skill in improved_skills}
            if recommended_skill and recommended_skill.lower() in improved_lookup:
                return (
                    f"The change that matters most is your progress in {recommended_skill}. "
                    f"That lines up directly with the current recommendation lane for {latest_goal.title}."
                )

        if improved_skills:
            return (
                f"The change that matters most is your progress in {improved_skills[0]}. "
                f"That's the clearest visible gain from the latest sync."
            )

        if combat_delta > 0:
            return (
                f"The change that matters most is your combat level moving by {combat_delta:+d}. "
                "That usually opens the most immediate combat and bossing flexibility."
            )

        if overall_delta > 0:
            return (
                f"The change that matters most is your overall level moving by {overall_delta:+d}. "
                "Even without a standout skill gain, that means the account is still gaining momentum."
            )

        return "Nothing jumped out as a major tracked change from the latest sync yet, so the current plan is mostly stable."

    async def _build_recommendation_change_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        profile: Profile | None,
        latest_goal: Goal | None,
        account: Account | None,
        latest_snapshot: AccountSnapshot,
        previous_snapshot: AccountSnapshot | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "why did my recommendation change",
                "why did the recommendation change",
                "why did that change after sync",
                "did my recommendation change after sync",
                "did the recommendation change after sync",
            )
        ):
            return None

        if previous_snapshot is None:
            return "I only have one synced snapshot so far, so I can't tell whether the recommendation changed after a sync yet."

        overall_delta, combat_delta, improved_skills = self._snapshot_delta_bits(
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )

        if latest_goal is None:
            next_actions = await recommendation_service.get_next_actions(
                db_session=db_session,
                user=user,
                payload=NextActionRequest(
                    account_rsn=account.rsn if account is not None else None,
                    goal_id=None,
                    limit=3,
                ),
            )
            top_action = next_actions.top_action
            if top_action is None:
                return None
            return (
                f"Your synced recommendation is still centered on {self._action_label(top_action)}. "
                f"The latest sync showed overall {overall_delta:+d}, combat {combat_delta:+d}, "
                f"and visible gains in {self._preview_list(improved_skills) if improved_skills else 'none'}, "
                f"but not enough of a shift to move the top lane yet."
            )

        current_recommendations = await planner_service.build_goal_recommendations(
            db_session=db_session,
            user=user,
            goal=latest_goal,
            profile=profile,
            snapshot=latest_snapshot,
            target_rsn=latest_goal.target_account_rsn or (account.rsn if account is not None else None),
        )
        previous_recommendations = await planner_service.build_goal_recommendations(
            db_session=db_session,
            user=user,
            goal=latest_goal,
            profile=profile,
            snapshot=previous_snapshot,
            target_rsn=latest_goal.target_account_rsn or (account.rsn if account is not None else None),
        )

        current_focus = self._planner_focus_label(current_recommendations)
        previous_focus = self._planner_focus_label(previous_recommendations)
        if current_focus != previous_focus:
            return (
                f"Yes, the recommendation shifted after the latest sync. Before, I was leaning toward {previous_focus}. "
                f"Now I'm leaning toward {current_focus}. The main synced changes were overall {overall_delta:+d}, "
                f"combat {combat_delta:+d}, and visible gains in {self._preview_list(improved_skills) if improved_skills else 'none'}."
            )

        return (
            f"The main recommendation didn't materially change after the latest sync. I'm still leaning toward {current_focus}. "
            f"The new snapshot showed overall {overall_delta:+d}, combat {combat_delta:+d}, and visible gains in "
            f"{self._preview_list(improved_skills) if improved_skills else 'none'}, but the same core blockers and opportunities still lead the plan."
        )

    async def _build_coaching_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        profile: Profile | None,
        latest_goal: Goal | None,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        asks_week_focus = any(
            phrase in normalized
            for phrase in (
                "focus on this week",
                "focus on this week?",
                "what should i focus on this week",
                "what do i focus on this week",
                "what should be my focus this week",
            )
        )
        asks_fastest_goal_move = any(
            phrase in normalized
            for phrase in (
                "move me closest to my goal fastest",
                "move me closest to my goal",
                "get me to my goal fastest",
                "fastest way toward my goal",
            )
        )
        asks_ignore_now = any(
            phrase in normalized
            for phrase in (
                "ignore for now",
                "what should i ignore for now",
                "what can i ignore for now",
                "what should i stop worrying about",
            )
        )
        asks_short_session = any(
            phrase in normalized
            for phrase in (
                "only have 30 minutes",
                "only have 20 minutes",
                "only have 15 minutes",
                "short session",
                "quick session",
                "limited time",
            )
        )
        asks_afk_progress = any(
            phrase in normalized
            for phrase in (
                "want afk progress",
                "want afk",
                "prefer afk",
                "low attention progress",
                "something afk",
            )
        )
        asks_today_progress = any(
            phrase in normalized
            for phrase in (
                "what should i do today if i want real progress",
                "what should i do today",
                "what do i do today for progress",
                "what should i focus on today",
            )
        )
        asks_mixed_profit_progress = any(
            phrase in normalized
            for phrase in (
                "profit and progression",
                "both profit and progression",
                "money and progression",
                "gp and progression",
            )
        )
        asks_deprioritize = any(
            phrase in normalized
            for phrase in (
                "what would you deprioritize this week",
                "what should i deprioritize this week",
                "what would you deprioritize",
            )
        )
        asks_biggest_blockers = any(
            phrase in normalized
            for phrase in (
                "what are my biggest blockers",
                "what are the biggest blockers",
                "what are my three biggest blockers",
                "what are the three biggest blockers",
                "what's blocking me most",
                "whats blocking me most",
                "what is blocking me most",
            )
        )
        asks_tonight = any(
            phrase in normalized
            for phrase in (
                "what should i do tonight",
                "what do i do tonight",
                "what should i focus on tonight",
                "what should i work on tonight",
            )
        )
        asks_weekend = any(
            phrase in normalized
            for phrase in (
                "what should i do this weekend",
                "what do i do this weekend",
                "what should i focus on this weekend",
                "what should i work on this weekend",
            )
        )
        asks_sunday_milestone = any(
            phrase in normalized
            for phrase in (
                "what should i have done by sunday",
                "what should i get done by sunday",
                "what do i need done by sunday",
                "what should be done by sunday",
                "what should i aim to finish by sunday",
            )
        )
        asks_sequence_days = any(
            phrase in normalized
            for phrase in (
                "next few days",
                "over the next few days",
                "how would you sequence this over the next few days",
                "how should i sequence this over the next few days",
                "sequence this over the next few days",
            )
        )
        asks_xp_vs_unlocks = (
            ("xp" in normalized or "experience" in normalized)
            and ("unlock" in normalized or "unlocks" in normalized)
            and any(
                phrase in normalized
                for phrase in (
                    "care more about",
                    "prioritize",
                    "focus more on",
                    "more important",
                )
            )
        )
        asks_lower_effort_useful = any(
            phrase in normalized
            for phrase in (
                "lower effort but still useful",
                "something lower effort but still useful",
                "something easier but still useful",
                "less effort but still useful",
                "lower effort option",
            )
        )
        asks_weekend_target = (
            "weekend" in normalized
            and any(
                phrase in normalized
                for phrase in (
                    "if i want",
                    "if i care about",
                    "what should i push",
                    "what should i work on",
                )
            )
        )
        asks_fast_unblock = any(
            phrase in normalized
            for phrase in (
                "what would unblock me fastest",
                "what would unblock me the fastest",
                "what would unblock this fastest",
                "what's the fastest unblock",
                "whats the fastest unblock",
                "what is the fastest unblock",
            )
        )
        asks_small_win = any(
            phrase in normalized
            for phrase in (
                "what small win should i lock in next",
                "what small win should i take next",
                "what small win should i go for next",
                "what's the next small win",
                "whats the next small win",
            )
        )
        if (
            not asks_week_focus
            and not asks_fastest_goal_move
            and not asks_ignore_now
            and not asks_short_session
            and not asks_afk_progress
            and not asks_today_progress
            and not asks_mixed_profit_progress
            and not asks_deprioritize
            and not asks_biggest_blockers
            and not asks_tonight
            and not asks_weekend
            and not asks_sunday_milestone
            and not asks_sequence_days
            and not asks_xp_vs_unlocks
            and not asks_lower_effort_useful
            and not asks_weekend_target
            and not asks_fast_unblock
            and not asks_small_win
        ):
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        if not actions:
            return None

        top_action = actions[0]
        second_action = actions[1] if len(actions) > 1 else None
        third_action = actions[2] if len(actions) > 2 else None
        goal_title = latest_goal.title if latest_goal is not None else "your current progression plan"

        if asks_biggest_blockers:
            blocker_summary = self._summarize_biggest_blockers(
                actions=actions,
                latest_goal=latest_goal,
            )
            if blocker_summary is not None:
                return blocker_summary
            return (
                f"You do not have three hard blockers standing out right now. "
                f"The cleaner story is that {self._action_label(top_action)} is already actionable for {goal_title}."
            )

        if asks_today_progress:
            return (
                f"If you want real progress today, I'd lock in {self._action_label(top_action)} first. "
                f"{top_action.summary}"
            )

        if asks_tonight:
            tonight_action = next(
                (
                    action
                    for action in actions
                    if action.action_type in {"skill", "travel", "gear"}
                ),
                second_action or top_action,
            )
            return (
                f"For tonight, I'd keep it practical and do {self._action_label(tonight_action)}. "
                f"It keeps the account moving without asking for a full long-session commitment."
            )

        if asks_weekend:
            parts = [
                f"For this weekend, I'd build around {self._action_label(top_action)} as the main push."
            ]
            parts.append(top_action.summary)
            if second_action is not None:
                parts.append(
                    f"Once that is underway, let {self._action_label(second_action)} be the follow-up lane so the weekend adds up to real account movement."
                )
            if third_action is not None:
                parts.append(
                    f"If you still have time after that, {self._action_label(third_action)} is the cleanest third priority."
                )
            return " ".join(parts)

        if asks_sunday_milestone:
            parts = [
                f"By Sunday, I'd want {self._action_label(top_action)} either completed or meaningfully underway."
            ]
            parts.append(top_action.summary)
            if second_action is not None:
                parts.append(
                    f"After that, the next thing I'd want in motion is {self._action_label(second_action)}."
                )
            if third_action is not None:
                parts.append(
                    f"If you get through the main two lanes, let {self._action_label(third_action)} be the stretch target before the weekend closes."
                )
            return " ".join(parts)

        if asks_weekend_target:
            goal_title = latest_goal.title if latest_goal is not None else "your current account plan"
            if any(token in normalized for token in ("money", "profit", "gp")):
                profit_options = money_maker_service.get_best_options(
                    skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                    unlocked_transports=progress.unlocked_transports if progress else None,
                    completed_quests=progress.completed_quests if progress else None,
                    prefers_profitable_methods=True,
                )
                top_profit = profit_options[0] if profit_options else None
                if top_profit is not None:
                    return (
                        f"If you want better money by this weekend, I'd push {top_profit['name']} into a usable state first. "
                        f"{top_profit['why']} Then keep {self._action_label(top_action)} behind it so {goal_title} still moves."
                    )
            return (
                f"If you want a meaningful weekend push, I'd still center it on {self._action_label(top_action)}. "
                f"{top_action.summary}"
            )

        if asks_fast_unblock:
            blocker_action = next((action for action in actions if action.blockers), top_action)
            blockers = blocker_action.blockers or []
            if blockers:
                return (
                    f"The fastest unblock is to clear {blockers[0]} first. "
                    f"That opens the path for {self._action_label(blocker_action)} more cleanly than switching lanes right now."
                )
            return (
                f"There isn't a separate unblock step I would chase first. "
                f"The fastest way to free up progress is to just start {self._action_label(blocker_action)} now."
            )

        if asks_small_win:
            small_win_action = next(
                (
                    action
                    for action in actions
                    if action.action_type in {"skill", "travel", "gear"}
                ),
                second_action or top_action,
            )
            blockers = small_win_action.blockers or []
            if blockers:
                return (
                    f"The cleanest small win is to knock out {blockers[0]} and keep {self._action_label(small_win_action)} moving. "
                    f"That gives you a real bit of momentum without needing a full deep push."
                )
            return (
                f"The cleanest small win is {self._action_label(small_win_action)}. "
                f"It gives you useful momentum without asking for the biggest commitment in the plan."
            )

        if asks_sequence_days:
            parts = [
                f"Over the next few days, I'd sequence it like this: day one, {self._action_label(top_action)}."
            ]
            parts.append(top_action.summary)
            if second_action is not None:
                parts.append(
                    f"After that, shift into {self._action_label(second_action)} so the plan keeps compounding instead of stalling."
                )
            if third_action is not None:
                parts.append(
                    f"Once those are moving, keep {self._action_label(third_action)} as the third lane to round out the week."
                )
            return " ".join(parts)

        if asks_short_session:
            quick_action = next(
                (
                    action
                    for action in actions
                    if action.action_type in {"skill", "travel", "gear"}
                ),
                top_action,
            )
            return (
                f"If you've only got a short session, I'd keep it tight and do {self._action_label(quick_action)}. "
                f"{quick_action.summary}"
            )

        if asks_afk_progress:
            afk_skill_action = next(
                (
                    action
                    for action in actions
                    if action.action_type == "skill"
                ),
                None,
            )
            if afk_skill_action is not None:
                recommended_method = str(
                    (afk_skill_action.supporting_data or {}).get("recommended_method") or "an AFK method"
                )
                afk_hint = (
                    "That already lines up with your saved AFK preference."
                    if profile is not None and profile.prefers_afk_methods
                    else "That's the cleanest low-attention lane from your current plan."
                )
                return (
                    f"For AFK progress, I'd lean into {self._action_label(afk_skill_action)} with {recommended_method}. "
                    f"{afk_hint}"
                )
            return (
                f"For AFK progress, I'd stay on {self._action_label(top_action)} in the lowest-friction way you can. "
                f"{top_action.summary}"
            )

        if asks_mixed_profit_progress:
            profit_option = money_maker_service.get_best_options(
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
                completed_quests=progress.completed_quests if progress else None,
                prefers_profitable_methods=True,
            )
            top_profit = profit_option[0] if profit_option else None
            if top_profit is not None and second_action is not None:
                return (
                    f"If you want both profit and progression, I'd split the lane: start with {self._action_label(top_action)} "
                    f"for account progress, then use {top_profit['name']} as the money reset. "
                    f"That keeps {goal_title} moving without dropping profit entirely."
                )
            return (
                f"If you want both profit and progression, I'd still anchor on {self._action_label(top_action)} first. "
                f"It's the strongest balanced move for {goal_title} right now."
            )

        if asks_xp_vs_unlocks:
            unlock_action = next((action for action in actions if action.action_type == "quest"), None)
            xp_action = next((action for action in actions if action.action_type == "skill"), None)
            if xp_action is not None and unlock_action is not None:
                if "unlock" in normalized and "xp" in normalized and "care more about xp" in normalized:
                    return (
                        f"If XP matters more than unlocks right now, I'd bias toward {self._action_label(xp_action)} first. "
                        f"It gives you cleaner stat momentum immediately, while {self._action_label(unlock_action)} is still the lane I'd keep behind it for {goal_title}."
                    )
                return (
                    f"If unlocks matter more than raw XP right now, I'd keep {self._action_label(unlock_action)} ahead of {self._action_label(xp_action)}. "
                    f"It opens more account value for {goal_title}, even if the immediate XP pace looks slower."
                )
            fallback_action = xp_action or unlock_action or top_action
            return (
                f"Right now I'd still bias toward {self._action_label(fallback_action)}. "
                f"It's the cleanest lane from your current plan whether you're optimizing for XP or unlock value."
            )

        if asks_lower_effort_useful:
            lower_effort_action = next(
                (
                    action
                    for action in actions
                    if action.action_type in {"skill", "travel", "gear"}
                ),
                second_action or top_action,
            )
            return (
                f"If you want something lower effort but still useful, I'd shift into {self._action_label(lower_effort_action)}. "
                f"It keeps the account moving without demanding as much focus as the sharpest progression lane."
            )

        if asks_week_focus:
            parts = [
                f"For this week, I'd center the account on {self._action_label(top_action)}."
            ]
            parts.append(top_action.summary)
            if second_action is not None:
                parts.append(
                    f"Right behind that, keep {self._action_label(second_action)} in view as the follow-up lane."
                )
            return " ".join(parts)

        if asks_deprioritize:
            deprioritized = next(
                (
                    action
                    for action in reversed(actions)
                    if action.priority == "low" or action.score <= max(58, top_action.score - 18)
                ),
                third_action or second_action,
            )
            if deprioritized is None or self._actions_match(deprioritized, top_action):
                return (
                    f"This week, I wouldn't deprioritize the main lane yet. "
                    f"{self._action_label(top_action).capitalize()} is still the strongest push for {goal_title}."
                )
            return (
                f"This week, I'd deprioritize {self._action_label(deprioritized)}. "
                f"It matters less immediately than {self._action_label(top_action)} for {goal_title}."
            )

        if asks_fastest_goal_move:
            return (
                f"The fastest move toward {goal_title} right now is {self._action_label(top_action)}. "
                f"{top_action.summary}"
            )

        if asks_ignore_now:
            low_priority = next(
                (
                    action
                    for action in reversed(actions)
                    if action.priority == "low" or action.score <= max(55, top_action.score - 20)
                ),
                third_action or second_action,
            )
            if low_priority is None or self._actions_match(low_priority, top_action):
                return (
                    f"I wouldn't ignore the current top lane yet. {self._action_label(top_action).capitalize()} "
                    f"is still the thing I'd protect first for {goal_title}."
                )
            return (
                f"For now, I'd stop worrying about {self._action_label(low_priority)}. "
                f"It matters less immediately than {self._action_label(top_action)} for {goal_title}."
            )

        return None

    async def _build_plan_order_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        profile: Profile | None,
        latest_goal: Goal | None,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
        session_state: dict[str, object],
    ) -> str | None:
        normalized = message.lower()
        asks_what_comes_after = any(
            phrase in normalized
            for phrase in (
                "what comes after that",
                "what comes next after that",
                "what comes after it",
                "what should i do after that",
                "what should i do after it",
                "what after that",
            )
        )
        asks_order_comparison = "should i do that before" in normalized or "should i do that after" in normalized
        asks_goal_comparison = any(
            phrase in normalized
            for phrase in (
                "help my goal more than",
                "better for my goal than",
                "more for my goal than",
                "advance my goal more than",
            )
        )
        asks_preference_route = (
            "care more about" in normalized and "profit" in normalized and "quest" in normalized
        )
        if not asks_what_comes_after and not asks_order_comparison and not asks_goal_comparison and not asks_preference_route:
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        current_action = self._find_action_from_session_state(actions, session_state)
        comparison_focus = self._infer_focus_from_message(normalized)
        comparison_action = self._find_action_from_focus(actions, comparison_focus)

        if asks_preference_route:
            quest_action = next((action for action in actions if action.action_type == "quest"), None)
            money_options = money_maker_service.get_best_options(
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
                completed_quests=progress.completed_quests if progress else None,
                prefers_profitable_methods=profile.prefers_profitable_methods if profile is not None else False,
            )
            top_money_maker = money_options[0] if money_options else None
            if quest_action is not None and top_money_maker is not None:
                goal_title = latest_goal.title if latest_goal is not None else "your current progression plan"
                if "profit than quest" in normalized:
                    return (
                        f"If profit matters more than questing right now, I'd route you into {top_money_maker['name']} "
                        f"before {self._action_label(quest_action)}. It pays off faster, while {self._action_label(quest_action)} "
                        f"still does more to move {goal_title} forward once you're ready to switch lanes."
                    )
                return (
                    f"If questing matters more than profit right now, I'd keep {self._action_label(quest_action)} ahead of "
                    f"{top_money_maker['name']}. {self._action_label(quest_action).capitalize()} pushes {goal_title} forward "
                    f"more directly, then {top_money_maker['name']} can slot in as a profit reset."
                )

        if asks_what_comes_after:
            if current_action is None:
                current_action = next_actions.top_action
            if current_action is None:
                return None

            next_action = next(
                (
                    action
                    for action in actions
                    if not self._actions_match(action, current_action)
                ),
                None,
            )
            if next_action is None:
                return (
                    f"After {self._action_label(current_action)}, I'd stay on that lane a little longer. "
                    f"{current_action.summary}"
                )
            return (
                f"After {self._action_label(current_action)}, I'd move into {next_action.title.lower()}. "
                f"{next_action.summary}"
            )

        ask_do_that_before = "should i do that before" in normalized

        if asks_goal_comparison:
            goal_title = latest_goal.title if latest_goal is not None else "your current plan"
            if current_action is not None and comparison_action is not None:
                current_better = current_action.score >= comparison_action.score
                preferred = current_action if current_better else comparison_action
                alternate = comparison_action if current_better else current_action
                return (
                    f"For {goal_title}, {self._action_label(preferred)} helps more than {self._action_label(alternate)} right now. "
                    f"{self._ordering_reason(preferred)}"
                )

            current_quest_id = self._state_str(session_state, "last_quest_id")
            comparison_quest_id = comparison_focus.get("quest_id")
            comparison_money_target = comparison_focus.get("money_target")
            current_money_target = self._state_str(session_state, "last_money_target")
            if current_quest_id is not None and comparison_money_target is not None:
                current_quest = quest_service.get_quest(current_quest_id)
                return (
                    f"For {goal_title}, {current_quest.name} helps more than {comparison_money_target.title()} right now. "
                    f"It pushes the account plan forward directly, while {comparison_money_target} is better treated as profit support."
                )
            if current_money_target is not None and comparison_quest_id is not None:
                comparison_quest = quest_service.get_quest(comparison_quest_id)
                return (
                    f"For {goal_title}, {comparison_quest.name} helps more than {current_money_target.title()} right now. "
                    f"It advances your tracked progression more directly, then {current_money_target} can fund the next steps."
                )

        if current_action is not None and comparison_action is not None:
            current_first = current_action.score >= comparison_action.score
            preferred_first = current_action if current_first else comparison_action
            preferred_second = comparison_action if current_first else current_action
            reason = self._ordering_reason(preferred_first)

            if ask_do_that_before:
                if current_first:
                    return (
                        f"Yes, I'd do {self._action_label(current_action)} before {self._action_label(comparison_action)}. "
                        f"{reason}"
                    )
                return (
                    f"I'd flip that order and do {self._action_label(comparison_action)} before "
                    f"{self._action_label(current_action)}. {reason}"
                )

            if current_first:
                return (
                    f"I'd do {self._action_label(comparison_action)} after {self._action_label(current_action)}. "
                    f"{reason}"
                )
            return (
                f"Yes, {self._action_label(current_action)} makes more sense after "
                f"{self._action_label(comparison_action)}. {reason}"
            )

        current_quest_id = self._state_str(session_state, "last_quest_id")
        comparison_quest_id = comparison_focus.get("quest_id")
        if current_quest_id is not None and comparison_quest_id is not None and current_quest_id != comparison_quest_id:
            current_quest = quest_service.get_quest(current_quest_id)
            comparison_quest = quest_service.get_quest(comparison_quest_id)
            current_blockers = self._quest_blocker_count(
                quest_id=current_quest_id,
                latest_snapshot=latest_snapshot,
                progress=progress,
            )
            comparison_blockers = self._quest_blocker_count(
                quest_id=comparison_quest_id,
                latest_snapshot=latest_snapshot,
                progress=progress,
            )
            current_first = current_blockers <= comparison_blockers
            if current_blockers == comparison_blockers and latest_goal is not None:
                current_first = current_quest.name.lower() in latest_goal.title.lower()
            reason = (
                f"{current_quest.name} has fewer immediate structured blockers in your current account state."
                if current_first
                else f"{comparison_quest.name} has fewer immediate structured blockers in your current account state."
            )

            if ask_do_that_before:
                if current_first:
                    return f"Yes, I'd do {current_quest.name} before {comparison_quest.name}. {reason}"
                return f"I'd flip that order and do {comparison_quest.name} before {current_quest.name}. {reason}"

            if current_first:
                return f"I'd do {comparison_quest.name} after {current_quest.name}. {reason}"
            return f"Yes, {current_quest.name} makes more sense after {comparison_quest.name}. {reason}"

        comparison_money_target = comparison_focus.get("money_target")
        if current_quest_id is not None and comparison_money_target is not None:
            current_quest = quest_service.get_quest(current_quest_id)
            goal_title = latest_goal.title if latest_goal is not None else "your progression plan"
            return (
                f"I'd do {current_quest.name} before {comparison_money_target.title()} if the main lane is {goal_title}. "
                f"It pushes the account plan forward more directly, then {comparison_money_target} can slot in as a profit step."
            )

        return None

    async def _build_confidence_and_tradeoff_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        latest_goal: Goal | None,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
        session_state: dict[str, object],
    ) -> str | None:
        normalized = message.lower()
        asks_confidence = any(
            phrase in normalized
            for phrase in (
                "how confident are you",
                "how sure are you",
                "are you confident",
                "how strong is that recommendation",
            )
        )
        asks_tradeoff = any(
            phrase in normalized
            for phrase in (
                "what's the tradeoff",
                "what is the tradeoff",
                "what's the downside",
                "what is the downside",
                "what am i giving up",
                "why that over",
            )
        )
        if not asks_confidence and not asks_tradeoff:
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        if not actions:
            return None

        current_action = self._find_action_from_session_state(actions, session_state) or next_actions.top_action
        if current_action is None:
            return None
        alternate_action = next(
            (action for action in actions if not self._actions_match(action, current_action)),
            None,
        )
        goal_title = latest_goal.title if latest_goal is not None else "your current progression plan"

        if asks_confidence:
            return self._confidence_summary(
                action=current_action,
                alternate_action=alternate_action,
                goal_title=goal_title,
            )

        return self._tradeoff_summary(
            action=current_action,
            alternate_action=alternate_action,
            goal_title=goal_title,
            latest_snapshot=latest_snapshot,
            progress=progress,
        )

    async def _build_blocker_priority_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        latest_goal: Goal | None,
        session_state: dict[str, object],
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "which blocker should i clear first",
                "what blocker should i clear first",
                "what blocker should i fix first",
                "which blocker should i fix first",
                "what should i clear first",
                "what should i unblock first",
            )
        ):
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        if not actions:
            return None

        current_action = self._find_action_from_session_state(actions, session_state) or next_actions.top_action
        if current_action is None:
            return None

        blockers = current_action.blockers or []
        if blockers:
            return (
                f"If I were clearing one blocker first, I'd start with {blockers[0]}. "
                f"That is the cleanest thing holding back {self._action_label(current_action)} right now."
            )

        return (
            f"There isn't a single hard blocker I would clear first right now. "
            f"{self._action_label(current_action).capitalize()} is already fairly actionable from your current account state."
        )

    async def _build_why_now_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        latest_goal: Goal | None,
        session_state: dict[str, object],
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "why now instead of later",
                "why now and not later",
                "why should i do this now",
                "why this now instead of later",
            )
        ):
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        if not actions:
            return None
        current_action = self._find_action_from_session_state(actions, session_state) or next_actions.top_action
        if current_action is None:
            return None
        alternate_action = next(
            (action for action in actions if not self._actions_match(action, current_action)),
            None,
        )
        goal_title = latest_goal.title if latest_goal is not None else "your current progression plan"
        if alternate_action is None:
            return (
                f"Because {self._action_label(current_action)} is the one lane that clearly moves {goal_title} right now. "
                f"{current_action.summary}"
            )
        return (
            f"Because {self._action_label(current_action)} creates more immediate value for {goal_title} than {self._action_label(alternate_action)}. "
            f"{self._ordering_reason(current_action)}"
        )

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

    def _build_focus_summary_answer(
        self,
        *,
        message: str,
        account: Account | None,
        latest_goal: Goal | None,
        session_focus: dict[str, str | None],
        session_intent: str | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "what are we focused on",
                "what are we working on",
                "what am i working toward",
                "what's the plan",
                "whats the plan",
                "remind me what we're doing",
                "what should be the priority",
                "what's the priority",
                "whats the priority",
                "what is the priority",
            )
        ):
            return None

        focus_summary = self._summarize_session_focus(
            session_focus=session_focus,
            latest_goal=latest_goal,
            account=account,
            include_goal=self._should_emphasize_goal_context(
                message=message,
                session_focus=session_focus,
                session_intent=session_intent,
            ),
        )
        if "priority" in normalized and session_intent is not None:
            return f"{focus_summary} Right now, the session priority is {self._humanize_session_intent(session_intent)}."
        return focus_summary

    def _summarize_biggest_blockers(
        self,
        *,
        actions: list[NextActionRecommendation],
        latest_goal: Goal | None,
    ) -> str | None:
        blockers: list[str] = []
        seen: set[str] = set()

        for action in actions:
            for blocker in action.blockers or []:
                normalized = blocker.strip().lower()
                if not normalized or normalized in seen:
                    continue
                seen.add(normalized)
                blockers.append(blocker)
                if len(blockers) == 3:
                    break
            if len(blockers) == 3:
                break

        if not blockers:
            return None

        goal_title = latest_goal.title if latest_goal is not None else "your current progression lane"
        if len(blockers) == 1:
            blocker_phrase = blockers[0]
        elif len(blockers) == 2:
            blocker_phrase = f"{blockers[0]} and {blockers[1]}"
        else:
            blocker_phrase = f"{blockers[0]}, {blockers[1]}, and {blockers[2]}"

        return (
            f"Your biggest blockers right now are {blocker_phrase}. "
            f"Those are the main pieces holding back {goal_title} from moving more cleanly."
        )

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

    def _build_quest_chain_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "prerequisite",
                "prerequisites",
                "quest chain",
                "comes before",
                "before recipe for disaster",
                "before monkey madness ii",
            )
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
        missing_quests = readiness.get("missing_quests", [])
        missing_skills = readiness.get("missing_skills", [])

        if not missing_quests:
            if missing_skills:
                top_gap = missing_skills[0]
                return (
                    f"For {quest.name}, the quest chain is already in a decent spot. "
                    f"The next blocker is really {str(top_gap['skill']).replace('_', ' ').title()} "
                    f"{top_gap['current_level']}->{top_gap['required_level']}."
                )
            return f"For {quest.name}, the prerequisite quest chain is already covered in your tracked progress."

        first_quest = missing_quests[0]
        if len(missing_quests) == 1:
            return (
                f"The main quest-chain blocker before {quest.name} is {first_quest}. "
                f"Clear that first, then recheck the remaining stat and utility blockers."
            )
        return (
            f"Before {quest.name}, I'd start with {first_quest}. "
            f"After that, the next quest-chain blockers are {', '.join(missing_quests[1:4])}."
        )

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

        parts = [f"To get ready for {label}, there are still a few blockers to clear."]
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
        if any(
            phrase in normalized
            for phrase in (
                "low attention money maker",
                "lower attention money maker",
                "money maker with low attention",
                "afk money maker",
                "lowest unlock burden",
                "lower unlock burden",
                "least unlock burden",
                "fewest unlocks",
            )
        ):
            return None
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
                if "worth it" in normalized:
                    if matching["missing_requirements"]:
                        return (
                            f"{matching['name']} is worth keeping in mind, but not as your immediate play until you clear "
                            f"{', '.join(matching['missing_requirements'][:4])}. {matching['why']}"
                        )
                    return f"Yes, {matching['name']} is worth doing right now. {matching['summary']} {matching['why']}"
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

    def _build_money_maker_comparison_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
        profile: Profile | None,
    ) -> str | None:
        normalized = message.lower()
        asks_low_attention = any(
            phrase in normalized
            for phrase in (
                "low attention money maker",
                "lower attention money maker",
                "money maker with low attention",
                "afk money maker",
            )
        )
        asks_unlock_burden = any(
            phrase in normalized
            for phrase in (
                "lowest unlock burden",
                "lower unlock burden",
                "least unlock burden",
                "fewest unlocks",
            )
        )
        if not asks_low_attention and not asks_unlock_burden:
            return None

        options = money_maker_service.get_best_options(
            skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
            unlocked_transports=progress.unlocked_transports if progress else None,
            completed_quests=progress.completed_quests if progress else None,
            prefers_profitable_methods=profile.prefers_profitable_methods if profile is not None else False,
        )
        if not options:
            return None

        if asks_low_attention:
            low_attention = next(
                (option for option in options if option["name"] in {"Birdhouse runs", "Karambwans"}),
                options[0],
            )
            return (
                f"If you want a lower-attention money maker, I'd lean into {low_attention['name']}. "
                f"{low_attention['summary']} {low_attention['why']}"
            )

        lowest_burden = min(
            options,
            key=lambda option: (len(option["missing_requirements"]), -int(option["score"])),
        )
        return (
            f"The money maker with the lightest unlock burden right now is {lowest_burden['name']}. "
            f"It only asks for {len(lowest_burden['missing_requirements'])} missing requirement(s), which makes it easier to bring online quickly."
        )

    def _build_boss_prep_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "what should i prep for",
                "what do i prep for",
                "how should i prep for",
                "what should i bring for",
                "what should i prepare for",
            )
        ):
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

        parts = [f"For {readiness['label']}, I'd prep three things first."]
        if readiness["missing_skills"]:
            top_gap = readiness["missing_skills"][0]
            parts.append(
                f"First, close the main stat gap in {str(top_gap['skill']).replace('_', ' ').title()} from {top_gap['current_level']} toward {top_gap['required_level']}."
            )
        else:
            parts.append("First, your tracked stats are already in a workable range, so don't stall on raw levels.")

        if readiness["missing_unlocks"]:
            parts.append(
                f"Second, unlock {', '.join(str(item) for item in readiness['missing_unlocks'][:3])} so the route and access feel clean."
            )
        else:
            parts.append("Second, make sure the route, banking rhythm, and access feel comfortable before you commit to runs.")

        parts.append(f"Third, tighten your gear, supplies, and prayer plan. {readiness['notes']}")
        return " ".join(parts)

    def _build_target_training_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
        session_state: dict[str, object],
    ) -> str | None:
        normalized = message.lower()
        if "train for" not in normalized:
            return None

        quest_id = self._detect_quest_id(normalized)
        if quest_id is not None:
            quest = quest_service.get_quest(quest_id)
            readiness = quest_service.evaluate_readiness(
                quest_id=quest_id,
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                completed_quests=progress.completed_quests if progress else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
            )
            missing_skills = readiness.get("missing_skills", [])
            if missing_skills:
                top_gap = missing_skills[0]
                return (
                    f"For {quest.name}, I'd train {str(top_gap['skill']).replace('_', ' ').title()} next. "
                    f"You're currently {top_gap['current_level']} and the structured target is {top_gap['required_level']}."
                )
            saved_skill = self._state_str(session_state, "last_recommended_skill")
            if saved_skill is not None:
                return (
                    f"For {quest.name}, your formal stat blockers are already covered, so I'd keep pushing "
                    f"{saved_skill.replace('_', ' ').title()} as the training lane that best supports the current plan."
                )
            return f"For {quest.name}, your tracked stat blockers are already in a good spot, so I'd focus on quest progression or unlock cleanup next."

        boss_id = boss_advisor_service.detect_boss_id(normalized)
        if boss_id is not None:
            readiness = boss_advisor_service.evaluate_readiness(
                boss_id=boss_id,
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
                completed_quests=progress.completed_quests if progress else None,
            )
            missing_skills = readiness["missing_skills"]
            if missing_skills:
                top_gap = missing_skills[0]
                return (
                    f"For {readiness['label']}, I'd train {str(top_gap['skill']).replace('_', ' ').title()} next. "
                    f"You're currently {top_gap['current_level']} and a safer target is {top_gap['required_level']}."
                )
            return f"For {readiness['label']}, your tracked stat requirements are in a good spot already, so I'd tighten gear, supplies, and route prep next."

        return None

    def _build_skill_comparison_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        session_state: dict[str, object],
    ) -> str | None:
        normalized = message.lower()
        if " or " not in normalized and " vs " not in normalized and "versus" not in normalized:
            return None

        skills = latest_snapshot.summary.get("skills")
        if not isinstance(skills, dict):
            return None

        mentioned_skills = self._detect_skill_names(normalized, skills)
        if len(mentioned_skills) < 2:
            return None

        left_skill, right_skill = mentioned_skills[:2]
        left_data = skills.get(left_skill)
        right_data = skills.get(right_skill)
        left_level = left_data.get("level") if isinstance(left_data, dict) else None
        right_level = right_data.get("level") if isinstance(right_data, dict) else None

        saved_skill = self._state_str(session_state, "last_recommended_skill")
        preferred_skill: str
        alternate_skill: str
        reason: str

        if not isinstance(left_level, int) and not isinstance(right_level, int):
            return (
                f"Between {left_skill.replace('_', ' ').title()} and {right_skill.replace('_', ' ').title()}, "
                f"I'd need a cleaner synced snapshot before I make a strong call. Ask me again after a fresh sync and I can compare them properly."
            )

        if not isinstance(left_level, int):
            return (
                f"I can see {right_skill.replace('_', ' ').title()} clearly in your synced stats, but {left_skill.replace('_', ' ').title()} "
                f"isn't coming through cleanly in this snapshot yet. For now I'd train {right_skill.replace('_', ' ').title()} first, "
                f"then compare again after the next sync."
            )

        if not isinstance(right_level, int):
            return (
                f"I can see {left_skill.replace('_', ' ').title()} clearly in your synced stats, but {right_skill.replace('_', ' ').title()} "
                f"isn't coming through cleanly in this snapshot yet. For now I'd train {left_skill.replace('_', ' ').title()} first, "
                f"then compare again after the next sync."
            )

        if saved_skill in {left_skill, right_skill}:
            preferred_skill = saved_skill
            alternate_skill = right_skill if preferred_skill == left_skill else left_skill
            reason = "It's already the live training lane in your current thread."
        elif left_level < right_level:
            preferred_skill = left_skill
            alternate_skill = right_skill
            reason = "It is the lower of the two right now, so it is the cleaner catch-up lane for broader account balance."
        elif right_level < left_level:
            preferred_skill = right_skill
            alternate_skill = left_skill
            reason = "It is the lower of the two right now, so it is the cleaner catch-up lane for broader account balance."
        else:
            preferred_skill = left_skill
            alternate_skill = right_skill
            reason = "Both are close, but I'd still start with the first lane you raised and keep the other right behind it."

        preferred_level = left_level if preferred_skill == left_skill else right_level
        alternate_level = right_level if preferred_skill == left_skill else left_level
        return (
            f"Between {preferred_skill.replace('_', ' ').title()} and {alternate_skill.replace('_', ' ').title()}, "
            f"I'd train {preferred_skill.replace('_', ' ').title()} first. "
            f"You're currently {preferred_level} there versus {alternate_level} in {alternate_skill.replace('_', ' ').title()}. "
            f"{reason}"
        )

    async def _build_unlock_priority_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        latest_goal: Goal | None,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "what unlock should i push next",
                "what should i unlock next",
                "what unlock should i work toward",
                "what unlock should i go for next",
            )
        ):
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        unlock_action = next(
            (action for action in actions if action.action_type in {"quest", "travel"}),
            next_actions.top_action,
        )
        if unlock_action is None:
            return None

        if unlock_action.action_type == "quest":
            goal_title = latest_goal.title if latest_goal is not None else "your current progression plan"
            return (
                f"The next unlock I'd push is {self._action_label(unlock_action)}. "
                f"It opens more value for {goal_title} than the rest of the board right now."
            )

        if unlock_action.action_type == "travel":
            return (
                f"The next unlock I'd push is {self._action_label(unlock_action)}. "
                f"It reduces future friction across the rest of your account routes."
            )

        if progress is not None and progress.active_unlocks:
            return f"Your strongest tracked unlock chain right now is {progress.active_unlocks[0]}."

        return f"I'd still anchor on {self._action_label(unlock_action)} as the most useful unlock lane right now."

    def _build_unlock_chain_priority_answer(
        self,
        *,
        message: str,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "which unlock chain should i prioritize",
                "what unlock chain should i prioritize",
                "which active unlock should i prioritize",
                "what active unlock should i prioritize",
            )
        ):
            return None

        if progress is None or not progress.active_unlocks:
            return "You do not have any active unlock chains tracked yet, so I'd start by adding the biggest account goal you care about first."

        primary = progress.active_unlocks[0]
        if len(progress.active_unlocks) == 1:
            return f"I'd prioritize {primary} first. It's the clearest active unlock chain in your workspace right now."

        secondary = progress.active_unlocks[1]
        return (
            f"I'd prioritize {primary} before {secondary}. "
            f"{primary} is the strongest unlock lane currently tracked, and {secondary} can stay right behind it."
        )

    async def _build_utility_unlock_answer(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        message: str,
        account: Account | None,
        latest_goal: Goal | None,
    ) -> str | None:
        normalized = message.lower()
        if not any(
            phrase in normalized
            for phrase in (
                "utility unlock",
                "travel unlock",
                "mobility unlock",
                "quality of life unlock",
                "diary-style unlock",
                "diary style unlock",
                "diary-style utility",
                "diary style utility",
            )
        ):
            return None

        next_actions = await recommendation_service.get_next_actions(
            db_session=db_session,
            user=user,
            payload=NextActionRequest(
                account_rsn=account.rsn if account is not None else None,
                goal_id=latest_goal.id if latest_goal is not None else None,
                limit=4,
            ),
        )
        actions = next_actions.actions
        if not actions:
            return None

        utility_action = next(
            (
                action
                for action in actions
                if action.action_type in {"travel", "quest"}
            ),
            next_actions.top_action,
        )
        if utility_action is None:
            return None

        leading_clause = (
            "If you're thinking in diary-style utility, the next thing I'd push is"
            if "diary" in normalized
            else "The utility unlock I'd push next is"
        )
        if utility_action.action_type == "travel":
            return (
                f"{leading_clause} {self._action_label(utility_action)}. "
                f"It reduces friction across future quest, skilling, and gear routes."
            )

        return (
            f"{leading_clause} {self._action_label(utility_action)}. "
            f"It opens broader account value than a narrow stat gain right now."
        )

    def _build_value_judgment_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
        profile: Profile | None,
    ) -> str | None:
        normalized = message.lower()
        if "worth it" not in normalized:
            return None

        quest_id = self._detect_quest_id(normalized)
        if quest_id is not None:
            quest = quest_service.get_quest(quest_id)
            readiness = quest_service.evaluate_readiness(
                quest_id=quest_id,
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                completed_quests=progress.completed_quests if progress else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
            )
            blockers = (
                len(readiness.get("missing_skills", []))
                + len(readiness.get("missing_quests", []))
                + len(readiness.get("missing_other_requirements", []))
            )
            if blockers <= 1:
                return f"Yes, {quest.name} is worth prioritizing right now. {quest.why_it_matters}"
            return f"{quest.name} is still worth it, but I'd clear a few blockers first. {quest.why_it_matters}"

        boss_id = boss_advisor_service.detect_boss_id(normalized)
        if boss_id is not None:
            readiness = boss_advisor_service.evaluate_readiness(
                boss_id=boss_id,
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
                completed_quests=progress.completed_quests if progress else None,
            )
            blockers = len(readiness["missing_skills"]) + len(readiness["missing_unlocks"])
            if blockers <= 1:
                return f"Yes, {readiness['label']} looks worth pushing toward right now. {readiness['notes']}"
            return f"{readiness['label']} is worth keeping on the roadmap, but I'd close your main blockers first. {readiness['notes']}"

        money_target = self._detect_money_target(normalized)
        if money_target is not None:
            options = money_maker_service.get_best_options(
                skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
                unlocked_transports=progress.unlocked_transports if progress else None,
                completed_quests=progress.completed_quests if progress else None,
                prefers_profitable_methods=profile.prefers_profitable_methods if profile is not None else False,
            )
            match = next((option for option in options if money_target in option["name"].lower()), None)
            if match is None:
                return None
            if match["missing_requirements"]:
                return (
                    f"{match['name']} is worth keeping in mind, but not as your immediate play until you clear "
                    f"{', '.join(match['missing_requirements'][:4])}. {match['why']}"
                )
            return f"Yes, {match['name']} is worth doing right now. {match['summary']} {match['why']}"

        return None

    def _find_action_from_session_state(
        self,
        actions: list[NextActionRecommendation],
        session_state: dict[str, object],
    ) -> NextActionRecommendation | None:
        quest_id = self._state_str(session_state, "last_quest_id")
        if quest_id is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "quest" and str((action.target or {}).get("quest_id")) == quest_id
                ),
                None,
            )
            if match is not None:
                return match

        saved_skill = self._state_str(session_state, "last_recommended_skill")
        if saved_skill is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "skill" and str((action.target or {}).get("skill")) == saved_skill
                ),
                None,
            )
            if match is not None:
                return match

        destination = self._state_str(session_state, "last_destination")
        if destination is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "travel"
                    and str((action.target or {}).get("destination")) == destination
                ),
                None,
            )
            if match is not None:
                return match

        combat_style = self._state_str(session_state, "last_combat_style")
        if combat_style is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "gear"
                    and str((action.supporting_data or {}).get("combat_style")) == combat_style
                ),
                None,
            )
            if match is not None:
                return match

        return None

    def _find_action_from_focus(
        self,
        actions: list[NextActionRecommendation],
        focus: dict[str, str | None],
    ) -> NextActionRecommendation | None:
        quest_id = focus.get("quest_id")
        if quest_id is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "quest" and str((action.target or {}).get("quest_id")) == quest_id
                ),
                None,
            )
            if match is not None:
                return match

        destination = focus.get("destination")
        if destination is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "travel"
                    and str((action.target or {}).get("destination")) == destination
                ),
                None,
            )
            if match is not None:
                return match

        combat_style = focus.get("combat_style")
        if combat_style is not None:
            match = next(
                (
                    action
                    for action in actions
                    if action.action_type == "gear"
                    and str((action.supporting_data or {}).get("combat_style")) == combat_style
                ),
                None,
            )
            if match is not None:
                return match

        return None

    def _actions_match(
        self,
        left: NextActionRecommendation,
        right: NextActionRecommendation,
    ) -> bool:
        return left.action_type == right.action_type and left.target == right.target

    def _action_label(self, action: NextActionRecommendation) -> str:
        target = action.target or {}
        if action.action_type == "quest":
            quest_id = target.get("quest_id")
            if isinstance(quest_id, str):
                return quest_service.get_quest(quest_id).name
        if action.action_type == "skill":
            skill = target.get("skill")
            if isinstance(skill, str):
                return f"training {skill.replace('_', ' ').title()}"
        if action.action_type == "travel":
            destination = target.get("destination")
            if isinstance(destination, str):
                return f"the {destination.title()} route setup"
        if action.action_type == "gear":
            item_name = target.get("item_name")
            if isinstance(item_name, str):
                return item_name
        return action.title

    def _ordering_reason(self, action: NextActionRecommendation) -> str:
        blockers = action.blockers or []
        if blockers:
            blocker_preview = ", ".join(blockers[:2])
            return f"It has the stronger priority in your current plan, even with blockers like {blocker_preview}."
        return "It has the stronger priority in your current plan and is the cleaner next push from your synced context."

    def _confidence_summary(
        self,
        *,
        action: NextActionRecommendation,
        alternate_action: NextActionRecommendation | None,
        goal_title: str,
    ) -> str:
        blocker_count = len(action.blockers or [])
        score_gap = action.score - alternate_action.score if alternate_action is not None else 12

        if score_gap >= 12 and blocker_count == 0:
            confidence = "high"
            reason = (
                f"{self._action_label(action).capitalize()} is clearly ahead of the rest of the board for {goal_title}."
            )
        elif score_gap >= 6 and blocker_count <= 1:
            confidence = "pretty solid"
            reason = (
                f"{self._action_label(action).capitalize()} still leads the current plan, but the lane behind it is close enough that I'd keep it in view."
            )
        else:
            confidence = "measured"
            reason = (
                f"{self._action_label(action).capitalize()} is still the best call right now, but it is not massively ahead of the alternatives yet."
            )

        blocker_note = (
            f" The main thing keeping me cautious is {', '.join((action.blockers or [])[:2])}."
            if blocker_count > 0
            else " There are no major blockers attached to it right now."
        )
        alternate_note = (
            f" The closest alternate is {self._action_label(alternate_action)}."
            if alternate_action is not None
            else ""
        )
        return f"My confidence is {confidence}. {reason}{blocker_note}{alternate_note}"

    def _tradeoff_summary(
        self,
        *,
        action: NextActionRecommendation,
        alternate_action: NextActionRecommendation | None,
        goal_title: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str:
        if alternate_action is None:
            return (
                f"The main tradeoff is focus versus flexibility. {self._action_label(action).capitalize()} is the only clear live lane, "
                f"so the cost is spending less time on side upgrades until {goal_title} moves forward."
            )

        primary_label = self._action_label(action)
        alternate_label = self._action_label(alternate_action)
        reason = self._ordering_reason(action)

        if action.action_type == "quest":
            quest_id = str((action.target or {}).get("quest_id") or "")
            blocker_count = self._quest_blocker_count(
                quest_id=quest_id,
                latest_snapshot=latest_snapshot,
                progress=progress,
            ) if quest_id else len(action.blockers or [])
            blocker_note = (
                " It does ask you to clear a few blockers first."
                if blocker_count > 0
                else " It is fairly clean to act on immediately."
            )
            return (
                f"The tradeoff is direct progression versus optional side value. {primary_label.capitalize()} pushes {goal_title} more directly than "
                f"{alternate_label}, but it can be a little more demanding upfront.{blocker_note} {reason}"
            )

        if action.action_type == "skill":
            return (
                f"The tradeoff is momentum versus variety. {primary_label.capitalize()} is the cleanest account-growth lane right now, "
                f"while {alternate_label} is the thing I'd hold in reserve if you want to change pace. {reason}"
            )

        if action.action_type == "gear":
            return (
                f"The tradeoff is power now versus broader flexibility. {primary_label.capitalize()} improves your lane faster, "
                f"but {alternate_label} may stay attractive if you want a more rounded plan. {reason}"
            )

        if action.action_type == "travel":
            return (
                f"The tradeoff is convenience versus immediate payoff. {primary_label.capitalize()} reduces future friction, "
                f"while {alternate_label} may do more right now if you only care about the next short push. {reason}"
            )

        return (
            f"The tradeoff is that {primary_label} is the sharper move for {goal_title}, while {alternate_label} is the safer alternate lane. "
            f"{reason}"
        )

    def _quest_blocker_count(
        self,
        *,
        quest_id: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> int:
        readiness = quest_service.evaluate_readiness(
            quest_id=quest_id,
            skills=latest_snapshot.summary.get("skills") if latest_snapshot.summary else None,
            completed_quests=progress.completed_quests if progress else None,
            unlocked_transports=progress.unlocked_transports if progress else None,
        )
        return (
            len(readiness.get("missing_skills", []))
            + len(readiness.get("missing_quests", []))
            + len(readiness.get("missing_other_requirements", []))
        )

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

    def _build_account_telemetry_answer(
        self,
        *,
        message: str,
        latest_snapshot: AccountSnapshot,
        progress: AccountProgress | None,
    ) -> str | None:
        normalized = message.lower()
        summary = latest_snapshot.summary or {}
        progression_profile = summary.get("progression_profile")
        skill_categories = summary.get("skill_categories")

        if not isinstance(progression_profile, dict):
            progression_profile = {}
        if not isinstance(skill_categories, dict):
            skill_categories = {}

        top_skills = latest_snapshot.summary.get("top_skills")
        top_skill = top_skills[0] if isinstance(top_skills, list) and top_skills and isinstance(top_skills[0], dict) else None
        top_skill_name = str(top_skill.get("skill", "")).replace("_", " ").title() if top_skill else None
        top_skill_level = top_skill.get("level") if top_skill else None
        lowest_skill_name = progression_profile.get("lowest_tracked_skill")
        if isinstance(lowest_skill_name, str):
            lowest_skill_name = lowest_skill_name.replace("_", " ").title()
        else:
            lowest_skill_name = None

        category_averages: list[tuple[str, float]] = []
        for category_name, data in skill_categories.items():
            if not isinstance(data, dict):
                continue
            average_level = data.get("average_level")
            if isinstance(average_level, (int, float)):
                category_averages.append((str(category_name), float(average_level)))

        strongest_category = None
        weakest_category = None
        if category_averages:
            strongest_category = max(category_averages, key=lambda item: item[1])
            weakest_category = min(category_averages, key=lambda item: item[1])

        if any(
            phrase in normalized
            for phrase in (
                "what stands out",
                "what stands out about my account",
                "give me an account summary",
                "summarize my account",
                "account summary",
                "read my account",
            )
        ):
            parts = [
                f"Your account is currently around overall level {summary.get('overall_level')} with combat {summary.get('combat_level')}.",
            ]
            if top_skill_name and isinstance(top_skill_level, int):
                parts.append(f"Your standout stat right now is {top_skill_name} at level {top_skill_level}.")
            if strongest_category is not None:
                parts.append(
                    f"Your strongest lane looks like {strongest_category[0].title()} with an average around {strongest_category[1]:.0f}."
                )
            if weakest_category is not None and weakest_category != strongest_category:
                parts.append(
                    f"The softest lane is {weakest_category[0].title()} around {weakest_category[1]:.0f}, so that is where gains would round the account out fastest."
                )
            if progress is not None and progress.active_unlocks:
                parts.append(f"Your current tracked unlock push is {progress.active_unlocks[0]}.")
            return " ".join(parts)

        if "strongest stat" in normalized or "best stat" in normalized or "standout stat" in normalized:
            if top_skill_name and isinstance(top_skill_level, int):
                return f"Your strongest tracked stat right now is {top_skill_name} at level {top_skill_level}."
            return None

        if "how balanced" in normalized or "is my account balanced" in normalized:
            if strongest_category is None or weakest_category is None:
                return None
            spread = strongest_category[1] - weakest_category[1]
            if spread <= 10:
                tone = "fairly balanced"
            elif spread <= 20:
                tone = "somewhat uneven"
            else:
                tone = "pretty lopsided right now"
            return (
                f"Your account looks {tone}. "
                f"{strongest_category[0].title()} is leading around {strongest_category[1]:.0f}, "
                f"while {weakest_category[0].title()} trails around {weakest_category[1]:.0f}."
            )

        if "what should i ask" in normalized and "account" in normalized:
            suggestion_parts = []
            if top_skill_name and isinstance(top_skill_level, int):
                suggestion_parts.append(f"your strongest lane like {top_skill_name} {top_skill_level}")
            if lowest_skill_name:
                suggestion_parts.append(f"your weakest area like {lowest_skill_name}")
            if progress is not None and progress.active_unlocks:
                suggestion_parts.append(f"your current unlock push like {progress.active_unlocks[0]}")

            if not suggestion_parts:
                return (
                    "Start with one of these: what stands out about my account, what should I do next, "
                    "or what changed since my last sync."
                )

            return (
                "Start by asking about "
                + ", ".join(suggestion_parts[:3])
                + ". After that, ask what would move the account forward fastest."
            )

        if any(
            phrase in normalized
            for phrase in (
                "what should i round out next",
                "what am i neglecting",
                "what area am i neglecting",
                "what area of my account am i neglecting",
                "what part of my account am i neglecting",
                "what should i shore up next",
                "what should i clean up next",
            )
        ):
            if weakest_category is None and lowest_skill_name is None:
                return None

            if weakest_category is not None:
                category_label = strongest_category[0].title() if strongest_category is not None else None
                weakest_label = weakest_category[0].title()
                parts = [
                    f"I'd round out {weakest_label} next."
                ]
                if category_label and strongest_category != weakest_category:
                    parts.append(
                        f"That is the clearest contrast against your stronger {category_label} lane right now."
                    )
                if lowest_skill_name:
                    parts.append(f"A good place to start inside that weaker lane is {lowest_skill_name}.")
                return " ".join(parts)

            return f"The cleanest neglected area to shore up next is {lowest_skill_name}."

        if any(
            phrase in normalized
            for phrase in (
                "what should i fix first on this account",
                "what should i fix first",
                "what should i clean up first",
                "where would one level go furthest",
                "where would one push go furthest",
                "what area would pay off most",
                "what would pay off most on this account",
            )
        ):
            if weakest_category is None and lowest_skill_name is None:
                return None

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                strongest_label = strongest_category[0].title() if strongest_category is not None else None
                parts = [
                    f"I'd fix {weakest_label} first on this account."
                ]
                if strongest_label and strongest_category != weakest_category:
                    parts.append(
                        f"That is the widest gap versus your stronger {strongest_label} lane, so it should pay off fastest."
                    )
                if lowest_skill_name is not None:
                    parts.append(f"If you want one clean starting point, begin with {lowest_skill_name}.")
                return " ".join(parts)

            return f"If you want the cleanest payoff first, start by fixing {lowest_skill_name}."

        if any(
            phrase in normalized
            for phrase in (
                "what is already in a good spot",
                "what part of my account is already in a good spot",
                "what can i leave alone for now",
                "what do i not need to touch right now",
                "what is already strong enough",
            )
        ):
            if strongest_category is None and top_skill_name is None:
                return None

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                parts = [
                    f"{strongest_label} is already in a good spot right now."
                ]
                if top_skill_name and isinstance(top_skill_level, int):
                    parts.append(
                        f"You can feel that in standout stats like {top_skill_name} at level {top_skill_level}."
                    )
                parts.append(
                    "I would treat that as stable for now unless it directly blocks the thing you're trying to do next."
                )
                return " ".join(parts)

            return f"{top_skill_name} is already one of the stronger parts of the account, so that does not need urgent attention."

        if any(
            phrase in normalized
            for phrase in (
                "what am i overinvesting in",
                "what part of my account am i overinvesting in",
                "what am i leaning too hard into",
                "where am i overfocused",
            )
        ):
            if strongest_category is None and top_skill_name is None:
                return None

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                parts = [
                    f"If anything looks overinvested right now, it's {strongest_label}."
                ]
                if weakest_category is not None and strongest_category != weakest_category:
                    parts.append(
                        f"That lane is clearly ahead of your {weakest_category[0].title()} baseline, so I'd be careful about pushing it even harder unless it serves a specific goal."
                    )
                elif top_skill_name and isinstance(top_skill_level, int):
                    parts.append(
                        f"You can see that in standout stats like {top_skill_name} at level {top_skill_level}."
                    )
                return " ".join(parts)

            return f"{top_skill_name} looks like one of the most heavily developed parts of the account right now."

        if any(
            phrase in normalized
            for phrase in (
                "what lane is most ready to capitalize on",
                "what part of my account is most ready to capitalize on",
                "what am i best positioned to capitalize on",
                "what lane can i capitalize on right now",
            )
        ):
            if strongest_category is None and top_skill_name is None:
                return None

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                parts = [
                    f"{strongest_label} is the lane most ready to capitalize on right now."
                ]
                if top_skill_name and isinstance(top_skill_level, int):
                    parts.append(
                        f"You already have real momentum there through stats like {top_skill_name} at level {top_skill_level}."
                    )
                if progress is not None and progress.active_unlocks:
                    parts.append(
                        f"If you want to compound that advantage, line it up with unlocks like {progress.active_unlocks[0]}."
                    )
                return " ".join(parts)

            return f"Your strongest immediate capitalization lane is whatever builds most directly on {top_skill_name}."

        if any(
            phrase in normalized
            for phrase in (
                "am i bottlenecked by unlocks or stats",
                "what is bottlenecking me more unlocks or stats",
                "am i more bottlenecked by unlocks or stats",
                "what is the bigger bottleneck unlocks or stats",
            )
        ):
            unlock_count = len(progress.active_unlocks) if progress is not None else 0
            transport_count = len(progress.unlocked_transports) if progress is not None else 0
            weak_average = weakest_category[1] if weakest_category is not None else None

            if unlock_count > 0 and transport_count < 2:
                unlock_label = progress.active_unlocks[0] if progress is not None and progress.active_unlocks else "your current unlock chain"
                return (
                    f"Right now you're more bottlenecked by unlocks than raw stats. "
                    f"The account still has open utility friction around {unlock_label}, so I'd clear that before chasing extra levels just for their own sake."
                )

            if weak_average is not None and weak_average < 60:
                weakest_label = weakest_category[0].title() if weakest_category is not None else "your weakest lane"
                return (
                    f"Right now you're more bottlenecked by stats, especially in {weakest_label}. "
                    f"That lane is still soft enough that a few focused levels should pay off faster than another unlock cleanup."
                )

            return (
                "You're fairly split between stat and unlock pressure right now. "
                "I'd treat it as a mixed bottleneck and pick whichever lane gives the cleanest immediate payoff."
            )

        if any(
            phrase in normalized
            for phrase in (
                "what gives the best mix of utility and momentum",
                "what lane gives the best mix of utility and momentum",
                "what path gives the best mix of utility and momentum",
                "what has the best mix of utility and momentum right now",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                if strongest_category is not None:
                    strongest_label = strongest_category[0].title()
                    return (
                        f"The best mix of utility and momentum right now is to pair {unlock_label} with your stronger {strongest_label} lane. "
                        f"That gives you an unlock payoff while still compounding an area of the account that already has traction."
                    )
                return (
                    f"The best mix of utility and momentum right now is to push {unlock_label}. "
                    "It gives you account value immediately while still keeping the broader progression path moving."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"Your best mix of utility and momentum right now is {strongest_label}. "
                    "That's the lane with enough traction to capitalize on immediately without feeling like a dead-end stat grind."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what lane is easiest to convert into real progress this week",
                "what lane is easiest to turn into real progress this week",
                "what can i convert into real progress this week",
                "what lane can i turn into real progress this week",
            )
        ):
            if strongest_category is None and top_skill_name is None:
                return None

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                parts = [
                    f"{strongest_label} is the easiest lane to convert into real progress this week."
                ]
                if top_skill_name and isinstance(top_skill_level, int):
                    parts.append(
                        f"You already have usable momentum there through stats like {top_skill_name} at level {top_skill_level}."
                    )
                if progress is not None and progress.active_unlocks:
                    parts.append(
                        f"If you want that progress to stick, pair it with unlock cleanup like {progress.active_unlocks[0]}."
                    )
                return " ".join(parts)

            return f"The easiest lane to convert into real progress this week is whatever compounds {top_skill_name}."

        if any(
            phrase in normalized
            for phrase in (
                "what lane loses value if i ignore it",
                "what starts losing value if i ignore it",
                "what should i not ignore for too long",
                "what lane gets worse if i leave it alone too long",
            )
        ):
            if weakest_category is None and progress is None:
                return None

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The thing most likely to lose value if ignored is {unlock_label}. "
                    "Open unlock chains tend to keep blocking other useful routes until you close them."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"{weakest_label} is the lane I'd be careful not to ignore too long. "
                    "If it keeps trailing, it starts limiting how much value you can get out of the stronger parts of the account."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what part of my account is under leveraged",
                "what part of my account is underleveraged",
                "what am i under leveraging",
                "what strength am i not using well",
                "what part of the account am i not using well",
            )
        ):
            if strongest_category is None and progress is None:
                return None

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                parts = [
                    f"Your most under-leveraged lane is probably {strongest_label}."
                ]
                if progress is not None and progress.active_unlocks:
                    parts.append(
                        f"You already have strength there, but it is not compounding as well as it could until you connect it to unlock work like {progress.active_unlocks[0]}."
                    )
                elif top_skill_name and isinstance(top_skill_level, int):
                    parts.append(
                        f"You can see that in stats like {top_skill_name} at level {top_skill_level}, but the account is not fully cashing that strength in yet."
                    )
                return " ".join(parts)

            return f"The account is not fully leveraging the strength around {top_skill_name} yet."

        if any(
            phrase in normalized
            for phrase in (
                "what should i revisit after a few days",
                "what should i revisit in a few days",
                "what should i come back to after a few days",
                "what should i recheck after a few days",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"I'd revisit {unlock_label} after a few days. "
                    "That kind of unlock lane often becomes much more actionable once you've cleared one or two smaller blockers around it."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"I'd revisit {weakest_label} after a few days. "
                    "It is the kind of lane that can move from weak to usable pretty quickly once the rest of the account stabilizes around it."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what part of my account is quietly high leverage",
                "what is quietly high leverage right now",
                "what doesn't look flashy but is high leverage",
                "what is the quiet high leverage play",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The quiet high-leverage play right now is {unlock_label}. "
                    "It may not look flashy on the surface, but utility unlocks like that tend to improve several later routes at once."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"{weakest_label} is the quietly high-leverage lane right now. "
                    "It does not look like the flashiest push, but lifting a weak lane usually improves how much value you can get from the rest of the account."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "where is the hidden opportunity on my account",
                "what is the hidden opportunity on my account",
                "where is the hidden value on my account",
                "what am i sleeping on right now",
            )
        ):
            if strongest_category is not None and progress is not None and progress.active_unlocks:
                strongest_label = strongest_category[0].title()
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The hidden opportunity is connecting your stronger {strongest_label} lane to unlock work like {unlock_label}. "
                    "That is where the account probably has more value sitting under the surface than it looks like at first glance."
                )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The hidden opportunity is that you already have real strength in {top_skill_name} at level {top_skill_level}. "
                    "The next win is finding the activity or unlock that actually converts that into broader account value."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of account is this becoming",
                "what kind of account am i building",
                "what kind of account am i turning this into",
                "what account identity is this trending toward",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                parts = [
                    f"This account is trending toward a {strongest_label.lower()}-led all-rounder."
                ]
                if top_skill_name and isinstance(top_skill_level, int):
                    parts.append(
                        f"The clearest tell is {top_skill_name} at level {top_skill_level}, which is already giving that lane a visible identity."
                    )
                if progress is not None and progress.active_unlocks:
                    parts.append(
                        f"If you keep tying that strength into unlocks like {progress.active_unlocks[0]}, it should turn into a much more rounded progression account instead of a narrow stat stack."
                    )
                return " ".join(parts)

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"This account is starting to look like it wants to grow around {top_skill_name}. "
                    "The next question is whether you connect that to unlocks and utility, or let it stay isolated as one strong stat."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what playstyle does this account naturally support",
                "what playstyle does my account naturally support",
                "what does this account naturally support",
                "what style of play does this account fit",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "This account naturally supports combat-forward progression right now. "
                        "Your combat lane already has enough traction that boss prep, quest unlocks, and gear improvements should feel more natural than forcing a pure skilling focus."
                    )
                if strongest_label == "Gathering":
                    return (
                        "This account naturally supports resource-driven progression right now. "
                        "Gathering, passive profit, and utility unlocks should feel smoother than trying to brute-force high-friction combat jumps."
                    )
                if strongest_label == "Artisan":
                    return (
                        "This account naturally supports a flexible skilling-and-upkeep style right now. "
                        "You have enough artisan traction that account polish, utility, and low-friction progression should feel better than a narrow boss rush."
                    )
                if strongest_label == "Utility":
                    return (
                        "This account naturally supports utility-first progression right now. "
                        "Movement, unlock cleanup, and quality-of-life upgrades should pay off more cleanly than forcing another isolated stat push."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"This account naturally wants to play around {top_skill_name.lower()} right now. "
                    "That does not lock you in, but it is the lane where progress should feel the least forced."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what content does this account look built for",
                "what content does my account look built for",
                "what kind of content is this account built for",
                "what content am i most built for right now",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    parts = [
                        "Right now this account looks most built for combat-adjacent content."
                    ]
                    if progress is not None and progress.active_unlocks:
                        parts.append(
                            f"The biggest upgrade path is turning that into cleaner unlock-backed content through work like {progress.active_unlocks[0]}."
                        )
                    else:
                        parts.append(
                            "That means quest unlocks, boss prep, and gear progression should fit more naturally than a pure skilling detour."
                        )
                    return " ".join(parts)
                if strongest_label == "Gathering":
                    return (
                        "Right now this account looks most built for gathering-heavy and low-friction progression content. "
                        "Resource loops, passive profit, and utility unlocks should fit more naturally than forcing harder combat content too early."
                    )
                if strongest_label == "Artisan":
                    return (
                        "Right now this account looks most built for account-development content. "
                        "Skilling support work, unlock cleanup, and prep-heavy progression should fit better than jumping straight into high-friction bossing."
                    )
                if strongest_label == "Utility":
                    return (
                        "Right now this account looks most built for utility-driven content. "
                        "Travel unlocks, diary-style cleanup, and account-enabling progression should pay off more cleanly than chasing isolated XP."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"This account looks most built for content that cashes in your {top_skill_name.lower()} strength. "
                    "The next win is pairing that with the right unlock or route so it turns into broader account value."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of player would enjoy this account",
                "who would enjoy playing this account",
                "what kind of player is this account good for",
                "what type of player would like this account",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "A player who likes active progression, quest unlocks, and combat payoff would probably enjoy this account most right now. "
                        "It already has enough combat traction that pushing into boss prep, gear progression, and combat utility should feel rewarding instead of forced."
                    )
                if strongest_label == "Gathering":
                    return (
                        "A player who likes relaxed progress, passive profit, and steady skilling loops would probably enjoy this account most right now. "
                        "It looks best suited to low-friction account growth rather than forcing high-pressure combat jumps."
                    )
                if strongest_label == "Artisan":
                    return (
                        "A player who likes building the account up methodically would probably enjoy this account most right now. "
                        "It fits someone who enjoys prep work, support skills, and turning quiet progress into stronger future routes."
                    )
                if strongest_label == "Utility":
                    return (
                        "A player who likes unlocking convenience and account quality-of-life would probably enjoy this account most right now. "
                        "It looks best when treated like an account-enabling project instead of a pure XP sprint."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"A player who likes leaning into {top_skill_name.lower()} would probably enjoy this account most right now. "
                    "That is the lane where the account already has the most natural traction."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what content is safest to learn on this account",
                "what should i learn first on this account",
                "what content would be safest to learn right now",
                "what content is safest to practice on this account",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The safest thing to learn on this account right now is lower-friction combat progression. "
                        "You already have enough combat traction that quest-backed combat content, easier boss prep, and gear cleanup should teach useful habits without feeling brutally punishing."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The safest thing to learn on this account right now is relaxed skilling and profit loops. "
                        "That gives you repetition, account stability, and momentum without forcing hard unlock checks too early."
                    )
                if strongest_category[0].title() in {"Artisan", "Utility"}:
                    return (
                        "The safest thing to learn on this account right now is utility and account-enabling progression. "
                        "Unlock cleanup, travel prep, and low-friction support work should teach the shape of the account without demanding a high-risk push."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The safest thing to learn on this account right now is content built around your {top_skill_name.lower()} strength. "
                    "That is where the account already has enough traction to make learning feel forgiving instead of punishing."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress loop fits this account best",
                "what progress loop fits this account best",
                "what kind of loop should i be doing on this account",
                "what sort of day to day loop fits this account best",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The best progress loop for this account right now is combat-forward with support cleanup around it. "
                        "Think combat gains, then unlock cleanup, then gear or route improvements that let the next combat push pay off harder."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The best progress loop for this account right now is gather, bank value, and unlock. "
                        "That kind of steady loop should keep building account value without forcing high-friction jumps before the account is ready."
                    )
                if strongest_label == "Artisan":
                    return (
                        "The best progress loop for this account right now is support-skill improvement followed by utility cleanup. "
                        "That should keep turning quiet account polish into stronger future routes."
                    )
                if strongest_label == "Utility":
                    return (
                        "The best progress loop for this account right now is unlock, route, and capitalize. "
                        "This account should benefit most from opening better movement and account utility, then cashing that into broader progress."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The loop that fits this account best right now is one that repeatedly cashes in your {top_skill_name.lower()} strength and then turns it into a broader unlock or money step. "
                    "That should feel much better than treating every session like a disconnected grind."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account feel smoother to play",
                "what would make the account feel smoother to play",
                "what would make this account feel better to play",
                "what would make this account less awkward to play",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The thing most likely to make this account feel smoother to play is clearing support friction like {unlock_label}. "
                    "Those kinds of unlocks remove awkward routing, reduce dead time, and make the rest of the account's strengths easier to use."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make this account feel smoother to play is shoring up {weakest_label}. "
                    "Right now that softer lane is where the account is most likely to feel clunky or incomplete."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The smoothest improvement is making your {strongest_label.lower()} lane easier to cash in consistently. "
                    "That should make the account feel better session to session than another isolated stat push."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account feel more rewarding to play",
                "what would make the account more rewarding to play",
                "what would make this account feel more satisfying to play",
                "what would make this account feel better to log into",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make this account feel more rewarding to play is closing a leverage point like {unlock_label}. "
                    "That kind of unlock usually turns ordinary sessions into ones where more of the account suddenly starts paying you back."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"This account would feel more rewarding to play if you connected your stronger {strongest_label.lower()} lane to cleanup in {weakest_label.lower()}. "
                    "That is the kind of bridge that makes progress feel cohesive instead of split between strong and weak parts of the account."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"This account would feel more rewarding to play if you kept cashing in your {strongest_label.lower()} lane in more practical ways. "
                    "The goal is not just more XP there, but more visible account value from the strength you already have."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of session fits this account best tonight",
                "what session fits this account best tonight",
                "what kind of session should i play tonight on this account",
                "what type of session fits this account tonight",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The best session for this account tonight is a combat-forward session with one practical support cleanup step around it. "
                        "That should feel more rewarding than splitting your time across unrelated account chores."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The best session for this account tonight is a relaxed gather-and-bank-value session with one small utility step tucked into it. "
                        "That suits the account better than forcing a high-friction push when its natural value is steadier."
                    )
                if strongest_label == "Artisan":
                    return (
                        "The best session for this account tonight is a quiet account-building session. "
                        "A little support-skill progress followed by one clean utility or unlock step should fit this account better than chasing a flashy spike."
                    )
                if strongest_label == "Utility":
                    return (
                        "The best session for this account tonight is an unlock-and-capitalize session. "
                        "Use the first part of the session to reduce friction, then spend the rest actually enjoying the space that opens up."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The best session for this account tonight is one that leans into your {top_skill_name.lower()} strength, then ends with one support step that makes tomorrow's session better. "
                    "That pattern should fit this account better than a scattered grind."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of win would make me want to log in again tomorrow",
                "what win would make me want to log in again tomorrow",
                "what kind of win would make this account feel worth logging into again tomorrow",
                "what win would make tomorrow feel worth it",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of win that would make this account feel worth logging into again tomorrow is clearing something like {unlock_label}. "
                    "That gives you a visible payoff tonight and also leaves the account in a clearly better shape for the next session."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The best kind of win here is a bridge win: use your stronger {strongest_label.lower()} lane to clean up something in {weakest_label.lower()}. "
                    "That kind of session usually leaves the account feeling more open tomorrow instead of just a little higher in one stat."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The best win here is one that turns your {strongest_label.lower()} strength into visible account value. "
                    "That is the kind of payoff most likely to make you want to come back tomorrow instead of feeling like you just banked another isolated level."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make tomorrow's session better",
                "what would make tomorrows session better",
                "what should i do tonight to make tomorrow better",
                "what would set up tomorrow's session best",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make tomorrow's session better is clearing support friction like {unlock_label} tonight. "
                    "That kind of setup work tends to make the next session feel much cleaner, because more of the account becomes immediately usable."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make tomorrow's session better is cleaning up some of the friction in {weakest_label.lower()} tonight. "
                    "That should leave the account in a shape where tomorrow's progress feels easier to cash in."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What would make tomorrow's session better is setting up a cleaner payoff for your {strongest_label.lower()} lane tonight. "
                    "A small support step now should make tomorrow feel much less scattered."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of session would build confidence on this account",
                "what session would build confidence on this account",
                "what would build confidence on this account right now",
                "what kind of session would help me feel more confident on this account",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The kind of session that would build confidence on this account right now is a combat-forward session with one controlled support step around it. "
                        "That should let you use the account's strongest lane in a way that feels reliable instead of overreaching."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The kind of session that would build confidence on this account right now is a low-friction skilling or profit session. "
                        "That should reinforce that the account can still produce real progress without forcing an awkward jump."
                    )
                if strongest_label == "Artisan":
                    return (
                        "The kind of session that would build confidence on this account right now is a clean account-building session. "
                        "A little support-skill progress plus one visible payoff should help the account feel steady and dependable."
                    )
                if strongest_label == "Utility":
                    return (
                        "The kind of session that would build confidence on this account right now is an unlock cleanup session. "
                        "Utility progress tends to make the next few sessions feel more trustworthy because the account opens up instead of staying awkward."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The best confidence-building session right now is one built around your {top_skill_name.lower()} strength with one clean support follow-through after it. "
                    "That should make the account feel more stable instead of more scattered."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what habit would make this account easier to maintain",
                "what habit would make the account easier to maintain",
                "what habit fits this account best over time",
                "what recurring habit would help this account most",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The habit that would make this account easier to maintain is keeping one recurring support cleanup lane like {unlock_label} alive alongside your main progress. "
                    "That stops the account from feeling good in one area while quietly getting more awkward everywhere else."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The best habit for this account is to keep your {strongest_label.lower()} lane tied to one small utility or cleanup step every session. "
                    "That makes the account easier to maintain because progress stays connected instead of drifting into isolated wins."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"A useful maintenance habit for this account is touching {weakest_label.lower()} regularly instead of letting it become a neglected liability. "
                    "That kind of consistency usually makes the whole account feel easier to live with."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would keep this account from feeling stale",
                "how do i keep this account from feeling stale",
                "what would stop this account from feeling stale",
                "what keeps this account interesting right now",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would keep this account from feeling stale is mixing your strongest lane with live unlock work like {unlock_label}. "
                    "That gives each session a visible reason to matter, instead of just repeating the same isolated progress loop."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The best way to keep this account from feeling stale is to keep rotating value between your stronger {strongest_label.lower()} lane and cleanup in {weakest_label.lower()}. "
                    "That kind of back-and-forth makes the account feel alive instead of overfarmed in one direction."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What keeps this account interesting right now is finding fresh ways to cash in your {strongest_label.lower()} lane. "
                    "The point is not more repetition in the same spot, but turning that strength into new account value."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account easier to return to after a break",
                "what would make the account easier to return to after a break",
                "how do i make this account easier to come back to after a break",
                "what setup would make this account easier to pick back up later",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make this account easier to return to after a break is clearing support friction like {unlock_label} before you stop. "
                    "That leaves the account in a cleaner, more open state instead of one where the next login starts with confusion and setup work."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make this account easier to return to after a break is tidying up some of the drag in {weakest_label.lower()} first. "
                    "That way the next time you come back, the account should feel usable instead of immediately awkward."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What would make this account easier to return to after a break is ending on a clean payoff in your {strongest_label.lower()} lane, not in the middle of scattered unfinished work. "
                    "That gives your future self a clearer on-ramp."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what should i preserve about this account right now",
                "what should i protect about this account right now",
                "what should i be careful not to lose on this account",
                "what is worth preserving on this account right now",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What is most worth preserving right now is the traction in your {strongest_label.lower()} lane. "
                    "Whatever else you change, try not to let the account drift so far away from that strength that it stops paying you back."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What is worth preserving right now is the live value behind {unlock_label}. "
                    "You do not want that thread to go cold if it is the thing making the rest of the account easier to use."
                )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"What is most worth preserving right now is your traction in {top_skill_name.lower()}. "
                    "That is one of the clearest places where the account already feels like it has a real identity."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account feel more coherent",
                "how do i make this account feel more coherent",
                "what would make the account feel more coherent",
                "what would make this account feel less fragmented",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make this account feel more coherent is linking your stronger {strongest_label.lower()} lane to cleanup in {weakest_label.lower()}. "
                    "That kind of bridge work makes the account feel like one connected progression path instead of a stack of unrelated wins."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make this account feel more coherent is resolving support friction like {unlock_label}. "
                    "That kind of unlock often turns scattered progress into something that feels like it belongs to the same account story."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What would make this account feel more coherent is cashing in your {strongest_label.lower()} strength through a more practical follow-through step. "
                    "That keeps the account from feeling like a set of disconnected stats."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what part of the account needs protecting from drift",
                "what part of this account needs protecting from drift",
                "where is this account at risk of drifting",
                "what should i protect from drift on this account",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The part of the account that needs the most protection from drift is your {strongest_label.lower()} lane, especially if it keeps outrunning support in {weakest_label.lower()}. "
                    "That is usually where an account starts to feel powerful on paper but awkward in practice."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The thing I would protect from drift right now is the value behind {unlock_label}. "
                    "If you leave that thread half-converted for too long, the account starts losing momentum it already paid to build."
                )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The thing most at risk of drift right now is the value in your {top_skill_name.lower()} progress. "
                    "You probably want one practical follow-through step so it keeps feeling like real account strength instead of an isolated number."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of session would reinforce this account's identity",
                "what kind of session would reinforce the account's identity",
                "what session would reinforce this account's identity",
                "what kind of session would make this account feel more like itself",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The kind of session that would reinforce this account's identity right now is a combat-centered one with one supporting cleanup attached. "
                        "That keeps the account feeling like a real fighter instead of a pile of unrelated side progress."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The kind of session that would reinforce this account's identity right now is a steady gather-profit-improve loop. "
                        "That keeps the account feeling grounded in useful momentum instead of scattered between too many unrelated pushes."
                    )
                if strongest_label == "Artisan":
                    return (
                        "The kind of session that would reinforce this account's identity right now is a support-and-utility session with one visible payoff at the end. "
                        "That makes the account feel deliberately built, not just incremented."
                    )

                return (
                    f"The kind of session that would reinforce this account's identity right now is one that leans into your {strongest_label.lower()} strength and turns it into something immediately usable. "
                    "That is how you keep the account feeling like it knows what it wants to be."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of session that would reinforce this account's identity right now is one that finishes off a live utility thread like {unlock_label}. "
                    "That sort of cleanup turns account potential into something you can actually feel in play."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one cleanup task would make everything feel more connected",
                "what cleanup task would make everything feel more connected",
                "what one cleanup task would tie this account together",
                "what cleanup would make this account feel more connected",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one cleanup task most likely to make everything feel more connected is finishing the support around {unlock_label}. "
                    "That kind of bridge work often turns several scattered strengths into one account that actually flows."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The one cleanup task most likely to make this account feel more connected is shoring up the drag in {weakest_label.lower()}. "
                    "That is usually the quiet piece that keeps stronger lanes from linking together cleanly."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The one cleanup task most likely to make everything feel more connected is finding a practical payoff for your {strongest_label.lower()} strength. "
                    "That stops the account from feeling like it has good stats but no connective tissue."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account feel more resilient",
                "how do i make this account feel more resilient",
                "what would make the account feel more resilient",
                "what would make this account more resilient",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make this account feel more resilient is locking in practical support around {unlock_label}. "
                    "That kind of utility makes the account easier to recover, easier to route, and less dependent on perfect motivation."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make this account feel more resilient is shoring up the drag in {weakest_label.lower()}. "
                    "That is usually the part that makes the account feel brittle when you try to pivot or come back after a few days away."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What would make this account feel more resilient is giving your {strongest_label.lower()} strength one cleaner support layer under it. "
                    "That turns a good lane into something the account can keep cashing in without feeling fragile."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of play pattern is likely to burn out this account",
                "what play pattern is likely to burn out this account",
                "what kind of play pattern would burn out this account",
                "what would burn out this account",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The play pattern most likely to burn this account out is overfarming {strongest_label.lower()} while ignoring the drag in {weakest_label.lower()}. "
                    "That usually makes progress look good on paper but feel worse and worse to actually play."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The play pattern most likely to burn this account out is grinding past live utility friction like {unlock_label} instead of resolving it. "
                    "That kind of avoidance tends to make every later session feel heavier than it should."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The play pattern most likely to burn this account out is leaning too hard on {strongest_label.lower()} without enough variety or payoff conversion. "
                    "That is how an account with real strengths starts to feel stale anyway."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one habit would keep progress compounding without making the game feel like work",
                "what habit would keep progress compounding without making the game feel like work",
                "what one habit would keep this account compounding",
                "what habit would keep this account growing without burnout",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one habit most likely to keep progress compounding without making the game feel like work is pairing each session with one small piece of support cleanup around {unlock_label}. "
                    "That keeps momentum stacking quietly instead of forcing every login to be a major push."
                )

            if weakest_category is not None and strongest_category is not None and weakest_category != strongest_category:
                weakest_label = weakest_category[0].title()
                strongest_label = strongest_category[0].title()
                return (
                    f"The one habit most likely to keep this account compounding is letting each session invest a little into {weakest_label.lower()} before cashing out through {strongest_label.lower()}. "
                    "That kind of loop builds the account without making progress feel like maintenance homework."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The one habit most likely to keep this account compounding is ending most sessions with one practical payoff in your {strongest_label.lower()} lane. "
                    "That keeps progress feeling real enough to come back for, not abstract enough to postpone."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of goal would fit this account without distorting it",
                "what goal would fit this account without distorting it",
                "what kind of goal fits this account without distorting it",
                "what kind of goal fits this account naturally right now",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The kind of goal that fits this account without distorting it is one that turns combat strength into a cleaner unlock or durable routine, not one that asks you to abandon the lane the account already wants to grow through. "
                        "That usually keeps progress feeling aligned instead of forced."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The kind of goal that fits this account without distorting it is one that turns gathering traction into profit, utility, or a useful unlock, not one that drags the whole account into a lane it has not earned yet. "
                        "That tends to preserve momentum without flattening the account's identity."
                    )
                if strongest_label == "Artisan":
                    return (
                        "The kind of goal that fits this account without distorting it is one that rewards support and utility cleanup with a visible payoff. "
                        "That keeps the account feeling deliberately shaped instead of redirected by a flashy but mismatched target."
                    )

                return (
                    f"The kind of goal that fits this account without distorting it is one that lets your {strongest_label.lower()} strength open something useful next. "
                    "That keeps the goal in step with the account instead of making the account twist itself around the goal."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of goal that fits this account naturally right now is one that converts live support work like {unlock_label} into a cleaner future lane. "
                    "That gives you a goal without making the account feel like it has to become something else first."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of upgrade would feel exciting instead of obligatory",
                "what upgrade would feel exciting instead of obligatory",
                "what kind of upgrade would feel exciting right now",
                "what upgrade would feel exciting right now",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The upgrade most likely to feel exciting instead of obligatory right now is one that cashes in the utility behind {unlock_label}. "
                    "Those kinds of upgrades usually change how the account plays, not just what number it has."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The upgrade most likely to feel exciting instead of obligatory right now is one that immediately amplifies your {strongest_label.lower()} lane in a noticeable way. "
                    "You want an upgrade that changes the feel of the account, not one that only looks responsible on a checklist."
                )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The kind of upgrade that would feel exciting right now is one that turns your {top_skill_name.lower()} traction into something more usable or more rewarding. "
                    "That is usually more motivating than another invisible layer of preparation."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would keep this account feeling alive over the next week",
                "what progress would keep this account feeling alive over the next week",
                "what would keep this account feeling alive over the next week",
                "what would keep this account alive over the next week",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would keep this account feeling alive over the next week is progress that keeps turning a live thread like {unlock_label} into something easier to use day after day. "
                    "That creates the feeling that the account is opening up, not just inching forward."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would keep this account feeling alive over the next week is a back-and-forth between your stronger {strongest_label.lower()} lane and some cleanup in {weakest_label.lower()}. "
                    "That gives you visible momentum without letting the account drift into repetition."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would keep this account feeling alive over the next week is progress that keeps paying off inside your {strongest_label.lower()} lane in a visible way. "
                    "That helps each login feel like continuation, not reset."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of milestone would feel genuinely worth chasing next",
                "what milestone would feel genuinely worth chasing next",
                "what kind of milestone would feel worth chasing next",
                "what milestone would actually feel worth chasing next",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of milestone that would feel genuinely worth chasing next is one that turns a live unlock thread like {unlock_label} into a real shift in how the account moves. "
                    "That gives you a milestone that feels earned in play, not just impressive on paper."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of milestone that would feel worth chasing next is one that lets your stronger {strongest_label.lower()} lane finally cash out through cleanup in {weakest_label.lower()}. "
                    "That usually feels better than a milestone that ignores the account's current shape."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of milestone that would feel worth chasing next is one that makes your {strongest_label.lower()} strength more visible and more usable. "
                    "You want something that changes the feel of the account, not just the wording of the next target."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of grind is too dry for this account right now",
                "what grind is too dry for this account right now",
                "what kind of grind would be too dry for this account",
                "what grind would be too dry for this account",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of grind that is probably too dry for this account right now is one that keeps farming {weakest_label.lower()} in isolation while your more live {strongest_label.lower()} lane sits waiting for a cleaner payoff. "
                    "That is the kind of work that can feel responsible without feeling rewarding."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of grind that is too dry for this account right now is one that keeps ignoring utility friction like {unlock_label} while asking you to stack more raw effort on top. "
                    "That tends to make the account feel heavier, not more alive."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of grind that is too dry for this account right now is one that overcommits to {weakest_label.lower()} without any visible payoff nearby. "
                    "You probably want progress that creates some immediate feel before you ask the account to eat more pure setup."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would make the next login feel obvious instead of uncertain",
                "what progress would make the next login feel obvious instead of uncertain",
                "what would make the next login feel obvious instead of uncertain",
                "what would make my next login feel obvious",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would make the next login feel obvious is progress that leaves a live utility thread like {unlock_label} in a cleaner state than it started. "
                    "That gives your future self a clear re-entry point instead of another vague pile of things to maybe do."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would make the next login feel obvious is progress that bridges your stronger {strongest_label.lower()} lane into a little cleanup in {weakest_label.lower()}. "
                    "That leaves a clean continuation path instead of a session that ends with the account feeling split."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would make the next login feel obvious is progress that ends with one visible payoff inside your {strongest_label.lower()} lane. "
                    "That way the next session starts with continuation, not re-evaluation."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account feel more premium or unlocked",
                "what would make this account feel more premium",
                "what would make this account feel more unlocked",
                "what would make this account feel more complete and premium",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make this account feel more premium or unlocked right now is turning support friction like {unlock_label} into a real convenience win. "
                    "That kind of utility tends to make the whole account feel like it has more room to breathe instead of more chores attached to it."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make this account feel more premium right now is giving your stronger {strongest_label.lower()} lane cleaner support in {weakest_label.lower()}. "
                    "That usually makes the account feel more complete and less like a powerful core wrapped in avoidable friction."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What would make this account feel more premium right now is a step that turns your {strongest_label.lower()} strength into something more usable every session. "
                    "You want the account to feel smoother and more unlocked, not just more leveled."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of task is secretly too early even if it looks tempting",
                "what task is secretly too early even if it looks tempting",
                "what looks tempting but is too early right now",
                "what am i tempted to do too early right now",
            )
        ):
            if weakest_category is not None and strongest_category is not None and weakest_category != strongest_category:
                weakest_label = weakest_category[0].title()
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of task that is secretly too early right now is one that assumes your {weakest_label.lower()} support is already sturdy enough just because your {strongest_label.lower()} lane looks strong. "
                    "That is the kind of temptation that makes an account feel more impressive than ready."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What looks tempting but is probably too early right now is any push that skips past live support friction like {unlock_label}. "
                    "If you bypass that kind of setup too long, the account starts borrowing against comfort it has not actually earned yet."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What is most likely too early right now is anything that asks your {strongest_label.lower()} strength to carry a lane it has not been properly connected into yet. "
                    "That usually feels exciting for a session or two and then starts to feel awkward."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would make this account feel less awkward and more complete",
                "what progress would make this account feel less awkward and more complete",
                "what would make this account feel less awkward and more complete",
                "what would make this account feel less awkward",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would make this account feel less awkward and more complete is progress that resolves support friction like {unlock_label} in a visible way. "
                    "That usually removes the little points of resistance that stop a decent account from feeling good to actually use."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel less awkward is progress that lets your stronger {strongest_label.lower()} lane finally run on top of less drag in {weakest_label.lower()}. "
                    "That is often the difference between an account that looks good and one that actually feels complete."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel less awkward is progress that cleans up the friction in {weakest_label.lower()}. "
                    "That kind of cleanup tends to make the rest of the account feel more finished without needing a dramatic leap."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would make this account feel more prestigious",
                "what progress would make this account feel more prestigious",
                "what would make this account feel more prestigious",
                "what would make this account feel more distinguished",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would make this account feel more prestigious right now is progress that turns live utility work like {unlock_label} into something that is both visible and useful. "
                    "That kind of prestige tends to feel better than a hollow flex because it changes what the account can actually do."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel more prestigious is progress that lets your stronger {strongest_label.lower()} lane stand on top of cleaner {weakest_label.lower()} support. "
                    "That gives the account a more finished kind of status, not just a louder one."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel more prestigious is progress that turns your {strongest_label.lower()} strength into a more complete expression of the account. "
                    "Prestige usually lands best when the account feels polished, not just inflated."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of task is flashy but low real value right now",
                "what task is flashy but low real value right now",
                "what looks flashy but is low real value right now",
                "what flashy thing is low value for this account right now",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of task that is flashy but low real value right now is one that tries to cash in your {strongest_label.lower()} lane without respecting the drag still sitting in {weakest_label.lower()}. "
                    "That is the kind of thing that looks exciting in the short term but does not actually stabilize the account."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The flashy but low-value move right now is anything that skips over live utility friction like {unlock_label} in favor of something louder. "
                    "If the account still has that kind of loose support thread, the flash usually lands thinner than it looks."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of task that is flashy but low real value right now is one that avoids the awkwardness still sitting in {weakest_label.lower()} just because it is less glamorous to fix. "
                    "That usually creates more spectacle than progress."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one improvement would make the account feel most transformed",
                "what one improvement would make this account feel most transformed",
                "what one improvement would transform this account the most",
                "what would transform this account the most right now",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one improvement most likely to make this account feel transformed right now is converting support friction like {unlock_label} into a real convenience unlock. "
                    "That kind of change tends to touch every later session instead of only one number on the account."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The one improvement most likely to transform this account is giving your stronger {strongest_label.lower()} lane cleaner footing through {weakest_label.lower()} cleanup. "
                    "That usually changes how the whole account feels, not just how one part of it performs."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The one improvement most likely to transform this account is one that makes your {strongest_label.lower()} lane more usable every time you log in. "
                    "That kind of transformation feels bigger because it changes rhythm, not just totals."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would make this account feel more self sufficient",
                "what progress would make this account feel more self sufficient",
                "what would make this account feel more self sufficient",
                "what would make this account more self sufficient",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would make this account feel more self-sufficient right now is progress that turns live support friction like {unlock_label} into something you can rely on every session. "
                    "That kind of utility lowers dependence on workarounds and makes the account feel more capable on its own."
                )

            if weakest_category is not None and strongest_category is not None and weakest_category != strongest_category:
                weakest_label = weakest_category[0].title()
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel more self-sufficient is progress that removes the drag in {weakest_label.lower()} underneath your stronger {strongest_label.lower()} lane. "
                    "That is usually what turns momentum into something durable instead of fragile."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel more self-sufficient is progress that makes your {strongest_label.lower()} strength easier to cash in without extra setup every time. "
                    "That is how an account starts to feel dependable instead of merely promising."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of habit would make the account feel more premium over a month",
                "what habit would make the account feel more premium over a month",
                "what kind of habit would make this account feel more premium over a month",
                "what habit would make this account feel more premium over time",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of habit that would make this account feel more premium over a month is consistently converting one live support thread like {unlock_label} into cleaner convenience. "
                    "That kind of steady utility work compounds into an account that feels smoother and more complete, not just more leveled."
                )

            if weakest_category is not None and strongest_category is not None and weakest_category != strongest_category:
                weakest_label = weakest_category[0].title()
                strongest_label = strongest_category[0].title()
                return (
                    f"The habit most likely to make this account feel more premium over time is a routine that steadily patches {weakest_label.lower()} while continuing to cash out through {strongest_label.lower()}. "
                    "That is the kind of month-long rhythm that makes the account feel polished instead of lopsided."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The habit most likely to make this account feel more premium over time is one that keeps turning your {strongest_label.lower()} strength into cleaner session-to-session usability. "
                    "That is the difference between an account that is high level and one that feels finished."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one unlock would make the account feel dramatically more open",
                "what unlock would make the account feel dramatically more open",
                "what one unlock would make this account feel dramatically more open",
                "what unlock would make this account feel much more open",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one unlock most likely to make this account feel dramatically more open right now is the one that resolves support friction around {unlock_label}. "
                    "Unlocks like that tend to widen the whole account instead of only one corner of it."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The unlock most likely to make this account feel more open is one that relieves the drag sitting in {weakest_label.lower()}. "
                    "That kind of unlock usually creates more room than another isolated push in a lane that is already doing fine."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The unlock most likely to make this account feel more open is one that lets your {strongest_label.lower()} strength connect into more of the game. "
                    "That is usually where an account starts to feel wider, not just stronger."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would make the account feel more elite without becoming joyless",
                "what progress would make the account feel more elite without becoming joyless",
                "what would make this account feel more elite without becoming joyless",
                "what would make this account feel elite without becoming joyless",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would make this account feel more elite without becoming joyless is progress that turns support friction like {unlock_label} into cleaner high-value access. "
                    "That is the sort of prestige that improves the whole account instead of just asking for more strain."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel more elite without becoming joyless is progress that lets your stronger {strongest_label.lower()} lane stand on top of cleaner {weakest_label.lower()} support. "
                    "That usually gives the account a sharper feel without turning every session into punishment."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel more elite without becoming joyless is progress that makes your {strongest_label.lower()} strength more polished and more practical at the same time. "
                    "That tends to feel better than prestige that only makes the account more demanding."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of habit would quietly waste the account's potential",
                "what habit would quietly waste the account's potential",
                "what habit would quietly waste this account's potential",
                "what habit would quietly waste this account",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The habit most likely to quietly waste this account's potential is overleaning on {strongest_label.lower()} while always postponing the cleanup still sitting in {weakest_label.lower()}. "
                    "That is how a strong account ends up feeling permanently almost-ready."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The habit most likely to quietly waste this account's potential is treating live support work like {unlock_label} as something to maybe circle back to later. "
                    "That kind of delay is subtle, but it keeps the account from ever fully cashing in its own momentum."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The habit most likely to quietly waste this account is always choosing visible progress over friction cleanup in {weakest_label.lower()}. "
                    "That usually feels fine in the moment and expensive over time."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one improvement would make the account feel dramatically more future proof",
                "what improvement would make the account feel dramatically more future proof",
                "what one improvement would make this account feel dramatically more future proof",
                "what would make this account feel more future proof",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one improvement most likely to make this account feel dramatically more future-proof is one that turns support friction like {unlock_label} into a durable convenience layer. "
                    "That kind of change pays you back in every later plan instead of only in the current one."
                )

            if weakest_category is not None and strongest_category is not None and weakest_category != strongest_category:
                weakest_label = weakest_category[0].title()
                strongest_label = strongest_category[0].title()
                return (
                    f"The one improvement most likely to make this account feel more future-proof is cleaning up {weakest_label.lower()} under your stronger {strongest_label.lower()} lane. "
                    "That usually gives the account a sturdier foundation for whatever direction you want to take later."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The one improvement most likely to make this account feel more future-proof is one that makes your {strongest_label.lower()} lane easier to reuse across more of the game. "
                    "That kind of improvement ages better than a narrow spike."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one change would reduce friction across the whole account",
                "what change would reduce friction across the whole account",
                "what one change would reduce friction across this whole account",
                "what would reduce friction across the whole account",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one change most likely to reduce friction across the whole account is turning support friction like {unlock_label} into a real convenience layer. "
                    "That kind of change tends to make every later session easier, not just the next one."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The one change most likely to reduce friction across the whole account is cleaning up the drag in {weakest_label.lower()}. "
                    "That is usually the small ugly layer that keeps a decent account from feeling smooth everywhere else."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The one change most likely to reduce friction across the whole account is giving your {strongest_label.lower()} strength a cleaner support path. "
                    "That way the lane you already trust stops demanding extra setup every time you want to use it."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what part of this account is quietly carrying everything",
                "what part of the account is quietly carrying everything",
                "what part of this account is quietly carrying the account",
                "what part of this account is quietly carrying me",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What is quietly carrying a lot right now is the utility value tied up in {unlock_label}. "
                    "Even if it is not flashy, that kind of support thread often does more for the whole account than another isolated spike."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What is quietly carrying a lot of this account right now is your {strongest_label.lower()} lane. "
                    "That seems to be the part most of the account's useful momentum is leaning on, even if it is not the thing asking for attention the loudest."
                )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"What is quietly carrying a lot right now is your {top_skill_name.lower()} progress. "
                    "It looks like one of the clearest places where the account already has real weight behind it."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what would make this account feel more legendary without becoming tedious",
                "what would make this account feel legendary without becoming tedious",
                "what would make this account feel more legendary without becoming a slog",
                "what would make this account feel legendary without becoming a slog",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What would make this account feel more legendary without becoming tedious is turning a live support thread like {unlock_label} into a real unlock or convenience payoff. "
                    "That kind of progress feels bigger because it widens the account instead of simply asking more from it."
                )

            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"What would make this account feel more legendary without becoming tedious is polishing your stronger {strongest_label.lower()} lane with just enough {weakest_label.lower()} cleanup to let it breathe. "
                    "That tends to create a more heroic-feeling account without pushing you into joyless maintenance."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"What would make this account feel more legendary without becoming tedious is a visible payoff inside your {strongest_label.lower()} lane that changes how the account feels to use. "
                    "That is usually the better kind of prestige: noticeable, but still fun."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what kind of progress would make this account feel calmer and easier to manage",
                "what progress would make this account feel calmer and easier to manage",
                "what would make this account feel calmer and easier to manage",
                "what would make this account feel calmer to manage",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The kind of progress that would make this account feel calmer and easier to manage is progress that resolves support friction like {unlock_label} into something you can trust without thinking about it. "
                    "That kind of cleanup lowers the mental load of every later session."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel calmer is progress that removes the drag still sitting in {weakest_label.lower()}. "
                    "That is usually what turns an account from fiddly into dependable."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The kind of progress that would make this account feel calmer is progress that lets your {strongest_label.lower()} lane run with less setup and less second-guessing. "
                    "That usually does more for account quality than another isolated spike."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what part of this account looks impressive but is doing less than it seems",
                "what part of the account looks impressive but is doing less than it seems",
                "what on this account looks impressive but is not pulling enough weight",
                "what looks impressive on this account but is not carrying enough",
            )
        ):
            if strongest_category is not None and weakest_category is not None and strongest_category != weakest_category:
                strongest_label = strongest_category[0].title()
                weakest_label = weakest_category[0].title()
                return (
                    f"The part of the account that may look more impressive than it is truly carrying right now is your {strongest_label.lower()} lane if it still has unresolved drag in {weakest_label.lower()}. "
                    "That is usually where numbers look good but the account still does not feel fully online."
                )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The part of the account that may be looking more impressive than it is carrying right now is your {top_skill_name.lower()} progress if it has not been converted into broader utility yet. "
                    "A strong number is still better when it unlocks smoother play, not just admiration."
                )

            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"What may be looking more impressive than it is carrying right now is any visible progress that still leaves support work like {unlock_label} unresolved. "
                    "That kind of imbalance often reads stronger than it feels."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what one unlock would make the account feel more effortless day to day",
                "what unlock would make the account feel more effortless day to day",
                "what one unlock would make this account feel more effortless day to day",
                "what unlock would make this account feel more effortless",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The one unlock most likely to make this account feel more effortless day to day is the one that turns support friction like {unlock_label} into a durable convenience. "
                    "Those are the unlocks that quietly improve every session instead of only one lane."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"The unlock most likely to make this account feel more effortless is one that relieves the drag in {weakest_label.lower()}. "
                    "That kind of unlock tends to make the whole account feel lighter, not just stronger."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The unlock most likely to make this account feel more effortless is one that lets your {strongest_label.lower()} lane plug into more of the game with less setup. "
                    "That is usually where everyday quality of life improves the fastest."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what routine fits this account best",
                "what routine should i build around this account",
                "what repeatable should i build around this account",
                "what daily loop fits this account best",
            )
        ):
            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                if strongest_label == "Combat":
                    return (
                        "The routine that fits this account best right now is combat progress anchored by one support cleanup step each session. "
                        "That keeps your strongest lane moving while steadily removing the friction that stops it from paying off harder."
                    )
                if strongest_label == "Gathering":
                    return (
                        "The routine that fits this account best right now is a steady gather-profit-unlock loop. "
                        "That should keep the account feeling productive without demanding a high-pressure goal every time you log in."
                    )
                if strongest_label == "Artisan":
                    return (
                        "The routine that fits this account best right now is quiet account-building: support skills, then utility cleanup, then a small payoff step. "
                        "That pattern should suit this account better than forcing a flashy but unstable route."
                    )
                if strongest_label == "Utility":
                    return (
                        "The routine that fits this account best right now is unlock-first progression. "
                        "Open one more useful route, then spend the rest of the session cashing that convenience into broader account value."
                    )

            if top_skill_name and isinstance(top_skill_level, int):
                return (
                    f"The routine that fits this account best right now is one built around your {top_skill_name.lower()} strength, then a small unlock or utility step after it. "
                    "That should keep progress feeling coherent instead of scattered."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what content is one unlock away from opening up",
                "what is one unlock away from opening up",
                "what content is one unlock away right now",
                "what is almost unlocked for this account",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                if strongest_category is not None:
                    strongest_label = strongest_category[0].title()
                    return (
                        f"The content that feels one unlock away right now is whatever cashes in your {strongest_label.lower()} lane after {unlock_label}. "
                        "That support unlock is the bridge between your current strength and content that will actually start paying it off."
                    )
                return (
                    f"The main thing that looks one unlock away right now is the next route behind {unlock_label}. "
                    "That is the support piece most likely to turn the account's current stats into more usable content."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The content that feels closest to opening up is whatever best cashes in your {strongest_label.lower()} lane. "
                    "You have enough traction there that one good support unlock should noticeably widen the account."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what current strength is being wasted by a missing unlock",
                "what strength is being wasted by a missing unlock",
                "what am i wasting because of a missing unlock",
                "what strength is not paying off because of a missing unlock",
            )
        ):
            if strongest_category is not None and progress is not None and progress.active_unlocks:
                strongest_label = strongest_category[0].title()
                unlock_label = progress.active_unlocks[0]
                return (
                    f"Your stronger {strongest_label} lane is probably being underused because of {unlock_label}. "
                    "That missing unlock is the piece stopping one of your best-developed strengths from paying off as cleanly as it could."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"The strength most at risk of being wasted right now is {strongest_label}. "
                    "It already has traction, so the next question is what support piece or unlock would let it cash out into broader value."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what boring task would create disproportionate future value",
                "what boring task would create the most future value",
                "what boring task is secretly worth doing",
                "what boring task has disproportionate value",
            )
        ):
            if progress is not None and progress.active_unlocks:
                unlock_label = progress.active_unlocks[0]
                return (
                    f"The boring task with disproportionate future value is probably {unlock_label}. "
                    "It may not feel flashy, but jobs like that usually remove friction across several future routes at once."
                )

            if weakest_category is not None:
                weakest_label = weakest_category[0].title()
                return (
                    f"A boring but valuable task right now is cleaning up {weakest_label}. "
                    "Those quieter cleanup pushes often create more future value than another flashy level in a lane that's already comfortable."
                )

            return None

        if any(
            phrase in normalized
            for phrase in (
                "what lane is closest to compounding if i bridge one missing piece",
                "what is closest to compounding if i bridge one missing piece",
                "what lane is closest to compounding right now",
                "what is one missing piece away from compounding",
            )
        ):
            if strongest_category is not None and progress is not None and progress.active_unlocks:
                strongest_label = strongest_category[0].title()
                unlock_label = progress.active_unlocks[0]
                return (
                    f"{strongest_label} is the lane closest to compounding if you bridge one missing piece like {unlock_label}. "
                    "You already have traction there, so one support unlock can turn that strength into a much broader payoff."
                )

            if strongest_category is not None:
                strongest_label = strongest_category[0].title()
                return (
                    f"{strongest_label} is the lane closest to compounding right now. "
                    "It already has enough traction that one clean support step should make the rest of the account benefit from it more quickly."
                )

            return None

        return None

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

    def _snapshot_delta_bits(
        self,
        *,
        latest_snapshot: AccountSnapshot,
        previous_snapshot: AccountSnapshot,
    ) -> tuple[int, int, list[str]]:
        latest_summary = latest_snapshot.summary or {}
        previous_summary = previous_snapshot.summary or {}
        overall_delta = int(latest_summary.get("overall_level", 0) or 0) - int(
            previous_summary.get("overall_level", 0) or 0
        )
        combat_delta = int(latest_summary.get("combat_level", 0) or 0) - int(
            previous_summary.get("combat_level", 0) or 0
        )
        improved_skills = self._collect_improved_skills(latest_snapshot, previous_snapshot)
        return overall_delta, combat_delta, improved_skills

    def _planner_focus_label(self, recommendations: dict[str, object]) -> str:
        skill = recommendations.get("recommended_skill", {})
        quest = recommendations.get("recommended_quest", {})
        skill_name = str(skill.get("skill", "")).replace("_", " ").title() if isinstance(skill, dict) else ""
        method = str(skill.get("method", "")) if isinstance(skill, dict) else ""
        quest_name = str(quest.get("name", "")) if isinstance(quest, dict) else ""
        if skill_name and method and quest_name:
            return f"{skill_name} with {method}, then {quest_name}"
        if skill_name and method:
            return f"{skill_name} with {method}"
        if quest_name:
            return quest_name
        return "the same core progression lane"

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

    def _detect_skill_names(
        self,
        normalized_message: str,
        skills: dict[str, Any],
    ) -> list[str]:
        canonical_skills = [
            "attack",
            "defence",
            "strength",
            "hitpoints",
            "ranged",
            "prayer",
            "magic",
            "cooking",
            "woodcutting",
            "fletching",
            "fishing",
            "firemaking",
            "crafting",
            "smithing",
            "mining",
            "herblore",
            "agility",
            "thieving",
            "slayer",
            "farming",
            "runecraft",
            "hunter",
            "construction",
        ]
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
        found: list[str] = []

        for alias, canonical in aliases.items():
            if alias in normalized_message and canonical not in found:
                found.append(canonical)

        for skill_name in canonical_skills:
            if skill_name == "overall":
                continue
            if skill_name in normalized_message and skill_name not in found:
                found.append(skill_name)

        return found

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

    def _merge_session_state(
        self,
        *,
        existing_state: dict[str, object] | None,
        update: dict[str, object] | None,
    ) -> dict[str, object]:
        merged = dict(existing_state or {})
        for key, value in (update or {}).items():
            if value is None:
                continue
            merged[key] = value
        return merged

    def _build_session_state_update(
        self,
        *,
        message: str,
        session_intent: str | None,
        latest_goal: Goal | None,
        account: Account | None,
    ) -> dict[str, object]:
        focus = self._infer_focus_from_message(message.lower())
        update: dict[str, object] = {
            "last_session_intent": session_intent,
            "last_goal_title": latest_goal.title if latest_goal is not None else None,
        }
        if account is not None:
            update["last_account_rsn"] = account.rsn
        if focus["quest_id"] is not None:
            update["last_quest_id"] = focus["quest_id"]
        if focus["boss_id"] is not None:
            update["last_boss_id"] = focus["boss_id"]
        if focus["money_target"] is not None:
            update["last_money_target"] = focus["money_target"]
        if focus["destination"] is not None:
            update["last_destination"] = focus["destination"]
        if focus["combat_style"] is not None:
            update["last_combat_style"] = focus["combat_style"]
        return update

    def _state_from_planner_recommendations(
        self,
        recommendations: dict[str, object],
    ) -> dict[str, object]:
        skill = recommendations.get("recommended_skill", {})
        quest = recommendations.get("recommended_quest", {})
        teleport = recommendations.get("recommended_teleport", {})
        return {
            "last_recommended_skill": skill.get("skill") if isinstance(skill, dict) else None,
            "last_quest_id": quest.get("id") if isinstance(quest, dict) else None,
            "last_destination": teleport.get("destination") if isinstance(teleport, dict) else None,
            "last_session_intent": "progression",
        }

    def _state_from_next_action(self, top_action) -> dict[str, object]:
        update: dict[str, object] = {
            "last_session_intent": "progression",
            "last_blockers": (top_action.blockers or [])[:3],
            "last_priority_label": top_action.priority,
        }
        if top_action.action_type == "quest":
            target = top_action.target or {}
            update["last_quest_id"] = target.get("quest_id")
        elif top_action.action_type == "skill":
            target = top_action.target or {}
            update["last_recommended_skill"] = target.get("skill")
        elif top_action.action_type == "travel":
            target = top_action.target or {}
            update["last_destination"] = target.get("destination")
        elif top_action.action_type == "gear":
            supporting = top_action.supporting_data or {}
            update["last_combat_style"] = supporting.get("combat_style")
        return update

    def _focus_from_session_state(self, session_state: dict[str, object]) -> dict[str, str | None]:
        return {
            "quest_id": self._state_str(session_state, "last_quest_id"),
            "boss_id": self._state_str(session_state, "last_boss_id"),
            "money_target": self._state_str(session_state, "last_money_target"),
            "destination": self._state_str(session_state, "last_destination"),
            "combat_style": self._state_str(session_state, "last_combat_style"),
        }

    def _state_str(self, session_state: dict[str, object], key: str) -> str | None:
        value = session_state.get(key)
        return value if isinstance(value, str) else None

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

    def _infer_focus_from_message(self, normalized_message: str) -> dict[str, str | None]:
        return {
            "quest_id": self._detect_quest_id(normalized_message),
            "boss_id": boss_advisor_service.detect_boss_id(normalized_message),
            "money_target": self._detect_money_target(normalized_message),
            "destination": self._detect_destination(normalized_message),
            "combat_style": self._detect_combat_style(normalized_message),
        }

    def _infer_session_focus_from_messages(
        self,
        recent_messages: list[tuple[str, str]],
    ) -> dict[str, str | None]:
        for role, content in reversed(recent_messages):
            if role != "user":
                continue
            focus = self._infer_focus_from_message(content.lower())
            if any(value is not None for value in focus.values()):
                return focus
        return {
            "quest_id": None,
            "boss_id": None,
            "money_target": None,
            "destination": None,
            "combat_style": None,
        }

    def _infer_session_intent_from_messages(
        self,
        recent_messages: list[tuple[str, str]],
    ) -> str | None:
        generic_intent: str | None = None
        for role, content in reversed(recent_messages):
            if role != "user":
                continue
            normalized = content.lower()
            if any(token in normalized for token in ("money", "money maker", "profit", "gp")):
                return "profit"
            if any(token in normalized for token in ("teleport", "route", "travel", "get to")):
                return "travel"
            if any(token in normalized for token in ("boss", "jad", "fight caves", "demonic gorillas")):
                return "bossing"
            if any(token in normalized for token in ("quest", "ready for", "missing for", "requirements for")):
                return "questing"
            if any(token in normalized for token in ("gear", "upgrade")):
                return "gearing"
            if any(token in normalized for token in ("skill", "train")):
                return "training"
            if any(token in normalized for token in ("best action", "what next", "work on next", "should i do next")):
                generic_intent = "progression"
        return generic_intent

    def _should_emphasize_goal_context(
        self,
        *,
        message: str,
        session_focus: dict[str, str | None],
        session_intent: str | None,
    ) -> bool:
        normalized = message.lower()
        direct_account_markers = (
            "what is my",
            "what's my",
            "whats my",
            "what are my",
            "how many",
            "do i have",
            "did my",
            "what changed",
            "how do i get to",
            "am i ready",
            "what money maker",
            "what low attention money maker",
            "which money maker",
            "what gear",
            "what unlock",
            "what should i prep",
            "what skill should i train",
            "should i train",
        )
        goal_first_markers = (
            "goal",
            "goal cape",
            "closest to",
            "what should i do next",
            "what should i work on next",
            "next best action",
            "what should be the priority",
            "what would move me closest",
            "what should i focus on",
            "what should i have done",
            "by sunday",
            "this week",
            "this weekend",
            "deprioritize",
            "ignore for now",
            "small win",
            "unblock",
            "blocker",
            "what comes after",
            "before recipe for disaster",
            "worth it",
        )

        if any(marker in normalized for marker in goal_first_markers):
            return True
        if any(marker in normalized for marker in direct_account_markers):
            return False
        if any(value is not None for value in session_focus.values()):
            return session_intent in {"progression", "questing"}
        return session_intent in {"progression", "questing"}

    def _summarize_session_focus(
        self,
        *,
        session_focus: dict[str, str | None],
        latest_goal: Goal | None,
        account: Account | None,
        include_goal: bool,
    ) -> str:
        parts: list[str] = []
        if account is not None:
            parts.append(f"The current account context is {account.rsn}.")
        if session_focus.get("quest_id") is not None:
            quest = quest_service.get_quest(session_focus["quest_id"])
            parts.append(f"This conversation is currently centered on {quest.name}.")
        elif session_focus.get("boss_id") is not None:
            parts.append(f"This conversation is currently centered on {self._boss_label(session_focus['boss_id'])}.")
        elif session_focus.get("money_target") is not None:
            parts.append(f"This conversation is currently centered on {session_focus['money_target']}.")
        elif session_focus.get("destination") is not None:
            parts.append(f"This conversation is currently centered on travel for {session_focus['destination']}.")
        elif session_focus.get("combat_style") is not None:
            parts.append(f"This conversation is currently centered on {session_focus['combat_style']} upgrades.")

        if include_goal and latest_goal is not None:
            parts.append(f"There is also a tracked goal in the background: {latest_goal.title}.")

        if not parts:
            if include_goal and latest_goal is not None:
                return (
                    f"We do not have a strong task-specific focus yet. "
                    f"The main tracked goal in the background is {latest_goal.title}."
                )
            return "We do not have a strong session focus yet, so I'd anchor on the current account state first."
        return " ".join(parts)

    def _summarize_session_intent(
        self,
        *,
        session_intent: str | None,
    ) -> str | None:
        if session_intent is None:
            return None
        return f"The current conversation intent is {self._humanize_session_intent(session_intent)}."

    def _humanize_session_intent(self, session_intent: str) -> str:
        labels = {
            "profit": "making money",
            "travel": "routing and travel setup",
            "bossing": "boss readiness",
            "questing": "quest progression",
            "gearing": "gear upgrades",
            "training": "skill training",
            "progression": "overall account progression",
        }
        return labels.get(session_intent, session_intent)

    def _boss_label(self, boss_id: str) -> str:
        readiness = boss_advisor_service.evaluate_readiness(
            boss_id=boss_id,
            skills=None,
            unlocked_transports=None,
            completed_quests=None,
        )
        return str(readiness["label"])


chat_service = ChatService()
