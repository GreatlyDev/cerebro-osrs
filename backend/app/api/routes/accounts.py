from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.account import (
    AccountCreateRequest,
    AccountResponse,
    AccountSnapshotResponse,
    AccountSyncResponse,
)
from app.services.accounts import account_service

router = APIRouter()


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an OSRS account",
)
async def create_account(
    payload: AccountCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> AccountResponse:
    return await account_service.create_account(db_session=db_session, payload=payload)


@router.post(
    "/{account_id}/sync",
    response_model=AccountSyncResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request an account sync",
)
async def sync_account(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> AccountSyncResponse:
    return await account_service.sync_account(db_session=db_session, account_id=account_id)


@router.get(
    "/{account_id}/snapshot",
    response_model=AccountSnapshotResponse,
    summary="Get the latest account snapshot",
)
async def get_account_snapshot(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> AccountSnapshotResponse:
    return await account_service.get_account_snapshot(
        db_session=db_session,
        account_id=account_id,
    )
