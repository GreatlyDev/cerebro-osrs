from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest


class ProfileService:
    async def _get_or_create_profile(
        self,
        db_session: AsyncSession,
    ) -> Profile:
        profile = await db_session.get(Profile, 1)
        if profile is not None:
            return profile

        profile = Profile(id=1)
        db_session.add(profile)
        await db_session.commit()
        await db_session.refresh(profile)
        return profile

    async def get_profile(
        self,
        db_session: AsyncSession,
    ) -> ProfileResponse:
        profile = await self._get_or_create_profile(db_session=db_session)
        return ProfileResponse.model_validate(profile)

    async def update_profile(
        self,
        db_session: AsyncSession,
        payload: ProfileUpdateRequest,
    ) -> ProfileResponse:
        profile = await self._get_or_create_profile(db_session=db_session)

        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field_name, value)

        await db_session.commit()
        await db_session.refresh(profile)

        return ProfileResponse.model_validate(profile)


profile_service = ProfileService()
