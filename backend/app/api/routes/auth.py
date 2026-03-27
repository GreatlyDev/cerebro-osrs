from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, AuthUserResponse, DevLoginRequest
from app.services.auth import auth_service

router = APIRouter()


@router.post("/dev-login", response_model=AuthSessionResponse, summary="Create a dev session")
async def dev_login(
    payload: DevLoginRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    return await auth_service.sign_in_dev(db_session=db_session, payload=payload)


@router.get("/session", response_model=AuthUserResponse, summary="Get current session user")
async def get_session(
    current_user: User = Depends(get_current_user),
) -> AuthUserResponse:
    return AuthUserResponse.model_validate(current_user)
