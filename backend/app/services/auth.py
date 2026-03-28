import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.auth import AuthSessionResponse, AuthUserResponse, DevLoginRequest, EmailPasswordAuthRequest


class AuthService:
    async def register(
        self,
        db_session: AsyncSession,
        payload: EmailPasswordAuthRequest,
    ) -> AuthSessionResponse:
        normalized_email = payload.email.strip().lower()
        user = await db_session.scalar(select(User).where(User.email == normalized_email))

        if user is None:
            display_name = payload.display_name or normalized_email.split("@", maxsplit=1)[0]
            user = User(
                email=normalized_email,
                display_name=display_name,
                password_hash=hash_password(payload.password),
            )
            db_session.add(user)
            await db_session.flush()
        elif user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with that email already exists.",
            )
        else:
            user.display_name = payload.display_name or user.display_name
            user.password_hash = hash_password(payload.password)

        session = await self._create_session(db_session=db_session, user=user)
        return AuthSessionResponse(
            user=AuthUserResponse.model_validate(user),
            session_token=session.token,
        )

    async def login(
        self,
        db_session: AsyncSession,
        payload: EmailPasswordAuthRequest,
    ) -> AuthSessionResponse:
        normalized_email = payload.email.strip().lower()
        user = await db_session.scalar(select(User).where(User.email == normalized_email))

        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if payload.display_name:
            user.display_name = payload.display_name

        session = await self._create_session(db_session=db_session, user=user)
        return AuthSessionResponse(
            user=AuthUserResponse.model_validate(user),
            session_token=session.token,
        )

    async def sign_in_dev(
        self,
        db_session: AsyncSession,
        payload: DevLoginRequest,
    ) -> AuthSessionResponse:
        normalized_email = payload.email.strip().lower()
        user = await db_session.scalar(select(User).where(User.email == normalized_email))

        if user is None:
            display_name = payload.display_name or normalized_email.split("@", maxsplit=1)[0]
            user = User(email=normalized_email, display_name=display_name)
            db_session.add(user)
            await db_session.flush()
        elif payload.display_name:
            user.display_name = payload.display_name

        session = await self._create_session(db_session=db_session, user=user)

        return AuthSessionResponse(
            user=AuthUserResponse.model_validate(user),
            session_token=session.token,
        )

    async def get_user_for_token(
        self,
        db_session: AsyncSession,
        session_token: str,
    ) -> User:
        session = await db_session.scalar(
            select(UserSession).where(UserSession.token == session_token)
        )
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session.",
            )

        user = await db_session.get(User, session.user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session user no longer exists.",
            )
        return user

    async def _create_session(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> UserSession:
        session = UserSession(user_id=user.id, token=secrets.token_urlsafe(32))
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(user)
        return session


auth_service = AuthService()
