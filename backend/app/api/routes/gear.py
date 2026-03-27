from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.gear import GearRecommendationRequest, GearRecommendationResponse
from app.services.gear import gear_service

router = APIRouter()


@router.post(
    "/recommendations",
    response_model=GearRecommendationResponse,
    summary="Get gear upgrade recommendations",
)
async def get_gear_recommendations(
    payload: GearRecommendationRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GearRecommendationResponse:
    return await gear_service.get_recommendations(
        db_session=db_session,
        user=current_user,
        payload=payload,
    )
