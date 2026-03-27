from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.teleport import TeleportRouteRequest, TeleportRouteResponse
from app.services.teleports import teleport_service

router = APIRouter()


@router.post("/route", response_model=TeleportRouteResponse, summary="Get best teleport routes")
async def get_teleport_route(
    payload: TeleportRouteRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> TeleportRouteResponse:
    return await teleport_service.get_route(db_session=db_session, payload=payload)
