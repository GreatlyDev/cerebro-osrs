from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest
from app.services.profile import profile_service

router = APIRouter()


@router.get("", response_model=ProfileResponse, summary="Get user profile")
async def get_profile(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    return await profile_service.get_profile(db_session=db_session, user=current_user)


@router.patch("", response_model=ProfileResponse, summary="Update user profile")
async def update_profile(
    payload: ProfileUpdateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    return await profile_service.update_profile(
        db_session=db_session,
        user=current_user,
        payload=payload,
    )
