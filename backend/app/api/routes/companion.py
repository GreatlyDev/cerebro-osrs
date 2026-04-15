from typing import Annotated

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.companion import (
    CompanionLinkExchangeRequest,
    CompanionLinkExchangeResponse,
    CompanionLinkSessionResponse,
    CompanionSyncRequest,
    CompanionSyncResponse,
)
from app.services.companion import companion_service

router = APIRouter()


@router.post(
    "/accounts/{account_id}/link-sessions",
    response_model=CompanionLinkSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a short-lived companion link token",
)
async def create_link_session(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CompanionLinkSessionResponse:
    return await companion_service.create_link_session(
        db_session=db_session,
        user=current_user,
        account_id=account_id,
    )


@router.post(
    "/link",
    response_model=CompanionLinkExchangeResponse,
    summary="Exchange a link token for a scoped sync secret",
)
async def exchange_link_token(
    payload: CompanionLinkExchangeRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> CompanionLinkExchangeResponse:
    return await companion_service.exchange_link_token(
        db_session=db_session,
        payload=payload,
    )


@router.post(
    "/sync",
    response_model=CompanionSyncResponse,
    summary="Sync companion account state with a scoped sync secret",
)
async def sync_companion_state(
    payload: CompanionSyncRequest,
    x_cerebro_sync_secret: Annotated[str, Header()],
    db_session: AsyncSession = Depends(get_db_session),
) -> CompanionSyncResponse:
    return await companion_service.sync_account_state(
        db_session=db_session,
        sync_secret=x_cerebro_sync_secret,
        payload=payload,
    )
