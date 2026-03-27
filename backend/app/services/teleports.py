from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot
from app.models.profile import Profile
from app.schemas.teleport import TeleportOption, TeleportRouteRequest, TeleportRouteResponse

TELEPORT_LIBRARY: dict[str, list[TeleportOption]] = {
    "barrows": [
        TeleportOption(
            method="Barrows teleport tablet",
            route_type="direct",
            requirements=["Player-owned house or teleport tablet access"],
            travel_notes="Direct arrival near the Barrows mound area.",
            convenience="high",
        ),
        TeleportOption(
            method="Canifis teleport + run south",
            route_type="nearby",
            requirements=["Canifis access"],
            travel_notes="Reliable fallback if direct Barrows teleports are unavailable.",
            convenience="medium",
        ),
        TeleportOption(
            method="Fairy ring BKR + run west",
            route_type="utility",
            requirements=["Fairy rings unlocked"],
            travel_notes="Good alternative for accounts already using fairy ring travel.",
            convenience="medium",
        ),
    ],
    "wintertodt": [
        TeleportOption(
            method="Games necklace to Burthorpe + minigame grouping",
            route_type="recommended",
            requirements=["Games necklace"],
            travel_notes="Fast and common route for repeated Wintertodt runs.",
            convenience="high",
        ),
        TeleportOption(
            method="Skills necklace to Woodcutting Guild + run north",
            route_type="nearby",
            requirements=["Skills necklace"],
            travel_notes="Solid fallback with short overland travel.",
            convenience="medium",
        ),
    ],
    "fossil island": [
        TeleportOption(
            method="Digsite pendant",
            route_type="direct",
            requirements=["Bone Voyage", "Digsite pendant"],
            travel_notes="Best repeat route for birdhouses, crabs, and island skilling loops.",
            convenience="high",
        ),
        TeleportOption(
            method="Varrock teleport + Digsite barge",
            route_type="fallback",
            requirements=["Bone Voyage", "Varrock teleport"],
            travel_notes="Longer route, but available before pendant setup.",
            convenience="low",
        ),
    ],
    "fairy ring network": [
        TeleportOption(
            method="Dramen/Lunar staff + fairy rings",
            route_type="utility",
            requirements=["Fairytale II partial unlock"],
            travel_notes="Best general-purpose travel system for many skilling and quest routes.",
            convenience="high",
        ),
        TeleportOption(
            method="Quest cape or POH hub substitutions",
            route_type="advanced",
            requirements=["Late-game unlocks"],
            travel_notes="Useful when optimizing repeated route chains.",
            convenience="high",
        ),
    ],
}


class TeleportService:
    async def get_route(
        self,
        db_session: AsyncSession,
        payload: TeleportRouteRequest,
    ) -> TeleportRouteResponse:
        destination = payload.destination
        options = TELEPORT_LIBRARY.get(destination)
        if options is None:
            options = [
                TeleportOption(
                    method="Closest standard spellbook teleport",
                    route_type="fallback",
                    requirements=["Basic teleport access"],
                    travel_notes="Use the nearest known teleport hub, then run the remaining distance.",
                    convenience="medium",
                ),
                TeleportOption(
                    method="Fairy rings or transport network fallback",
                    route_type="fallback",
                    requirements=["Travel unlocks vary by account"],
                    travel_notes="Good generic fallback when the destination has no curated route yet.",
                    convenience="medium",
                ),
            ]

        effective_preference = await self._resolve_preference(
            db_session=db_session,
            preference=payload.preference,
        )
        snapshot = await self._get_latest_snapshot(db_session=db_session, account_rsn=payload.account_rsn)

        ordered = self._rank_options(options=options, preference=effective_preference)
        context = {
            "snapshot_used": snapshot is not None,
            "destination_supported": destination in TELEPORT_LIBRARY,
            "profile_preference_applied": payload.preference is None,
        }
        if snapshot is not None:
            context["overall_level"] = snapshot.summary.get("overall_level")

        return TeleportRouteResponse(
            destination=destination,
            account_rsn=payload.account_rsn,
            preference=effective_preference,
            recommended_route=ordered[0],
            alternatives=ordered[1:],
            context=context,
        )

    async def _resolve_preference(
        self,
        db_session: AsyncSession,
        preference: str | None,
    ) -> str:
        if preference:
            return preference

        profile = await db_session.get(Profile, 1)
        if profile and profile.prefers_afk_methods:
            return "convenience"
        if profile and profile.prefers_profitable_methods:
            return "low-cost"
        return "balanced"

    async def _get_latest_snapshot(
        self,
        db_session: AsyncSession,
        account_rsn: str | None,
    ) -> AccountSnapshot | None:
        if account_rsn is None:
            return None

        account = await db_session.scalar(select(Account).where(Account.rsn == account_rsn))
        if account is None:
            return None

        return await db_session.scalar(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account.id)
            .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
        )

    def _rank_options(
        self,
        options: list[TeleportOption],
        preference: str,
    ) -> list[TeleportOption]:
        convenience_rank = {"high": 0, "medium": 1, "low": 2}

        if preference == "convenience":
            return sorted(options, key=lambda option: convenience_rank.get(option.convenience, 3))
        if preference == "low-cost":
            return sorted(
                options,
                key=lambda option: 0 if "tablet" not in option.method.lower() and "necklace" not in option.method.lower() else 1,
            )
        return options


teleport_service = TeleportService()
