from collections.abc import Iterable


BOSS_PROFILES: dict[str, dict[str, object]] = {
    "fight-caves": {
        "label": "Fight Caves",
        "aliases": ["fight caves", "jad", "fire cape"],
        "skill_requirements": {
            "ranged": 70,
            "defence": 70,
            "hitpoints": 70,
            "prayer": 43,
        },
        "unlock_requirements": [],
        "notes": "A stable ranged setup and prayer management are the main practical checkpoints.",
    },
    "barrows": {
        "label": "Barrows",
        "aliases": ["barrows"],
        "skill_requirements": {
            "magic": 50,
            "hitpoints": 55,
        },
        "unlock_requirements": ["canifis access"],
        "notes": "Reliable teleport routing and basic sustain matter more than extreme stats here.",
    },
    "demonic-gorillas": {
        "label": "Demonic Gorillas",
        "aliases": ["demonic gorillas", "zenytes"],
        "skill_requirements": {
            "ranged": 75,
            "strength": 70,
            "defence": 70,
        },
        "unlock_requirements": ["monkey madness ii"],
        "notes": "This is a strong profit and upgrade path once the quest unlock and swaps feel comfortable.",
    },
}


class BossAdvisorService:
    def detect_boss_id(self, normalized_message: str) -> str | None:
        for boss_id, profile in BOSS_PROFILES.items():
            aliases = profile.get("aliases", [])
            if any(alias in normalized_message for alias in aliases if isinstance(alias, str)):
                return boss_id
        return None

    def evaluate_readiness(
        self,
        *,
        boss_id: str,
        skills: dict[str, dict[str, int]] | None,
        unlocked_transports: Iterable[str] | None = None,
        completed_quests: Iterable[str] | None = None,
    ) -> dict[str, object]:
        profile = BOSS_PROFILES[boss_id]
        completed_set = {item.strip().lower() for item in (completed_quests or [])}
        unlocked_set = {item.strip().lower() for item in (unlocked_transports or [])}
        known_unlocks = completed_set | unlocked_set

        missing_skills: list[dict[str, int | str]] = []
        for skill_name, required_level in profile["skill_requirements"].items():
            current_level = 1
            if skills and skill_name in skills and isinstance(skills[skill_name], dict):
                current_level = int(skills[skill_name].get("level", 1))
            if current_level < required_level:
                missing_skills.append(
                    {
                        "skill": skill_name,
                        "current_level": current_level,
                        "required_level": required_level,
                    }
                )

        unlock_requirements = profile.get("unlock_requirements", [])
        missing_unlocks = [
            requirement
            for requirement in unlock_requirements
            if isinstance(requirement, str) and requirement.strip().lower() not in known_unlocks
        ]

        return {
            "label": profile["label"],
            "missing_skills": missing_skills,
            "missing_unlocks": missing_unlocks,
            "notes": profile["notes"],
        }


boss_advisor_service = BossAdvisorService()
