from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.goal import Goal
from app.models.profile import Profile
from app.models.user import User


class UserContextService:
    async def get_profile(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Profile | None:
        return await db_session.scalar(select(Profile).where(Profile.user_id == user.id))

    async def get_latest_goal(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Goal | None:
        return await db_session.scalar(
            select(Goal).where(Goal.user_id == user.id).order_by(desc(Goal.id))
        )

    async def get_latest_account(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Account | None:
        return await db_session.scalar(
            select(Account).where(Account.user_id == user.id).order_by(desc(Account.id))
        )

    def build_progress_snapshot(self, progress: AccountProgress | None) -> dict[str, object] | None:
        if progress is None:
            return None

        return {
            "completed_quests": list(progress.completed_quests),
            "completed_diaries": dict(progress.completed_diaries),
            "unlocked_transports": list(progress.unlocked_transports),
            "owned_gear": list(progress.owned_gear),
            "equipped_gear": dict(progress.equipped_gear),
            "notable_items": list(progress.notable_items),
            "active_unlocks": list(progress.active_unlocks),
            "companion_state": dict(progress.companion_state),
        }

    def tracked_owned_gear(self, progress: AccountProgress | None) -> set[str]:
        progress_snapshot = self.build_progress_snapshot(progress) or {}
        equipped_gear = progress_snapshot.get("equipped_gear", {})
        equipped_items = equipped_gear.values() if isinstance(equipped_gear, dict) else []
        return self._normalize_entries(
            [
                *(progress_snapshot.get("owned_gear", []) if isinstance(progress_snapshot.get("owned_gear"), list) else []),
                *(progress_snapshot.get("notable_items", []) if isinstance(progress_snapshot.get("notable_items"), list) else []),
                *equipped_items,
            ]
        )

    def tracked_known_unlocks(self, progress: AccountProgress | None) -> set[str]:
        progress_snapshot = self.build_progress_snapshot(progress) or {}
        known_unlocks = self._normalize_entries(
            [
                *(progress_snapshot.get("completed_quests", []) if isinstance(progress_snapshot.get("completed_quests"), list) else []),
                *(progress_snapshot.get("unlocked_transports", []) if isinstance(progress_snapshot.get("unlocked_transports"), list) else []),
                *(progress_snapshot.get("active_unlocks", []) if isinstance(progress_snapshot.get("active_unlocks"), list) else []),
            ]
        )
        expanded_unlocks = set(known_unlocks)
        for unlock in tuple(known_unlocks):
            expanded_unlocks.update(self.expand_unlock_aliases(unlock))
        return expanded_unlocks

    def _normalize_entries(self, entries: list[object]) -> set[str]:
        normalized: set[str] = set()
        for entry in entries:
            if not isinstance(entry, str):
                continue
            cleaned = " ".join(entry.strip().lower().split())
            if cleaned:
                normalized.add(cleaned)
        return normalized

    def expand_unlock_aliases(self, unlock: str) -> set[str]:
        alias_groups = (
            {"bone voyage", "fossil island", "fossil island access"},
            {"fairy rings", "fairy ring utility", "fairy ring network", "fairy rings unlocked"},
        )
        for alias_group in alias_groups:
            if unlock in alias_group:
                return alias_group
        return set()


user_context_service = UserContextService()
