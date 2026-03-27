from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.skill import SkillListResponse, SkillRecommendationListResponse
from app.services.skills import skill_service

router = APIRouter()


@router.get("", response_model=SkillListResponse, summary="List skills")
async def list_skills() -> SkillListResponse:
    return skill_service.list_skills()


@router.get(
    "/{skill_name}/recommendations",
    response_model=SkillRecommendationListResponse,
    summary="Get skill recommendations",
)
async def get_skill_recommendations(
    skill_name: str,
    account_rsn: str | None = Query(default=None, max_length=12),
    preference: str | None = Query(default=None, max_length=24),
    db_session: AsyncSession = Depends(get_db_session),
) -> SkillRecommendationListResponse:
    return await skill_service.get_recommendations(
        db_session=db_session,
        skill_name=skill_name,
        account_rsn=account_rsn,
        preference=preference,
    )
