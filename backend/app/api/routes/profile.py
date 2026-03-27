from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest
from app.services.profile import profile_service

router = APIRouter()


@router.get("", response_model=ProfileResponse, summary="Get user profile")
async def get_profile(
    db_session: AsyncSession = Depends(get_db_session),
) -> ProfileResponse:
    return await profile_service.get_profile(db_session=db_session)


@router.patch("", response_model=ProfileResponse, summary="Update user profile")
async def update_profile(
    payload: ProfileUpdateRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> ProfileResponse:
    return await profile_service.update_profile(db_session=db_session, payload=payload)
