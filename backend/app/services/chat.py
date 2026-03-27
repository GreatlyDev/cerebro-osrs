from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot
from app.models.chat import ChatMessage, ChatSession
from app.models.goal import Goal
from app.models.profile import Profile
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
from app.services.skills import skill_service
from app.services.teleports import teleport_service
from app.schemas.gear import GearRecommendationRequest
from app.schemas.teleport import TeleportRouteRequest


class ChatService:
    async def create_session(
        self,
        db_session: AsyncSession,
        payload: ChatSessionCreateRequest,
    ) -> ChatSessionResponse:
        session = ChatSession(title=payload.title)
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        return ChatSessionResponse.model_validate(session)

    async def list_sessions(self, db_session: AsyncSession) -> ChatSessionListResponse:
        sessions = list((await db_session.scalars(select(ChatSession).order_by(desc(ChatSession.id)))).all())
        return ChatSessionListResponse(
            items=[ChatSessionResponse.model_validate(session) for session in sessions],
            total=len(sessions),
        )

    async def send_message(
        self,
        db_session: AsyncSession,
        session_id: int,
        payload: ChatMessageCreateRequest,
    ) -> ChatMessageResponse:
        session = await db_session.get(ChatSession, session_id)
        if session is None:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")

        user_message = ChatMessage(session_id=session_id, role="user", content=payload.content)
        db_session.add(user_message)
        await db_session.flush()

        assistant_content = await self._generate_response(
            db_session=db_session,
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
        session: ChatSession,
        message: str,
    ) -> str:
        normalized = message.lower()
        profile = await db_session.get(Profile, 1)
        latest_goal = await db_session.scalar(select(Goal).order_by(desc(Goal.id)))
        latest_account = await db_session.scalar(select(Account).order_by(desc(Account.id)))
        latest_snapshot = None
        if latest_account is not None:
            latest_snapshot = await db_session.scalar(
                select(AccountSnapshot)
                .where(AccountSnapshot.account_id == latest_account.id)
                .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
            )

        if "skill" in normalized or "train" in normalized:
            recommendations = await skill_service.get_recommendations(
                db_session=db_session,
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
            quest = quest_service.get_quest("recipe-for-disaster" if "barrows" in normalized else "bone-voyage")
            return (
                f"{quest.name} is worth prioritizing because {quest.why_it_matters} "
                f"Next, I'd {quest.next_steps[0].lower()}"
            )

        if "goal" in normalized and latest_goal is not None:
            recommendations = await planner_service.build_goal_recommendations(
                db_session=db_session,
                goal=latest_goal,
                profile=profile,
                snapshot=latest_snapshot,
                target_rsn=latest_goal.target_account_rsn or (latest_account.rsn if latest_account else None),
            )
            return planner_service.summarize_next_action(latest_goal, recommendations)

        if "next" in normalized or "should i do" in normalized:
            if latest_goal is not None:
                recommendations = await planner_service.build_goal_recommendations(
                    db_session=db_session,
                    goal=latest_goal,
                    profile=profile,
                    snapshot=latest_snapshot,
                    target_rsn=latest_goal.target_account_rsn or (latest_account.rsn if latest_account else None),
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


chat_service = ChatService()
