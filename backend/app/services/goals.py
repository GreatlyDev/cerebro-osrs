from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot
from app.models.goal import Goal
from app.models.profile import Profile
from app.schemas.goal import GoalCreateRequest, GoalListResponse, GoalPlanResponse, GoalResponse
from app.services.planner import planner_service


class GoalService:
    async def _get_goal_or_404(self, db_session: AsyncSession, goal_id: int) -> Goal:
        goal = await db_session.get(Goal, goal_id)
        if goal is None:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
        return goal

    async def create_goal(
        self,
        db_session: AsyncSession,
        payload: GoalCreateRequest,
    ) -> GoalResponse:
        goal = Goal(
            title=payload.title,
            goal_type=payload.goal_type,
            target_account_rsn=payload.target_account_rsn,
            notes=payload.notes,
            status="active",
        )
        db_session.add(goal)
        await db_session.commit()
        await db_session.refresh(goal)
        return GoalResponse.model_validate(goal)

    async def list_goals(self, db_session: AsyncSession) -> GoalListResponse:
        goals = list((await db_session.scalars(select(Goal).order_by(desc(Goal.id)))).all())
        return GoalListResponse(
            items=[GoalResponse.model_validate(goal) for goal in goals],
            total=len(goals),
        )

    async def generate_plan(
        self,
        db_session: AsyncSession,
        goal_id: int,
    ) -> GoalPlanResponse:
        goal = await self._get_goal_or_404(db_session=db_session, goal_id=goal_id)

        profile = await db_session.get(Profile, 1)
        target_rsn = goal.target_account_rsn or (profile.primary_account_rsn if profile else None)
        snapshot = None
        if target_rsn is not None:
            account = await db_session.scalar(select(Account).where(Account.rsn == target_rsn))
            if account is not None:
                snapshot = await db_session.scalar(
                    select(AccountSnapshot)
                    .where(AccountSnapshot.account_id == account.id)
                    .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
                )
        if snapshot is None and target_rsn is not None:
            snapshot = await db_session.scalar(
                select(AccountSnapshot)
                .join(Account, Account.id == AccountSnapshot.account_id)
                .where(Account.rsn == target_rsn)
                .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
            )

        steps = self._build_steps(goal=goal, profile=profile, snapshot=snapshot)
        recommendations = await planner_service.build_goal_recommendations(
            db_session=db_session,
            goal=goal,
            profile=profile,
            snapshot=snapshot,
            target_rsn=target_rsn,
        )
        context = {
            "goal_type": goal.goal_type,
            "target_account_rsn": target_rsn,
            "profile_play_style": profile.play_style if profile else None,
            "snapshot_available": snapshot is not None,
        }
        if snapshot is not None:
            context["overall_level"] = snapshot.summary.get("overall_level")

        generated_plan = {
            "summary": f"Plan generated for {goal.title}.",
            "steps": steps,
            "recommendations": recommendations,
            "context": context,
        }
        goal.generated_plan = generated_plan
        await db_session.commit()
        await db_session.refresh(goal)

        return GoalPlanResponse(
            goal_id=goal.id,
            status="generated",
            summary=generated_plan["summary"],
            steps=steps,
            recommendations=recommendations,
            context=context,
        )

    def _build_steps(
        self,
        goal: Goal,
        profile: Profile | None,
        snapshot: AccountSnapshot | None,
    ) -> list[str]:
        steps = [
            f"Clarify the success condition for {goal.title}.",
            "Review the current account state and identify the biggest blockers.",
            "Break the goal into 2-4 progression milestones.",
        ]

        if snapshot is not None:
            overall_level = snapshot.summary.get("overall_level")
            steps.append(
                f"Use the latest snapshot to prioritize upgrades from the current overall level of {overall_level}."
            )
        else:
            steps.append("Sync the target account to capture a fresh progression snapshot before optimizing.")

        if profile is not None and profile.prefers_afk_methods:
            steps.append("Bias the milestone plan toward AFK-friendly methods where they remain efficient.")
        elif profile is not None and profile.prefers_profitable_methods:
            steps.append("Favor profitable methods when choosing between equivalent progression options.")
        else:
            steps.append("Balance speed, convenience, and unlock value when choosing next actions.")

        if goal.goal_type.lower() == "quest cape":
            steps.append("Sequence prerequisite quests and missing skill requirements toward the Quest Cape path.")
        elif goal.goal_type.lower() == "fire cape":
            steps.append("Prioritize combat stats, gear readiness, and Jad-specific preparation steps.")
        elif goal.goal_type.lower() == "barrows gloves":
            steps.append("Map the Recipe for Disaster subquests and required unlocks into a staged checklist.")
        else:
            steps.append("Translate the goal into a practical checklist the frontend can expand later.")

        return steps


goal_service = GoalService()
