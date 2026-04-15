from datetime import UTC, datetime

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.osrs_ingestion import osrs_account_ingestion_service
from app.integrations.osrs_hiscores import (
    OSRSHiscoresNotFoundError,
)
from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.account_snapshot import AccountSnapshot
from app.models.user import User
from app.schemas.account import (
    AccountCreateRequest,
    AccountListResponse,
    AccountResponse,
    AccountSnapshotListResponse,
    AccountSnapshotResponse,
    AccountSyncResponse,
)
from app.schemas.account_progress import AccountProgressResponse, AccountProgressUpdateRequest


class AccountService:
    def __init__(self) -> None:
        self.ingestion_service = osrs_account_ingestion_service

    async def _get_account_or_404(
        self,
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

    async def list_accounts(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> AccountListResponse:
        accounts = list(
            (
                await db_session.scalars(
                    select(Account).where(Account.user_id == user.id).order_by(Account.id)
                )
            ).all()
        )
        return AccountListResponse(
            items=[AccountResponse.model_validate(account) for account in accounts],
            total=len(accounts),
        )

    async def get_account(
        self,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> AccountResponse:
        account = await self._get_account_or_404(
            db_session=db_session,
            user=user,
            account_id=account_id,
        )
        return AccountResponse.model_validate(account)

    async def _get_or_create_progress(
        self,
        db_session: AsyncSession,
        account_id: int,
    ) -> AccountProgress:
        progress = await db_session.scalar(
            select(AccountProgress).where(AccountProgress.account_id == account_id)
        )
        if progress is not None:
            return progress

        progress = AccountProgress(account_id=account_id)
        db_session.add(progress)
        await db_session.commit()
        await db_session.refresh(progress)
        return progress

    async def get_account_progress(
        self,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> AccountProgressResponse:
        await self._get_account_or_404(db_session=db_session, user=user, account_id=account_id)
        progress = await self._get_or_create_progress(db_session=db_session, account_id=account_id)
        return AccountProgressResponse.model_validate(progress)

    async def update_account_progress(
        self,
        db_session: AsyncSession,
        user: User,
        account_id: int,
        payload: AccountProgressUpdateRequest,
    ) -> AccountProgressResponse:
        await self._get_account_or_404(db_session=db_session, user=user, account_id=account_id)
        progress = await self._get_or_create_progress(db_session=db_session, account_id=account_id)
        progress.completed_quests = payload.completed_quests
        progress.completed_diaries = payload.completed_diaries
        progress.unlocked_transports = payload.unlocked_transports
        progress.owned_gear = payload.owned_gear
        progress.equipped_gear = payload.equipped_gear
        progress.notable_items = payload.notable_items
        progress.active_unlocks = payload.active_unlocks
        progress.companion_state = payload.companion_state
        await db_session.commit()
        await db_session.refresh(progress)
        return AccountProgressResponse.model_validate(progress)

    async def create_account(
        self,
        db_session: AsyncSession,
        user: User,
        payload: AccountCreateRequest,
    ) -> AccountResponse:
        existing_account = await db_session.scalar(
            select(Account).where(Account.user_id == user.id, Account.rsn == payload.rsn)
        )
        if existing_account is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with that RSN already exists.",
            )

        account = Account(user_id=user.id, rsn=payload.rsn)
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        return AccountResponse.model_validate(account)

    async def sync_account(
        self,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> AccountSyncResponse:
        account = await self._get_account_or_404(
            db_session=db_session,
            user=user,
            account_id=account_id,
        )

        try:
            summary = await self.ingestion_service.fetch_enriched_account_summary(account.rsn)
        except OSRSHiscoresNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"OSRS hiscores entry not found for '{account.rsn}'.",
            ) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach OSRS hiscores right now.",
            ) from exc

        snapshot = AccountSnapshot(
            account_id=account.id,
            source="osrs_hiscores",
            sync_status="completed",
            summary={**summary, "synced_at": datetime.now(UTC).isoformat()},
        )
        db_session.add(snapshot)
        await db_session.commit()
        await db_session.refresh(snapshot)

        return AccountSyncResponse(
            account_id=account.id,
            status="accepted",
            detail="Account sync completed from OSRS hiscores and snapshot stored.",
            snapshot_id=snapshot.id,
        )

    async def get_account_snapshot(
        self,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> AccountSnapshotResponse:
        await self._get_account_or_404(db_session=db_session, user=user, account_id=account_id)

        snapshot = await db_session.scalar(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account_id)
            .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
        )
        if snapshot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No snapshot found for this account.",
            )

        return AccountSnapshotResponse.model_validate(snapshot)

    async def list_account_snapshots(
        self,
        db_session: AsyncSession,
        user: User,
        account_id: int,
        limit: int = 5,
    ) -> AccountSnapshotListResponse:
        await self._get_account_or_404(db_session=db_session, user=user, account_id=account_id)

        snapshots = list(
            (
                await db_session.scalars(
                    select(AccountSnapshot)
                    .where(AccountSnapshot.account_id == account_id)
                    .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
                    .limit(limit)
                )
            ).all()
        )

        return AccountSnapshotListResponse(
            items=[AccountSnapshotResponse.model_validate(snapshot) for snapshot in snapshots],
            total=len(snapshots),
        )


account_service = AccountService()
