from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.goal import Goal
from app.models.profile import Profile
from app.models.user import User


class UserContextService:
    async def get_profile(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Profile | None:
        return await db_session.scalar(select(Profile).where(Profile.user_id == user.id))

    async def get_latest_goal(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Goal | None:
        return await db_session.scalar(
            select(Goal).where(Goal.user_id == user.id).order_by(desc(Goal.id))
        )

    async def get_latest_account(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Account | None:
        return await db_session.scalar(
            select(Account).where(Account.user_id == user.id).order_by(desc(Account.id))
        )


user_context_service = UserContextService()
