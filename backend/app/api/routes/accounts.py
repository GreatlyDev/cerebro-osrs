from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.account import (
    AccountCreateRequest,
    AccountListResponse,
    AccountResponse,
    AccountSnapshotResponse,
    AccountSyncResponse,
)
from app.schemas.account_progress import AccountProgressResponse, AccountProgressUpdateRequest
from app.services.accounts import account_service

router = APIRouter()


@router.get("", response_model=AccountListResponse, summary="List OSRS accounts")
async def list_accounts(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountListResponse:
    return await account_service.list_accounts(db_session=db_session, user=current_user)


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an OSRS account",
)
async def create_account(
    payload: AccountCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountResponse:
    return await account_service.create_account(
        db_session=db_session,
        user=current_user,
        payload=payload,
    )


@router.get(
    "/{account_id}",
    response_model=AccountResponse,
    summary="Get an OSRS account",
)
async def get_account(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountResponse:
    return await account_service.get_account(
        db_session=db_session,
        user=current_user,
        account_id=account_id,
    )


@router.get(
    "/{account_id}/progress",
    response_model=AccountProgressResponse,
    summary="Get account progression unlocks",
)
async def get_account_progress(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountProgressResponse:
    return await account_service.get_account_progress(
        db_session=db_session,
        user=current_user,
        account_id=account_id,
    )


@router.patch(
    "/{account_id}/progress",
    response_model=AccountProgressResponse,
    summary="Update account progression unlocks",
)
async def update_account_progress(
    account_id: int,
    payload: AccountProgressUpdateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountProgressResponse:
    return await account_service.update_account_progress(
        db_session=db_session,
        user=current_user,
        account_id=account_id,
        payload=payload,
    )


@router.post(
    "/{account_id}/sync",
    response_model=AccountSyncResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request an account sync",
)
async def sync_account(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountSyncResponse:
    return await account_service.sync_account(
        db_session=db_session,
        user=current_user,
        account_id=account_id,
    )


@router.get(
    "/{account_id}/snapshot",
    response_model=AccountSnapshotResponse,
    summary="Get the latest account snapshot",
)
async def get_account_snapshot(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AccountSnapshotResponse:
    return await account_service.get_account_snapshot(
        db_session=db_session,
        user=current_user,
        account_id=account_id,
    )
