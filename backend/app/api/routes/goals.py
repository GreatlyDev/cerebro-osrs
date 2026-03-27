from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.goal import GoalCreateRequest, GoalListResponse, GoalPlanResponse, GoalResponse
from app.services.goals import goal_service

router = APIRouter()


@router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a goal",
)
async def create_goal(
    payload: GoalCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GoalResponse:
    return await goal_service.create_goal(
        db_session=db_session,
        user=current_user,
        payload=payload,
    )


@router.get("", response_model=GoalListResponse, summary="List goals")
async def list_goals(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GoalListResponse:
    return await goal_service.list_goals(db_session=db_session, user=current_user)


@router.post(
    "/{goal_id}/plan",
    response_model=GoalPlanResponse,
    summary="Generate a goal plan",
)
async def generate_goal_plan(
    goal_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GoalPlanResponse:
    return await goal_service.generate_plan(
        db_session=db_session,
        user=current_user,
        goal_id=goal_id,
    )
