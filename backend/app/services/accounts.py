from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot
from app.schemas.account import (
    AccountCreateRequest,
    AccountResponse,
    AccountSnapshotResponse,
    AccountSyncResponse,
)


class AccountService:
    async def _get_account_or_404(
        self,
        db_session: AsyncSession,
        account_id: int,
    ) -> Account:
        account = await db_session.get(Account, account_id)
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found.",
            )
        return account

    async def create_account(
        self,
        db_session: AsyncSession,
        payload: AccountCreateRequest,
    ) -> AccountResponse:
        existing_account = await db_session.scalar(
            select(Account).where(Account.rsn == payload.rsn)
        )
        if existing_account is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with that RSN already exists.",
            )

        account = Account(rsn=payload.rsn)
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        return AccountResponse.model_validate(account)

    async def sync_account(
        self,
        db_session: AsyncSession,
        account_id: int,
    ) -> AccountSyncResponse:
        account = await self._get_account_or_404(db_session=db_session, account_id=account_id)

        snapshot = AccountSnapshot(
            account_id=account.id,
            source="manual",
            sync_status="completed",
            summary={
                "synced_at": datetime.now(UTC).isoformat(),
                "rsn": account.rsn,
                "message": "Initial account sync completed.",
            },
        )
        db_session.add(snapshot)
        await db_session.commit()
        await db_session.refresh(snapshot)

        return AccountSyncResponse(
            account_id=account.id,
            status="accepted",
            detail="Account sync completed and snapshot stored.",
            snapshot_id=snapshot.id,
        )

    async def get_account_snapshot(
        self,
        db_session: AsyncSession,
        account_id: int,
    ) -> AccountSnapshotResponse:
        await self._get_account_or_404(db_session=db_session, account_id=account_id)

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


account_service = AccountService()
