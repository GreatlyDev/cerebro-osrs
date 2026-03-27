from math import floor
from typing import Any

from app.integrations.osrs_hiscores import OSRSHiscoresClient, osrs_hiscores_client

COMBAT_SKILLS = ["attack", "strength", "defence", "hitpoints", "ranged", "prayer", "magic"]
GATHERING_SKILLS = ["mining", "fishing", "woodcutting", "hunter", "farming"]
ARTISAN_SKILLS = ["cooking", "crafting", "fletching", "firemaking", "herblore", "runecraft", "smithing", "construction"]
UTILITY_SKILLS = ["agility", "thieving", "slayer"]


class OSRSAccountIngestionService:
    def __init__(self, hiscores_client: OSRSHiscoresClient) -> None:
        self.hiscores_client = hiscores_client

    async def fetch_enriched_account_summary(self, rsn: str) -> dict[str, Any]:
        summary = await self.hiscores_client.fetch_account_summary(rsn)
        return self._enrich_summary(summary)

    def _enrich_summary(self, summary: dict[str, Any]) -> dict[str, Any]:
        skills = summary.get("skills", {})
        top_skills = self._top_skills(skills)
        category_levels = {
            "combat": self._category_summary(skills, COMBAT_SKILLS),
            "gathering": self._category_summary(skills, GATHERING_SKILLS),
            "artisan": self._category_summary(skills, ARTISAN_SKILLS),
            "utility": self._category_summary(skills, UTILITY_SKILLS),
        }
        enriched = {
            **summary,
            "combat_level": self._combat_level(skills),
            "top_skills": top_skills,
            "skill_categories": category_levels,
            "progression_profile": {
                "highest_skill": top_skills[0]["skill"] if top_skills else None,
                "lowest_tracked_skill": self._lowest_skill(skills),
                "total_skills_at_99": self._skills_at_or_above(skills, 99),
                "total_skills_at_90_plus": self._skills_at_or_above(skills, 90),
            },
            "activity_overview": {
                "tracked_activity_count": int(summary.get("activity_row_count", 0) or 0),
                "active_activity_count": self._active_activity_count(summary.get("activity_metrics")),
            },
        }
        return enriched

    def _combat_level(self, skills: dict[str, Any]) -> int:
        def level(skill_name: str) -> int:
            skill = skills.get(skill_name, {})
            if not isinstance(skill, dict):
                return 1
            return int(skill.get("level", 1) or 1)

        attack = level("attack")
        strength = level("strength")
        defence = level("defence")
        hitpoints = level("hitpoints")
        ranged = level("ranged")
        prayer = level("prayer")
        magic = level("magic")

        base = 0.25 * (defence + hitpoints + floor(prayer / 2))
        melee = 0.325 * (attack + strength)
        ranged_based = 0.325 * floor(ranged * 1.5)
        magic_based = 0.325 * floor(magic * 1.5)
        return int(floor(base + max(melee, ranged_based, magic_based)))

    def _top_skills(self, skills: dict[str, Any], limit: int = 5) -> list[dict[str, Any]]:
        ranked: list[dict[str, Any]] = []
        for skill_name, data in skills.items():
            if skill_name == "overall" or not isinstance(data, dict):
                continue
            ranked.append(
                {
                    "skill": skill_name,
                    "level": int(data.get("level", 1) or 1),
                    "experience": int(data.get("experience", 0) or 0),
                }
            )
        ranked.sort(key=lambda item: (-item["level"], -item["experience"], item["skill"]))
        return ranked[:limit]

    def _category_summary(self, skills: dict[str, Any], names: list[str]) -> dict[str, Any]:
        levels = []
        for skill_name in names:
            data = skills.get(skill_name, {})
            if isinstance(data, dict):
                levels.append(int(data.get("level", 1) or 1))
        if not levels:
            return {"average_level": 1, "highest_level": 1, "lowest_level": 1}
        return {
            "average_level": round(sum(levels) / len(levels), 2),
            "highest_level": max(levels),
            "lowest_level": min(levels),
        }

    def _lowest_skill(self, skills: dict[str, Any]) -> str | None:
        ranked = self._top_skills(skills, limit=len(skills))
        if not ranked:
            return None
        ranked.sort(key=lambda item: (item["level"], item["experience"], item["skill"]))
        return ranked[0]["skill"]

    def _skills_at_or_above(self, skills: dict[str, Any], threshold: int) -> int:
        return sum(
            1
            for skill_name, data in skills.items()
            if skill_name != "overall" and isinstance(data, dict) and int(data.get("level", 1) or 1) >= threshold
        )

    def _active_activity_count(self, activity_metrics: Any) -> int:
        if not isinstance(activity_metrics, list):
            return 0
        return sum(
            1
            for row in activity_metrics
            if isinstance(row, dict) and int(row.get("rank", -1) or -1) >= 0 and int(row.get("score", -1) or -1) > 0
        )


osrs_account_ingestion_service = OSRSAccountIngestionService(osrs_hiscores_client)
