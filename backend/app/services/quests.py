from fastapi import HTTPException, status

from app.schemas.quest import QuestDetailResponse, QuestListResponse, QuestSummary

QUEST_CATALOG: dict[str, QuestDetailResponse] = {
    "waterfall-quest": QuestDetailResponse(
        id="waterfall-quest",
        name="Waterfall Quest",
        difficulty="Intermediate",
        category="progression",
        short_description="Fast early-game combat experience quest with minimal requirements.",
        requirements=["Ability to survive aggressive monsters", "Basic food and teleports"],
        rewards=["Large Attack and Strength experience", "Early combat level jump"],
        why_it_matters="Excellent early melee progression and a common springboard into broader questing.",
        next_steps=[
            "Use the combat xp boost to unlock stronger melee training options.",
            "Pair it with Fight Arena and Tree Gnome Village for faster early progression.",
        ],
    ),
    "fairytale-ii": QuestDetailResponse(
        id="fairytale-ii",
        name="Fairytale II - Cure a Queen",
        difficulty="Experienced",
        category="utility",
        short_description="Unlocks fairy rings, one of the most valuable travel systems in the game.",
        requirements=["Start Fairytale II", "Partial quest progression", "Basic combat readiness"],
        rewards=["Fairy ring travel access", "Major account mobility improvement"],
        why_it_matters="Fairy rings dramatically improve travel routing for skilling, clues, and questing.",
        next_steps=[
            "Unlock key fairy ring codes tied to your active goals.",
            "Use fairy rings to reduce downtime on future skilling and quest routes.",
        ],
    ),
    "recipe-for-disaster": QuestDetailResponse(
        id="recipe-for-disaster",
        name="Recipe for Disaster",
        difficulty="Master",
        category="gear",
        short_description="Long-form quest chain that culminates in Barrows gloves.",
        requirements=["Numerous quest prerequisites", "Broad skill requirements", "Combat readiness"],
        rewards=["Barrows gloves", "Strong account-wide unlock progression"],
        why_it_matters="One of the most efficient medium-term goals because it bundles many important unlocks together.",
        next_steps=[
            "Break the quest into subquest milestones and prerequisite quests.",
            "Track missing skill requirements in parallel with quest progress.",
        ],
    ),
    "monkey-madness-ii": QuestDetailResponse(
        id="monkey-madness-ii",
        name="Monkey Madness II",
        difficulty="Grandmaster",
        category="combat",
        short_description="Major unlock quest for high-level combat progression.",
        requirements=["Extensive quest prerequisites", "Strong combat stats", "Advanced boss readiness"],
        rewards=["Demonic gorillas access", "Zenyte progression path", "Heavy ballista access"],
        why_it_matters="A cornerstone unlock for late midgame combat upgrades and profitable PvM progression.",
        next_steps=[
            "Finish prerequisite quest chains first.",
            "Use gear and stat goals to sequence the combat preparation cleanly.",
        ],
    ),
    "bone-voyage": QuestDetailResponse(
        id="bone-voyage",
        name="Bone Voyage",
        difficulty="Intermediate",
        category="utility",
        short_description="Unlocks Fossil Island for multiple skilling and training methods.",
        requirements=["Museum kudos", "Basic quest progress"],
        rewards=["Fossil Island access", "Birdhouses", "Ammonite crabs", "Sulliusceps"],
        why_it_matters="A very high-value utility unlock that powers both efficient skilling and afk combat training.",
        next_steps=[
            "Set up birdhouse runs for passive Hunter progress.",
            "Use Fossil Island unlocks to improve combat and woodcutting plans.",
        ],
    ),
}


class QuestService:
    def list_quests(self) -> QuestListResponse:
        items = [
            QuestSummary(
                id=quest.id,
                name=quest.name,
                difficulty=quest.difficulty,
                category=quest.category,
                recommendation_reason=quest.why_it_matters,
            )
            for quest in QUEST_CATALOG.values()
        ]
        return QuestListResponse(items=items, total=len(items))

    def get_quest(self, quest_id: str) -> QuestDetailResponse:
        normalized = quest_id.strip().lower()
        quest = QUEST_CATALOG.get(normalized)
        if quest is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quest '{quest_id}' is not supported yet.",
            )
        return quest


quest_service = QuestService()
