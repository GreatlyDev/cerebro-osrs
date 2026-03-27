import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.auth import AuthSessionResponse, AuthUserResponse, DevLoginRequest


class AuthService:
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

        session = UserSession(user_id=user.id, token=secrets.token_urlsafe(32))
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(user)

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


auth_service = AuthService()
