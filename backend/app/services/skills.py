from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot
from app.models.profile import Profile
from app.models.user import User
from app.services.user_context import user_context_service
from app.schemas.skill import (
    SkillListResponse,
    SkillRecommendation,
    SkillRecommendationListResponse,
    SkillSummary,
)

SKILL_CATALOG: list[SkillSummary] = [
    SkillSummary(key="attack", label="Attack", category="combat"),
    SkillSummary(key="strength", label="Strength", category="combat"),
    SkillSummary(key="defence", label="Defence", category="combat"),
    SkillSummary(key="magic", label="Magic", category="combat"),
    SkillSummary(key="ranged", label="Ranged", category="combat"),
    SkillSummary(key="fishing", label="Fishing", category="gathering"),
    SkillSummary(key="woodcutting", label="Woodcutting", category="gathering"),
]

SKILL_RECOMMENDATIONS: dict[str, list[SkillRecommendation]] = {
    "attack": [
        SkillRecommendation(
            method="Sand Crabs",
            preference="afk",
            min_level=1,
            max_level=60,
            estimated_xp_rate="20k-45k xp/hr",
            requirements=["Basic melee gear"],
            rationale="Steady low-attention melee training with simple setup.",
            tags=["afk", "combat", "starter"],
        ),
        SkillRecommendation(
            method="Nightmare Zone",
            preference="afk",
            min_level=60,
            max_level=99,
            estimated_xp_rate="55k-90k xp/hr",
            requirements=["Quest unlocks", "Absorption setup"],
            rationale="One of the most efficient low-attention combat options after early game.",
            tags=["afk", "midgame", "combat"],
        ),
    ],
    "strength": [
        SkillRecommendation(
            method="Sand Crabs",
            preference="afk",
            min_level=1,
            max_level=70,
            estimated_xp_rate="20k-50k xp/hr",
            requirements=["Basic melee gear"],
            rationale="Simple strength training while keeping decisions light.",
            tags=["afk", "combat"],
        ),
        SkillRecommendation(
            method="Slayer melee tasks",
            preference="balanced",
            min_level=55,
            max_level=99,
            estimated_xp_rate="35k-70k xp/hr",
            requirements=["Slayer unlocks", "Task gear"],
            rationale="Combines strength progress with broader account unlocks.",
            tags=["balanced", "slayer", "progression"],
        ),
    ],
    "magic": [
        SkillRecommendation(
            method="High Alchemy",
            preference="afk",
            min_level=55,
            max_level=99,
            estimated_xp_rate="55k-78k xp/hr",
            requirements=["Nature runes", "Profitable alchs list"],
            rationale="Good low-attention magic xp with flexibility to limit losses.",
            tags=["afk", "magic", "utility"],
        ),
        SkillRecommendation(
            method="Bursting Slayer tasks",
            preference="fastest",
            min_level=70,
            max_level=99,
            estimated_xp_rate="120k-220k xp/hr",
            requirements=["Ancient Magicks", "Burst runes", "Task selection"],
            rationale="Top-end magic xp while building slayer progression.",
            tags=["fastest", "magic", "slayer"],
        ),
    ],
    "fishing": [
        SkillRecommendation(
            method="Barbarian Fishing",
            preference="fastest",
            min_level=58,
            max_level=99,
            estimated_xp_rate="45k-75k xp/hr",
            requirements=["Barbarian Training"],
            rationale="Strong fishing xp with useful passive agility and strength gains.",
            tags=["fastest", "skilling", "efficient"],
        ),
        SkillRecommendation(
            method="Karambwans",
            preference="profitable",
            min_level=65,
            max_level=99,
            estimated_xp_rate="30k-45k xp/hr",
            requirements=["Tai Bwo Wannai Trio", "Fairy ring access preferred"],
            rationale="Reliable click rhythm with a decent profit profile.",
            tags=["profitable", "skilling", "midgame"],
        ),
    ],
    "woodcutting": [
        SkillRecommendation(
            method="Sulliusceps",
            preference="fastest",
            min_level=65,
            max_level=99,
            estimated_xp_rate="70k-95k xp/hr",
            requirements=["Bone Voyage"],
            rationale="Excellent xp once unlocked, especially if focusing purely on levels.",
            tags=["fastest", "skilling"],
        ),
        SkillRecommendation(
            method="Yew trees",
            preference="afk",
            min_level=60,
            max_level=99,
            estimated_xp_rate="20k-40k xp/hr",
            requirements=["Accessible yew spot"],
            rationale="Easy low-intensity cutting when attention is limited.",
            tags=["afk", "skilling"],
        ),
    ],
    "ranged": [
        SkillRecommendation(
            method="Cannon + Slayer tasks",
            preference="fastest",
            min_level=40,
            max_level=99,
            estimated_xp_rate="60k-120k xp/hr",
            requirements=["Dwarf Cannon", "Cannonballs"],
            rationale="Fast ranged progress while building other unlocks through slayer.",
            tags=["fastest", "combat", "slayer"],
        ),
        SkillRecommendation(
            method="Ammonite Crabs",
            preference="afk",
            min_level=1,
            max_level=75,
            estimated_xp_rate="25k-55k xp/hr",
            requirements=["Bone Voyage"],
            rationale="Simple low-maintenance ranged training with minimal complexity.",
            tags=["afk", "combat"],
        ),
    ],
    "defence": [
        SkillRecommendation(
            method="Nightmare Zone",
            preference="afk",
            min_level=70,
            max_level=99,
            estimated_xp_rate="50k-85k xp/hr",
            requirements=["Quest unlocks", "Absorption setup"],
            rationale="Strong defensive xp with low click intensity once unlocked.",
            tags=["afk", "combat"],
        ),
        SkillRecommendation(
            method="Slayer melee tasks",
            preference="balanced",
            min_level=40,
            max_level=99,
            estimated_xp_rate="30k-65k xp/hr",
            requirements=["Task gear"],
            rationale="Builds defence while also progressing the broader account.",
            tags=["balanced", "progression", "combat"],
        ),
    ],
}


class SkillService:
    def list_skills(self) -> SkillListResponse:
        return SkillListResponse(items=SKILL_CATALOG, total=len(SKILL_CATALOG))

    async def get_recommendations(
        self,
        db_session: AsyncSession,
        user: User,
        skill_name: str,
        account_rsn: str | None,
        preference: str | None,
    ) -> SkillRecommendationListResponse:
        normalized_skill = skill_name.strip().lower()
        if normalized_skill not in SKILL_RECOMMENDATIONS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill '{skill_name}' is not supported yet.",
            )

        effective_preference = await self._resolve_preference(
            db_session=db_session,
            user=user,
            preference=preference,
        )
        current_level = await self._get_current_level(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
            skill_name=normalized_skill,
        )

        all_recommendations = SKILL_RECOMMENDATIONS[normalized_skill]
        filtered = [
            recommendation
            for recommendation in all_recommendations
            if recommendation.preference == effective_preference
        ] or all_recommendations

        leveled = [
            recommendation
            for recommendation in filtered
            if current_level is None
            or recommendation.min_level <= current_level <= recommendation.max_level
            or current_level < recommendation.min_level
        ]

        return SkillRecommendationListResponse(
            skill=normalized_skill,
            account_rsn=account_rsn,
            preference=effective_preference,
            current_level=current_level,
            recommendations=leveled or filtered,
            context={
                "profile_preference_applied": preference is None,
                "snapshot_used": current_level is not None,
            },
        )

    async def _resolve_preference(
        self,
        db_session: AsyncSession,
        user: User,
        preference: str | None,
    ) -> str:
        if preference:
            return preference.strip().lower()

        profile = await user_context_service.get_profile(db_session=db_session, user=user)
        if profile is None:
            return "balanced"
        if profile.prefers_afk_methods:
            return "afk"
        if profile.prefers_profitable_methods:
            return "profitable"
        return "balanced"

    async def _get_current_level(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
        skill_name: str,
    ) -> int | None:
        if account_rsn is None:
            return None

        account = await db_session.scalar(
            select(Account).where(Account.user_id == user.id, Account.rsn == account_rsn)
        )
        if account is None:
            return None

        snapshot = await db_session.scalar(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account.id)
            .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
        )
        if snapshot is None:
            return None

        skill_data = snapshot.summary.get("skills", {}).get(skill_name)
        if not isinstance(skill_data, dict):
            return None

        level = skill_data.get("level")
        return int(level) if isinstance(level, int) else None


skill_service = SkillService()
