from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    AuthUserResponse,
    DevLoginRequest,
    EmailPasswordAuthRequest,
    LogoutResponse,
)
from app.services.auth import auth_service

router = APIRouter()


@router.post("/dev-login", response_model=AuthSessionResponse, summary="Create a dev session")
async def dev_login(
    payload: DevLoginRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    return await auth_service.sign_in_dev(db_session=db_session, payload=payload)


@router.post("/register", response_model=AuthSessionResponse, summary="Register with email and password")
async def register(
    payload: EmailPasswordAuthRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    return await auth_service.register(db_session=db_session, payload=payload)


@router.post("/login", response_model=AuthSessionResponse, summary="Sign in with email and password")
async def login(
    payload: EmailPasswordAuthRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    return await auth_service.login(db_session=db_session, payload=payload)


@router.get("/session", response_model=AuthUserResponse, summary="Get current session user")
async def get_session(
    current_user: User = Depends(get_current_user),
) -> AuthUserResponse:
    return AuthUserResponse.model_validate(current_user)


@router.post("/logout", response_model=LogoutResponse, summary="Revoke current session")
async def logout(
    authorization: Annotated[str | None, Header()] = None,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> LogoutResponse:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session token.",
        )

    session_token = authorization.removeprefix("Bearer ").strip()
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session token.",
        )

    await auth_service.revoke_session(
        db_session=db_session,
        session_token=session_token,
    )
    return LogoutResponse(detail=f"Signed out {current_user.email}.")
