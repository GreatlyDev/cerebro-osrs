from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
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
) -> GearRecommendationResponse:
    return await gear_service.get_recommendations(db_session=db_session, payload=payload)
