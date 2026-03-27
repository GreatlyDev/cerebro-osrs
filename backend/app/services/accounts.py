from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.schemas.account import (
    AccountCreateRequest,
    AccountResponse,
    AccountSnapshotResponse,
    AccountSyncResponse,
)


class AccountService:
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
        del db_session, account_id
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Account syncing is not implemented yet.",
        )

    async def get_account_snapshot(
        self,
        db_session: AsyncSession,
        account_id: int,
    ) -> AccountSnapshotResponse:
        del db_session, account_id
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Account snapshots are not implemented yet.",
        )


account_service = AccountService()
