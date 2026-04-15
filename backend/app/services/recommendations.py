from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.goal import Goal
from app.models.profile import Profile
from app.models.user import User
from app.schemas.gear import GearRecommendationRequest
from app.schemas.recommendation import (
    NextActionRecommendation,
    NextActionRequest,
    NextActionResponse,
)
from app.schemas.teleport import TeleportRouteRequest
from app.services.account_context import account_context_service
from app.services.gear import gear_service
from app.services.planner import planner_service
from app.services.quests import quest_service
from app.services.skills import skill_service
from app.services.teleports import teleport_service
from app.services.user_context import user_context_service


class RecommendationService:
    async def get_next_actions(
        self,
        db_session: AsyncSession,
        user: User,
        payload: NextActionRequest,
    ) -> NextActionResponse:
        profile = await user_context_service.get_profile(db_session=db_session, user=user)
        goal = await self._resolve_goal(db_session=db_session, user=user, goal_id=payload.goal_id)
        account_rsn = await self._resolve_account_rsn(
            db_session=db_session,
            user=user,
            requested_account_rsn=payload.account_rsn,
            goal=goal,
            profile=profile,
        )
        snapshot = await account_context_service.get_latest_snapshot(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        previous_snapshot = await account_context_service.get_previous_snapshot(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        progress = await account_context_service.get_progress(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        snapshot_delta = self._build_snapshot_delta(
            latest_snapshot=snapshot,
            previous_snapshot=previous_snapshot,
        )

        goal_like = goal or self._build_default_goal(account_rsn=account_rsn, profile=profile)
        recommendations = await planner_service.build_goal_recommendations(
            db_session=db_session,
            user=user,
            goal=goal_like,
            profile=profile,
            snapshot=snapshot,
            target_rsn=account_rsn,
        )
        actions = self._build_actions(
            goal=goal,
            account_rsn=account_rsn,
            recommendations=recommendations,
            progress=progress,
            snapshot_delta=snapshot_delta,
        )
        ordered = sorted(actions, key=lambda action: action.score, reverse=True)
        trimmed = ordered[: payload.limit]

        return NextActionResponse(
            account_rsn=account_rsn,
            goal_id=goal.id if goal else None,
            goal_title=goal.title if goal else None,
            top_action=trimmed[0] if trimmed else None,
            actions=trimmed,
            context={
                "profile_play_style": profile.play_style if profile else None,
                "profile_goals_focus": profile.goals_focus if profile else None,
                "snapshot_available": snapshot is not None,
                "snapshot_delta_available": snapshot_delta is not None,
                "overall_level_delta": snapshot_delta["overall_level_delta"] if snapshot_delta else 0,
                "recently_progressed_skills": snapshot_delta["improved_skills"] if snapshot_delta else [],
                "progress_available": progress is not None,
                "owned_gear_count": len(user_context_service.tracked_owned_gear(progress)),
                "completed_diary_regions": len(progress.completed_diaries) if progress else 0,
                "notable_item_count": len(progress.notable_items) if progress else 0,
                "active_unlock_count": len(progress.active_unlocks) if progress else 0,
                "companion_sync_active": (
                    progress is not None
                    and progress.companion_state.get("source") == "runelite_companion"
                ),
                "goal_influenced": goal is not None,
                "returned_action_count": len(trimmed),
            },
        )

    async def _resolve_goal(
        self,
        db_session: AsyncSession,
        user: User,
        goal_id: int | None,
    ) -> Goal | None:
        if goal_id is not None:
            return await db_session.scalar(
                select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id)
            )
        return await db_session.scalar(
            select(Goal).where(Goal.user_id == user.id).order_by(desc(Goal.id))
        )

    async def _resolve_account_rsn(
        self,
        db_session: AsyncSession,
        user: User,
        requested_account_rsn: str | None,
        goal: Goal | None,
        profile: Profile | None,
    ) -> str | None:
        if requested_account_rsn:
            return requested_account_rsn
        if goal and goal.target_account_rsn:
            return goal.target_account_rsn
        if profile and profile.primary_account_rsn:
            return profile.primary_account_rsn

        latest_account = await db_session.scalar(
            select(Account).where(Account.user_id == user.id).order_by(desc(Account.id))
        )
        return latest_account.rsn if latest_account else None

    def _build_default_goal(
        self,
        account_rsn: str | None,
        profile: Profile | None,
    ) -> Goal:
        goal_type = "quest cape" if profile and profile.goals_focus == "progression" else "barrows gloves"
        title = "Account Progression"
        return Goal(
            id=0,
            title=title,
            goal_type=goal_type,
            target_account_rsn=account_rsn,
            status="active",
            notes=None,
            generated_plan=None,
        )

    def _build_actions(
        self,
        goal: Goal | None,
        account_rsn: str | None,
        recommendations: dict[str, object],
        progress,
        snapshot_delta: dict[str, object] | None,
    ) -> list[NextActionRecommendation]:
        skill = recommendations["recommended_skill"]
        quest = recommendations["recommended_quest"]
        gear = recommendations["recommended_gear"]
        teleport = recommendations["recommended_teleport"]
        readiness = quest["readiness"]
        owned_gear = user_context_service.tracked_owned_gear(progress)
        known_unlocks = user_context_service.tracked_known_unlocks(progress)

        skill_blockers = []
        current_level = skill.get("current_level")
        if current_level is None:
            skill_blockers.append("No synced skill snapshot yet")

        quest_blockers = [
            *[
                f"{item['skill']} {item['current_level']}->{item['required_level']}"
                for item in readiness.get("missing_skills", [])
            ],
            *readiness.get("missing_quests", []),
            *readiness.get("missing_other_requirements", []),
        ]
        teleport_blockers = [
            requirement
            for requirement in teleport.get("requirements", [])
            if requirement
        ]
        gear_owned = gear["item_name"].strip().lower() in owned_gear
        quest_matches_active_unlock = self._quest_matches_known_unlock(quest, known_unlocks)
        travel_matches_active_unlock = self._travel_matches_known_unlock(teleport, known_unlocks)
        improving_skills = set(snapshot_delta["improved_skills"]) if snapshot_delta else set()
        overall_level_delta = int(snapshot_delta["overall_level_delta"]) if snapshot_delta else 0
        skill_has_momentum = skill["skill"] in improving_skills
        skill_stalled = snapshot_delta is not None and not skill_has_momentum and overall_level_delta == 0
        quest_momentum_bonus = 6 if skill_has_momentum or overall_level_delta > 0 else 0
        skill_score = 78 if skill_has_momentum else 86 if current_level is not None else 74
        if skill_stalled:
            skill_score += 6

        actions = [
            NextActionRecommendation(
                action_type="quest",
                title=f"Push toward {quest['name']}",
                summary=quest["why_it_matters"],
                score=max(
                    40,
                    92
                    - (len(quest_blockers) * 8)
                    - (18 if quest_matches_active_unlock else 0)
                    + quest_momentum_bonus,
                ),
                priority="low" if quest_matches_active_unlock else "high" if len(quest_blockers) <= 2 else "medium",
                target={"quest_id": quest["id"], "goal_title": goal.title if goal else None},
                blockers=(
                    ["Already synced as unlocked via companion state"] + quest_blockers
                    if quest_matches_active_unlock
                    else quest_blockers
                ),
                supporting_data={
                    "readiness": readiness,
                    "goal_type": goal.goal_type if goal else None,
                    "active_unlock_match": quest_matches_active_unlock,
                    "recent_momentum_detected": skill_has_momentum or overall_level_delta > 0,
                },
            ),
            NextActionRecommendation(
                action_type="skill",
                title=f"Train {skill['skill']}",
                summary=f"Use {skill['method']} as the next efficient training method.",
                score=skill_score,
                priority="high" if current_level is not None else "medium",
                target={"skill": skill["skill"], "account_rsn": account_rsn},
                blockers=skill_blockers,
                supporting_data={
                    "current_level": current_level,
                    "reason": skill["reason"],
                    "recommended_method": skill["method"],
                    "recent_momentum_detected": skill_has_momentum,
                    "skill_stalled": skill_stalled,
                },
            ),
            NextActionRecommendation(
                action_type="gear",
                title=f"Upgrade into {gear['item_name']}",
                summary=gear["upgrade_reason"],
                score=44 if gear_owned else 72,
                priority="low" if gear_owned else "medium",
                target={"item_name": gear["item_name"], "slot": gear["slot"]},
                blockers=["Already tracked as owned"] if gear_owned else [],
                supporting_data={
                    "account_rsn": account_rsn,
                    "already_owned": gear_owned,
                },
            ),
            NextActionRecommendation(
                action_type="travel",
                title=f"Set up {teleport['method']}",
                summary=f"Travel plan for {teleport['destination']}: {teleport['travel_notes']}",
                score=(68 if "fallback" not in teleport.get("route_type", "") else 58)
                - (18 if travel_matches_active_unlock else 0),
                priority="low" if travel_matches_active_unlock else "medium",
                target={
                    "destination": teleport["destination"],
                    "method": teleport["method"],
                },
                blockers=(
                    ["Already synced as unlocked via companion state"] + teleport_blockers
                    if travel_matches_active_unlock
                    else teleport_blockers
                ),
                supporting_data={
                    "account_rsn": account_rsn,
                    "active_unlock_match": travel_matches_active_unlock,
                },
            ),
        ]
        return actions

    def _quest_matches_known_unlock(
        self,
        quest: dict[str, object],
        known_unlocks: set[str],
    ) -> bool:
        quest_name = str(quest.get("name", "")).strip().lower()
        if not quest_name:
            return False
        if quest_name in known_unlocks:
            return True
        return any(alias in known_unlocks for alias in self._unlock_aliases_for_text(quest_name))

    def _travel_matches_known_unlock(
        self,
        teleport: dict[str, object],
        known_unlocks: set[str],
    ) -> bool:
        destination = str(teleport.get("destination", "")).strip().lower()
        if not destination:
            return False
        if destination in known_unlocks:
            return True
        return any(alias in known_unlocks for alias in self._unlock_aliases_for_text(destination))

    def _unlock_aliases_for_text(self, value: str) -> set[str]:
        aliases = {value}
        if "fossil island" in value or "bone voyage" in value:
            aliases.update({"bone voyage", "fossil island", "fossil island access"})
        if "fairy ring" in value:
            aliases.update({"fairy rings", "fairy ring utility", "fairy ring network", "fairy rings unlocked"})
        return aliases

    def _build_snapshot_delta(
        self,
        latest_snapshot,
        previous_snapshot,
    ) -> dict[str, object] | None:
        if latest_snapshot is None or previous_snapshot is None:
            return None

        latest_overall = int(latest_snapshot.summary.get("overall_level", 0) or 0)
        previous_overall = int(previous_snapshot.summary.get("overall_level", 0) or 0)
        latest_skills = latest_snapshot.summary.get("skills", {})
        previous_skills = previous_snapshot.summary.get("skills", {})
        improved_skills: list[str] = []

        if isinstance(latest_skills, dict) and isinstance(previous_skills, dict):
            for skill_name, latest_data in latest_skills.items():
                if skill_name == "overall" or not isinstance(latest_data, dict):
                    continue
                previous_data = previous_skills.get(skill_name, {})
                latest_level = int(latest_data.get("level", 0) or 0)
                previous_level = int(previous_data.get("level", 0) or 0) if isinstance(previous_data, dict) else 0
                if latest_level > previous_level:
                    improved_skills.append(skill_name)

        return {
            "overall_level_delta": latest_overall - previous_overall,
            "improved_skills": sorted(improved_skills),
        }


recommendation_service = RecommendationService()
