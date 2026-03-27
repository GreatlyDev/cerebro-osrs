from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot
from app.models.user import User
from app.schemas.gear import (
    GearRecommendationRequest,
    GearRecommendationResponse,
    GearUpgradeRecommendation,
)

GEAR_LIBRARY: dict[str, dict[str, list[GearUpgradeRecommendation]]] = {
    "melee": {
        "budget": [
            GearUpgradeRecommendation(
                item_name="Dragon scimitar",
                slot="weapon",
                budget_tier="budget",
                upgrade_reason="Excellent early-midgame slash weapon for fast melee training and questing.",
                requirements=["Monkey Madness I"],
                estimated_cost="Low",
                priority="high",
            ),
            GearUpgradeRecommendation(
                item_name="Fighter torso",
                slot="body",
                budget_tier="budget",
                upgrade_reason="Huge strength bonus upgrade with no GP cost if you complete Barbarian Assault.",
                requirements=["Barbarian Assault role grind"],
                estimated_cost="Time investment only",
                priority="high",
            ),
            GearUpgradeRecommendation(
                item_name="Dragon defender",
                slot="shield",
                budget_tier="budget",
                upgrade_reason="Best-value offensive offhand for melee progression.",
                requirements=["Warriors' Guild access"],
                estimated_cost="Very low",
                priority="high",
            ),
        ],
        "midgame": [
            GearUpgradeRecommendation(
                item_name="Abyssal whip",
                slot="weapon",
                budget_tier="midgame",
                upgrade_reason="Strong general-purpose melee upgrade for sustained midgame combat.",
                requirements=["70 Attack"],
                estimated_cost="Medium",
                priority="high",
            ),
            GearUpgradeRecommendation(
                item_name="Bandos tassets",
                slot="legs",
                budget_tier="midgame",
                upgrade_reason="Strong offensive legs upgrade that stays relevant for a long time.",
                requirements=["No hard unlocks"],
                estimated_cost="High-midgame",
                priority="medium",
            ),
        ],
    },
    "magic": {
        "budget": [
            GearUpgradeRecommendation(
                item_name="Mystic robe set",
                slot="armor",
                budget_tier="budget",
                upgrade_reason="Clean baseline magic accuracy upgrade for general casting.",
                requirements=["40 Magic"],
                estimated_cost="Low",
                priority="medium",
            ),
            GearUpgradeRecommendation(
                item_name="Trident of the seas",
                slot="weapon",
                budget_tier="budget",
                upgrade_reason="Reliable powered staff for PvM and magic training transitions.",
                requirements=["75 Magic"],
                estimated_cost="Medium",
                priority="high",
            ),
        ],
        "midgame": [
            GearUpgradeRecommendation(
                item_name="Ahrim's robes",
                slot="armor",
                budget_tier="midgame",
                upgrade_reason="Strong magic accuracy upgrade for slayer, bossing, and burst setups.",
                requirements=["70 Magic", "70 Defence"],
                estimated_cost="Medium",
                priority="medium",
            ),
            GearUpgradeRecommendation(
                item_name="Toxic trident",
                slot="weapon",
                budget_tier="midgame",
                upgrade_reason="Excellent powered staff upgrade for sustained midgame PvM.",
                requirements=["75 Magic"],
                estimated_cost="Medium-high",
                priority="high",
            ),
        ],
    },
    "ranged": {
        "budget": [
            GearUpgradeRecommendation(
                item_name="Rune crossbow",
                slot="weapon",
                budget_tier="budget",
                upgrade_reason="Efficient and accessible ranged upgrade for broad account use.",
                requirements=["61 Ranged", "or Crazy Archaeologist drop route"],
                estimated_cost="Low",
                priority="high",
            ),
            GearUpgradeRecommendation(
                item_name="Accumulator",
                slot="cape",
                budget_tier="budget",
                upgrade_reason="Major quality-of-life and DPS value upgrade for ranged setups.",
                requirements=["Animal Magnetism"],
                estimated_cost="Very low",
                priority="high",
            ),
        ],
        "midgame": [
            GearUpgradeRecommendation(
                item_name="Blowpipe",
                slot="weapon",
                budget_tier="midgame",
                upgrade_reason="Top-tier general ranged upgrade for many training and PvM scenarios.",
                requirements=["75 Ranged"],
                estimated_cost="Medium-high",
                priority="high",
            ),
            GearUpgradeRecommendation(
                item_name="Blessed d'hide set",
                slot="armor",
                budget_tier="midgame",
                upgrade_reason="Improves ranged accuracy while keeping prayer bonus useful.",
                requirements=["70 Ranged"],
                estimated_cost="Medium",
                priority="medium",
            ),
        ],
    },
}


class GearService:
    async def get_recommendations(
        self,
        db_session: AsyncSession,
        user: User,
        payload: GearRecommendationRequest,
    ) -> GearRecommendationResponse:
        style_library = GEAR_LIBRARY.get(payload.combat_style, {})
        recommendations = style_library.get(payload.budget_tier, [])

        filtered = [
            recommendation
            for recommendation in recommendations
            if recommendation.item_name.lower() not in {item.lower() for item in payload.current_gear}
        ]

        snapshot = await self._get_latest_snapshot(
            db_session=db_session,
            user=user,
            account_rsn=payload.account_rsn,
        )

        context = {
            "snapshot_used": snapshot is not None,
            "current_gear_count": len(payload.current_gear),
        }
        if snapshot is not None:
            context["overall_level"] = snapshot.summary.get("overall_level")

        if not filtered:
            filtered = recommendations

        return GearRecommendationResponse(
            combat_style=payload.combat_style,
            budget_tier=payload.budget_tier,
            account_rsn=payload.account_rsn,
            recommendations=filtered,
            context=context,
        )

    async def _get_latest_snapshot(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
    ) -> AccountSnapshot | None:
        if account_rsn is None:
            return None

        account = await db_session.scalar(
            select(Account).where(Account.user_id == user.id, Account.rsn == account_rsn)
        )
        if account is None:
            return None

        return await db_session.scalar(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account.id)
            .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
        )


gear_service = GearService()
