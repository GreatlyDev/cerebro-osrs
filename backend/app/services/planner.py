from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account_snapshot import AccountSnapshot
from app.models.goal import Goal
from app.models.profile import Profile
from app.schemas.gear import GearRecommendationRequest
from app.schemas.teleport import TeleportRouteRequest
from app.services.gear import gear_service
from app.services.quests import quest_service
from app.services.skills import skill_service
from app.services.teleports import teleport_service


class PlannerService:
    async def build_goal_recommendations(
        self,
        db_session: AsyncSession,
        goal: Goal,
        profile: Profile | None,
        snapshot: AccountSnapshot | None,
        target_rsn: str | None,
    ) -> dict[str, object]:
        skill_name = self._goal_skill(goal.goal_type)
        combat_style = self._goal_combat_style(goal.goal_type)
        quest_id = self._goal_quest(goal.goal_type)
        destination = self._goal_destination(goal.goal_type)

        skill_recommendations = await skill_service.get_recommendations(
            db_session=db_session,
            skill_name=skill_name,
            account_rsn=target_rsn,
            preference=None,
        )
        gear_recommendations = await gear_service.get_recommendations(
            db_session=db_session,
            payload=GearRecommendationRequest(
                combat_style=combat_style,
                budget_tier="midgame",
                current_gear=[],
                account_rsn=target_rsn,
            ),
        )
        teleport_route = await teleport_service.get_route(
            db_session=db_session,
            payload=TeleportRouteRequest(
                destination=destination,
                account_rsn=target_rsn,
                preference=None,
            ),
        )
        quest = quest_service.get_quest(quest_id)

        return {
            "recommended_skill": {
                "skill": skill_recommendations.skill,
                "current_level": skill_recommendations.current_level,
                "method": skill_recommendations.recommendations[0].method,
                "reason": skill_recommendations.recommendations[0].rationale,
            },
            "recommended_quest": {
                "id": quest.id,
                "name": quest.name,
                "why_it_matters": quest.why_it_matters,
            },
            "recommended_gear": {
                "item_name": gear_recommendations.recommendations[0].item_name,
                "slot": gear_recommendations.recommendations[0].slot,
                "upgrade_reason": gear_recommendations.recommendations[0].upgrade_reason,
            },
            "recommended_teleport": {
                "destination": teleport_route.destination,
                "method": teleport_route.recommended_route.method,
                "travel_notes": teleport_route.recommended_route.travel_notes,
            },
            "profile_play_style": profile.play_style if profile else None,
            "snapshot_available": snapshot is not None,
        }

    def summarize_next_action(self, goal: Goal, recommendations: dict[str, object]) -> str:
        skill = recommendations["recommended_skill"]
        quest = recommendations["recommended_quest"]
        gear = recommendations["recommended_gear"]
        return (
            f"For {goal.title}, start by pushing {skill['skill']} with {skill['method']}. "
            f"Then prioritize {quest['name']} and line up {gear['item_name']} as the next meaningful gear upgrade."
        )

    def _goal_skill(self, goal_type: str) -> str:
        normalized = goal_type.lower()
        if "fire cape" in normalized:
            return "ranged"
        if "barrows gloves" in normalized:
            return "magic"
        return "magic"

    def _goal_combat_style(self, goal_type: str) -> str:
        normalized = goal_type.lower()
        if "fire cape" in normalized:
            return "ranged"
        if "quest cape" in normalized:
            return "magic"
        return "melee"

    def _goal_quest(self, goal_type: str) -> str:
        normalized = goal_type.lower()
        if "barrows gloves" in normalized:
            return "recipe-for-disaster"
        if "fire cape" in normalized:
            return "fairytale-ii"
        return "bone-voyage"

    def _goal_destination(self, goal_type: str) -> str:
        normalized = goal_type.lower()
        if "fire cape" in normalized:
            return "fairy ring network"
        if "barrows gloves" in normalized:
            return "barrows"
        return "fossil island"


planner_service = PlannerService()
