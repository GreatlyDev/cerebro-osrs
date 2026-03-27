from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest


class ProfileService:
    async def _get_or_create_profile(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> Profile:
        profile = await db_session.scalar(select(Profile).where(Profile.user_id == user.id))
        if profile is not None:
            return profile

        profile = Profile(user_id=user.id, display_name=user.display_name)
        db_session.add(profile)
        await db_session.commit()
        await db_session.refresh(profile)
        return profile

    async def get_profile(
        self,
        db_session: AsyncSession,
        user: User,
    ) -> ProfileResponse:
        profile = await self._get_or_create_profile(db_session=db_session, user=user)
        return ProfileResponse.model_validate(profile)

    async def update_profile(
        self,
        db_session: AsyncSession,
        user: User,
        payload: ProfileUpdateRequest,
    ) -> ProfileResponse:
        profile = await self._get_or_create_profile(db_session=db_session, user=user)

        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field_name, value)

        await db_session.commit()
        await db_session.refresh(profile)

        return ProfileResponse.model_validate(profile)


profile_service = ProfileService()
