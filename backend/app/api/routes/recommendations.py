from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.recommendation import NextActionRequest, NextActionResponse
from app.services.recommendations import recommendation_service

router = APIRouter()


@router.get(
    "/next-actions",
    response_model=NextActionResponse,
    summary="Get ranked next-best actions",
)
async def get_next_actions(
    account_rsn: str | None = Query(default=None, max_length=12),
    goal_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=4, ge=1, le=10),
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> NextActionResponse:
    return await recommendation_service.get_next_actions(
        db_session=db_session,
        user=current_user,
        payload=NextActionRequest(
            account_rsn=account_rsn,
            goal_id=goal_id,
            limit=limit,
        ),
    )
