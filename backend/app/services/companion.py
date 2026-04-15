import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.companion_connection import CompanionConnection
from app.models.companion_link_session import CompanionLinkSession
from app.models.user import User
from app.schemas.account_progress import AccountProgressUpdateRequest
from app.schemas.companion import (
    CompanionLinkExchangeRequest,
    CompanionLinkExchangeResponse,
    CompanionLinkSessionResponse,
    CompanionSyncRequest,
    CompanionSyncResponse,
)


class CompanionService:
    def _hash_secret(self, raw: str) -> str:
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _comparison_timestamp(self, expires_at: datetime, now: datetime) -> datetime:
        if expires_at.tzinfo is None:
            return now.replace(tzinfo=None)
        return now

    def _preserve_or_replace_list(
        self,
        incoming: list[str] | None,
        existing: list[str],
    ) -> list[str]:
        return existing if incoming is None else incoming

    def _preserve_or_replace_diaries(
        self,
        incoming: dict[str, list[str]] | None,
        existing: dict[str, list[str]],
    ) -> dict[str, list[str]]:
        return existing if incoming is None else incoming

    def _preserve_or_replace_gear_map(
        self,
        incoming: dict[str, str] | None,
        existing: dict[str, str],
    ) -> dict[str, str]:
        return existing if incoming is None else incoming

    def _preserve_or_replace_state(
        self,
        incoming: dict[str, object] | None,
        existing: dict[str, object],
    ) -> dict[str, object]:
        return existing if incoming is None else incoming

    async def _get_owned_account(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> Account:
        account = await db_session.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user.id)
        )
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found.",
            )
        return account

    async def create_link_session(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> CompanionLinkSessionResponse:
        account = await self._get_owned_account(
            db_session=db_session,
            user=user,
            account_id=account_id,
        )
        raw_token = secrets.token_urlsafe(24)
        expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session = CompanionLinkSession(
            user_id=user.id,
            account_id=account.id,
            token_hash=self._hash_secret(raw_token),
            expires_at=expires_at,
        )
        db_session.add(session)
        await db_session.commit()
        return CompanionLinkSessionResponse(link_token=raw_token, expires_at=expires_at)

    async def exchange_link_token(
        self,
        *,
        db_session: AsyncSession,
        payload: CompanionLinkExchangeRequest,
    ) -> CompanionLinkExchangeResponse:
        hashed_link_token = self._hash_secret(payload.link_token)
        session = await db_session.scalar(
            select(CompanionLinkSession).where(CompanionLinkSession.token_hash == hashed_link_token)
        )
        now = datetime.now(UTC)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Link token is invalid or expired.",
            )
        consumed_at = self._comparison_timestamp(session.expires_at, now)
        consume_result = await db_session.execute(
            update(CompanionLinkSession)
            .where(
                CompanionLinkSession.id == session.id,
                CompanionLinkSession.consumed_at.is_(None),
                CompanionLinkSession.expires_at >= consumed_at,
            )
            .values(consumed_at=consumed_at)
        )
        if consume_result.rowcount != 1:
            await db_session.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Link token is invalid or expired.",
            )

        account = await db_session.scalar(select(Account).where(Account.id == session.account_id))
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked account not found.",
            )

        raw_sync_secret = secrets.token_urlsafe(32)
        hashed_sync_secret = self._hash_secret(raw_sync_secret)
        connection = await db_session.scalar(
            select(CompanionConnection).where(CompanionConnection.account_id == account.id)
        )
        if connection is None:
            connection = CompanionConnection(
                account_id=account.id,
                sync_secret_hash=hashed_sync_secret,
                plugin_instance_id=payload.plugin_instance_id,
                plugin_version=payload.plugin_version,
                status="linked",
            )
            db_session.add(connection)
        else:
            connection.sync_secret_hash = hashed_sync_secret
            connection.plugin_instance_id = payload.plugin_instance_id
            connection.plugin_version = payload.plugin_version
            connection.status = "linked"

        await db_session.commit()
        return CompanionLinkExchangeResponse(
            sync_secret=raw_sync_secret,
            account_id=account.id,
            rsn=account.rsn,
            status="linked",
        )

    async def sync_account_state(
        self,
        *,
        db_session: AsyncSession,
        sync_secret: str,
        payload: CompanionSyncRequest,
    ) -> CompanionSyncResponse:
        hashed_sync_secret = self._hash_secret(sync_secret)
        connection = await db_session.scalar(
            select(CompanionConnection).where(CompanionConnection.sync_secret_hash == hashed_sync_secret)
        )
        if connection is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Companion sync secret is invalid.",
            )

        progress = await db_session.scalar(
            select(AccountProgress).where(AccountProgress.account_id == connection.account_id)
        )
        if progress is None:
            progress = AccountProgress(account_id=connection.account_id)
            db_session.add(progress)

        normalized_progress = AccountProgressUpdateRequest(
            completed_quests=self._preserve_or_replace_list(
                payload.completed_quests,
                progress.completed_quests,
            ),
            completed_diaries=self._preserve_or_replace_diaries(
                payload.completed_diaries,
                progress.completed_diaries,
            ),
            unlocked_transports=self._preserve_or_replace_list(
                payload.unlocked_transports,
                progress.unlocked_transports,
            ),
            owned_gear=self._preserve_or_replace_list(
                payload.owned_gear,
                progress.owned_gear,
            ),
            equipped_gear=self._preserve_or_replace_gear_map(
                payload.equipped_gear,
                progress.equipped_gear,
            ),
            notable_items=self._preserve_or_replace_list(
                payload.notable_items,
                progress.notable_items,
            ),
            active_unlocks=self._preserve_or_replace_list(
                payload.active_unlocks,
                progress.active_unlocks,
            ),
            companion_state=self._preserve_or_replace_state(
                payload.companion_state,
                progress.companion_state,
            ),
        )
        synced_at = datetime.now(UTC)
        progress.completed_quests = normalized_progress.completed_quests
        progress.completed_diaries = normalized_progress.completed_diaries
        progress.unlocked_transports = normalized_progress.unlocked_transports
        progress.active_unlocks = normalized_progress.active_unlocks
        progress.owned_gear = normalized_progress.owned_gear
        progress.equipped_gear = normalized_progress.equipped_gear
        progress.notable_items = normalized_progress.notable_items
        progress.companion_state = {
            **normalized_progress.companion_state,
            "source": "runelite_companion",
            "plugin_instance_id": payload.plugin_instance_id,
            "plugin_version": payload.plugin_version,
            "synced_at": synced_at.isoformat(),
        }

        connection.plugin_instance_id = payload.plugin_instance_id
        connection.plugin_version = payload.plugin_version
        connection.status = "linked"
        connection.last_synced_at = synced_at
        connection.last_payload_summary = (
            f"{len(progress.completed_quests)} quests, "
            f"{len(progress.unlocked_transports)} transports, "
            f"{len(progress.notable_items)} notable items"
        )
        await db_session.commit()
        return CompanionSyncResponse(
            account_id=connection.account_id,
            status="synced",
            detail="Companion account state synced.",
            synced_at=synced_at,
        )


companion_service = CompanionService()
