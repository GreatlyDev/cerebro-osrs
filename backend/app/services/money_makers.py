MONEY_MAKERS: list[dict[str, object]] = [
    {
        "name": "Birdhouse runs",
        "aliases": ["birdhouse", "birdhouses"],
        "category": "skilling",
        "skill_requirements": {"hunter": 5},
        "unlock_requirements": ["bone voyage"],
        "summary": "Steady passive profit while building Hunter with low active time.",
        "why": "Very efficient background money for an account that logs in regularly.",
    },
    {
        "name": "Barrows",
        "aliases": ["barrows"],
        "category": "combat",
        "skill_requirements": {"magic": 50, "hitpoints": 55},
        "unlock_requirements": ["canifis access"],
        "summary": "Reliable midgame chest runs with useful uniques and rune income.",
        "why": "A classic account-building money maker once the route and sustain are comfortable.",
    },
    {
        "name": "Karambwans",
        "aliases": ["karambwans", "karambwan"],
        "category": "skilling",
        "skill_requirements": {"fishing": 65},
        "unlock_requirements": [],
        "summary": "Simple profitable fishing with strong banking rhythm once unlocked.",
        "why": "Good fit when you want profit without full PvM attention.",
    },
    {
        "name": "Demonic gorillas",
        "aliases": ["demonic gorillas", "zenytes"],
        "category": "combat",
        "skill_requirements": {"ranged": 75, "strength": 70, "defence": 70},
        "unlock_requirements": ["monkey madness ii"],
        "summary": "Strong zenyte-driven PvM money maker for accounts with the unlocks and swaps.",
        "why": "High-upside profit path once your combat unlocks and mechanics are ready.",
    },
]


class MoneyMakerService:
    def get_best_options(
        self,
        *,
        skills: dict[str, dict[str, int]] | None,
        unlocked_transports: list[str] | None,
        completed_quests: list[str] | None,
        prefers_profitable_methods: bool,
    ) -> list[dict[str, object]]:
        known_unlocks = {
            entry.strip().lower()
            for entry in [*(unlocked_transports or []), *(completed_quests or [])]
        }

        ranked: list[tuple[int, dict[str, object], list[str]]] = []
        for candidate in MONEY_MAKERS:
            missing = self._missing_requirements(
                candidate=candidate,
                skills=skills,
                known_unlocks=known_unlocks,
            )
            score = 100 - (len(missing) * 18)
            if candidate["category"] == "skilling" and prefers_profitable_methods:
                score += 6
            ranked.append((score, candidate, missing))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "name": candidate["name"],
                "summary": candidate["summary"],
                "why": candidate["why"],
                "missing_requirements": missing,
                "score": score,
            }
            for score, candidate, missing in ranked
        ]

    def _missing_requirements(
        self,
        *,
        candidate: dict[str, object],
        skills: dict[str, dict[str, int]] | None,
        known_unlocks: set[str],
    ) -> list[str]:
        missing: list[str] = []
        for skill_name, required_level in candidate["skill_requirements"].items():
            current_level = 1
            if skills and skill_name in skills and isinstance(skills[skill_name], dict):
                current_level = int(skills[skill_name].get("level", 1))
            if current_level < required_level:
                missing.append(f"{skill_name.replace('_', ' ').title()} {current_level}->{required_level}")

        for requirement in candidate["unlock_requirements"]:
            if requirement.strip().lower() not in known_unlocks:
                missing.append(requirement)
        return missing


money_maker_service = MoneyMakerService()
