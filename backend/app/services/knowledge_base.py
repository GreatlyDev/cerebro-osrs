from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class KnowledgeSnippet:
    topic: str
    keywords: tuple[str, ...]
    content: str


class KnowledgeBaseService:
    def __init__(self) -> None:
        self._snippets: tuple[KnowledgeSnippet, ...] = (
            KnowledgeSnippet(
                topic="fossil island access",
                keywords=("fossil island", "digsite pendant", "bone voyage"),
                content=(
                    "Fossil Island access is built around Bone Voyage and Digsite progress. "
                    "Useful route context usually includes the Digsite pendant, museum kudos, and whether the player has "
                    "already unlocked the island."
                ),
            ),
            KnowledgeSnippet(
                topic="fight caves prep",
                keywords=("fight caves", "jad", "fire cape"),
                content=(
                    "Fight Caves prep usually centers on ranged consistency, prayer sustain, survivability, and whether the "
                    "player can stay calm through the Jad finish. Gear, supplies, and route confidence matter more than one "
                    "single stat breakpoint."
                ),
            ),
            KnowledgeSnippet(
                topic="barrows prep",
                keywords=("barrows", "barrows gloves", "ahrim", "karil", "dharok"),
                content=(
                    "Barrows questions usually combine travel access, prayer sustain, magic or ranged coverage, and whether "
                    "the player wants profit, tank gear, or quest progression out of the grind."
                ),
            ),
            KnowledgeSnippet(
                topic="recipe for disaster chain",
                keywords=("recipe for disaster", "rfd", "barrows gloves"),
                content=(
                    "Recipe for Disaster is a prerequisite chain problem as much as a quest problem. The useful context is "
                    "which prerequisite quests are missing, which skill checks remain, and whether the player values the "
                    "glove unlock immediately or is only using it as a broader progression milestone."
                ),
            ),
            KnowledgeSnippet(
                topic="profit versus progression",
                keywords=("profit", "gp", "money maker", "money makers", "progression"),
                content=(
                    "When comparing profit versus progression, the tradeoff is usually between raw GP per hour, unlock burden, "
                    "attention cost, and whether the activity advances future account utility."
                ),
            ),
            KnowledgeSnippet(
                topic="afk planning",
                keywords=("afk", "low effort", "low attention", "casual"),
                content=(
                    "AFK planning should bias toward stable low-attention methods that still move the account forward. "
                    "The best answer is usually not the highest XP method, but the cleanest useful progress for the player's "
                    "available focus."
                ),
            ),
            KnowledgeSnippet(
                topic="slayer utility",
                keywords=("slayer", "task", "slayer helm", "slayer helmet"),
                content=(
                    "Slayer decisions often matter because they compound gear choices, money options, and boss access. "
                    "The useful question is whether Slayer is being trained for utility, profit, or a specific unlock."
                ),
            ),
            KnowledgeSnippet(
                topic="questing utility",
                keywords=("quest", "questing", "unlock chain", "utility unlock"),
                content=(
                    "Questing questions are usually about unlock leverage: travel systems, utility areas, gear access, and "
                    "whether a prerequisite chain changes multiple future paths at once."
                ),
            ),
        )

    def retrieve(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> str | None:
        normalized = query.lower()
        scored: list[tuple[int, KnowledgeSnippet]] = []

        for snippet in self._snippets:
            score = sum(1 for keyword in snippet.keywords if keyword in normalized)
            if score > 0:
                scored.append((score, snippet))

        if session_intent == "money":
            scored.append((1, self._snippet_by_topic("profit versus progression")))
        elif session_intent == "questing":
            scored.append((1, self._snippet_by_topic("questing utility")))
        elif session_intent == "bossing":
            scored.append((1, self._snippet_by_topic("fight caves prep")))
        elif session_intent == "training" and any(token in normalized for token in ("afk", "low effort", "casual")):
            scored.append((1, self._snippet_by_topic("afk planning")))

        if session_focus_summary:
            focus = session_focus_summary.lower()
            if "fossil island" in focus:
                scored.append((1, self._snippet_by_topic("fossil island access")))
            if "fight caves" in focus or "jad" in focus:
                scored.append((1, self._snippet_by_topic("fight caves prep")))

        if not scored:
            return None

        unique_topics: list[str] = []
        unique_contents: list[str] = []
        for _, snippet in sorted(scored, key=lambda item: item[0], reverse=True):
            if snippet.topic in unique_topics:
                continue
            unique_topics.append(snippet.topic)
            unique_contents.append(f"- {snippet.topic}: {snippet.content}")
            if len(unique_contents) == 3:
                break

        return "\n".join(unique_contents) if unique_contents else None

    def _snippet_by_topic(self, topic: str) -> KnowledgeSnippet:
        for snippet in self._snippets:
            if snippet.topic == topic:
                return snippet
        raise KeyError(topic)


knowledge_base_service = KnowledgeBaseService()
