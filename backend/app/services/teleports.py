from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
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
        progress = await self._get_progress(db_session=db_session, account_rsn=payload.account_rsn)

        ordered = self._rank_options(
            options=options,
            preference=effective_preference,
            progress=progress,
        )
        context = {
            "snapshot_used": snapshot is not None,
            "destination_supported": destination in TELEPORT_LIBRARY,
            "profile_preference_applied": payload.preference is None,
        }
        if snapshot is not None:
            context["overall_level"] = snapshot.summary.get("overall_level")

        if progress is not None:
            context["progress_used"] = True
            context["completed_quests_tracked"] = progress.completed_quests
            context["tracked_transports"] = progress.unlocked_transports
            context["locked_routes"] = [
                option.method
                for option in ordered
                if not self._requirements_met(option=option, progress=progress)
            ]
        else:
            context["progress_used"] = False

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

    async def _get_progress(
        self,
        db_session: AsyncSession,
        account_rsn: str | None,
    ) -> AccountProgress | None:
        if account_rsn is None:
            return None

        account = await db_session.scalar(select(Account).where(Account.rsn == account_rsn))
        if account is None:
            return None

        return await db_session.scalar(
            select(AccountProgress).where(AccountProgress.account_id == account.id)
        )

    def _rank_options(
        self,
        options: list[TeleportOption],
        preference: str,
        progress: AccountProgress | None,
    ) -> list[TeleportOption]:
        convenience_rank = {"high": 0, "medium": 1, "low": 2}
        unlocked_options = [
            option for option in options if self._requirements_met(option=option, progress=progress)
        ]
        locked_options = [
            option for option in options if not self._requirements_met(option=option, progress=progress)
        ]

        ranked_unlocked = self._rank_by_preference(
            options=unlocked_options,
            preference=preference,
            convenience_rank=convenience_rank,
        )
        ranked_locked = self._rank_by_preference(
            options=locked_options,
            preference=preference,
            convenience_rank=convenience_rank,
        )
        ranked_locked = sorted(
            ranked_locked,
            key=lambda option: self._missing_tracked_requirement_count(option=option, progress=progress),
        )
        return ranked_unlocked + ranked_locked

    def _rank_by_preference(
        self,
        options: list[TeleportOption],
        preference: str,
        convenience_rank: dict[str, int],
    ) -> list[TeleportOption]:
        if not options:
            return []

        if preference == "convenience":
            return sorted(options, key=lambda option: convenience_rank.get(option.convenience, 3))
        if preference == "low-cost":
            return sorted(
                options,
                key=lambda option: 0 if "tablet" not in option.method.lower() and "necklace" not in option.method.lower() else 1,
            )
        return options

    def _requirements_met(
        self,
        option: TeleportOption,
        progress: AccountProgress | None,
    ) -> bool:
        tracked_requirements = self._tracked_requirements(option)
        if not tracked_requirements:
            return True
        if progress is None:
            return False

        completed_quests = {entry.strip().lower() for entry in progress.completed_quests}
        unlocked_transports = {entry.strip().lower() for entry in progress.unlocked_transports}
        known_unlocks = completed_quests | unlocked_transports
        return tracked_requirements.issubset(known_unlocks)

    def _missing_tracked_requirement_count(
        self,
        option: TeleportOption,
        progress: AccountProgress | None,
    ) -> int:
        tracked_requirements = self._tracked_requirements(option)
        if not tracked_requirements:
            return 0
        if progress is None:
            return len(tracked_requirements)

        completed_quests = {entry.strip().lower() for entry in progress.completed_quests}
        unlocked_transports = {entry.strip().lower() for entry in progress.unlocked_transports}
        known_unlocks = completed_quests | unlocked_transports
        return len(tracked_requirements - known_unlocks)

    def _tracked_requirements(self, option: TeleportOption) -> set[str]:
        explicit_requirements = {
            "bone voyage",
            "digsite pendant",
            "fairy rings unlocked",
            "fairytale ii partial unlock",
            "canifis access",
        }
        normalized_requirements = {
            requirement.strip().lower() for requirement in option.requirements
        }
        return normalized_requirements & explicit_requirements


teleport_service = TeleportService()
