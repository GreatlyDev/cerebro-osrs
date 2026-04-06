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
            KnowledgeSnippet(
                topic="achievement diary utility",
                keywords=("diary", "diary-style", "achievement diary", "diaries"),
                content=(
                    "Achievement diary planning is usually about utility leverage rather than diary completion for its own sake. "
                    "The strongest diary-like questions are which unlock saves travel time, improves routine skilling, or opens a "
                    "more valuable repeatable convenience."
                ),
            ),
            KnowledgeSnippet(
                topic="clue prep",
                keywords=("clue", "clue scroll", "hard clue", "elite clue", "master clue"),
                content=(
                    "Clue prep questions usually center on transport coverage, stash convenience, quest access, and whether the "
                    "player is missing one annoying requirement that slows the whole loop down."
                ),
            ),
            KnowledgeSnippet(
                topic="skilling tradeoffs",
                keywords=("xp", "train", "training", "method", "efficient", "efficiency"),
                content=(
                    "Skilling tradeoff questions should weigh raw XP, unlock value, profit, and attention cost. The best answer "
                    "depends on whether the player wants immediate levels, longer-term utility, or a method they can actually stick with."
                ),
            ),
            KnowledgeSnippet(
                topic="boss unlock burden",
                keywords=("boss", "bossing", "readiness", "requirements", "prep"),
                content=(
                    "Boss readiness is rarely just about combat stats. It usually depends on unlock burden, route friction, gear consistency, "
                    "and whether the player has the supporting utility to repeat the activity comfortably."
                ),
            ),
            KnowledgeSnippet(
                topic="slayer unlock planning",
                keywords=("slayer unlock", "slayer reward", "slayer points", "bigger and badder", "broader fletching"),
                content=(
                    "Slayer unlock planning is usually about leverage per point spent. The best early unlocks tend to be the ones that improve "
                    "task value, convenience, or future profit instead of cosmetic upgrades or niche unlocks."
                ),
            ),
            KnowledgeSnippet(
                topic="clue route friction",
                keywords=("clue route", "clue prep", "stash", "teleport coverage", "step coverage"),
                content=(
                    "Clue friction is usually caused by missing teleports, weak stash setup, and one or two awkward access requirements. "
                    "The best clue-prep advice usually targets the biggest repeat-time saver first."
                ),
            ),
            KnowledgeSnippet(
                topic="money maker unlock burden",
                keywords=("unlock burden", "requirements", "money maker requirement", "profit unlock"),
                content=(
                    "When comparing money makers, unlock burden matters almost as much as GP per hour. A lower raw-profit activity can still be "
                    "the better recommendation if it is available sooner, simpler to repeat, or builds toward later profit options."
                ),
            ),
            KnowledgeSnippet(
                topic="weekend milestone planning",
                keywords=("weekend", "by sunday", "milestone", "this week"),
                content=(
                    "Weekend planning works best when the milestone is concrete and sequenced: one cleanup unlock, one high-value account push, "
                    "and one optional profit or AFK buffer if time remains."
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
            scored.append((1, self._snippet_by_topic("money maker unlock burden")))
            if any(token in normalized for token in ("afk", "low attention", "low effort", "casual")):
                scored.append((1, self._snippet_by_topic("afk planning")))
        elif session_intent == "questing":
            scored.append((1, self._snippet_by_topic("questing utility")))
            if "diary" in normalized:
                scored.append((1, self._snippet_by_topic("achievement diary utility")))
        elif session_intent == "bossing":
            scored.append((1, self._snippet_by_topic("fight caves prep")))
            scored.append((1, self._snippet_by_topic("boss unlock burden")))
        elif session_intent == "training":
            scored.append((1, self._snippet_by_topic("skilling tradeoffs")))
            if any(token in normalized for token in ("afk", "low effort", "casual")):
                scored.append((1, self._snippet_by_topic("afk planning")))
        elif session_intent == "progression":
            scored.append((1, self._snippet_by_topic("weekend milestone planning")))

        if session_focus_summary:
            focus = session_focus_summary.lower()
            if "fossil island" in focus:
                scored.append((1, self._snippet_by_topic("fossil island access")))
            if "fight caves" in focus or "jad" in focus:
                scored.append((1, self._snippet_by_topic("fight caves prep")))
            if "barrows" in focus:
                scored.append((1, self._snippet_by_topic("barrows prep")))
            if "recipe for disaster" in focus:
                scored.append((1, self._snippet_by_topic("recipe for disaster chain")))
            if "slayer" in focus:
                scored.append((1, self._snippet_by_topic("slayer utility")))
                scored.append((1, self._snippet_by_topic("slayer unlock planning")))
            if "clue" in focus:
                scored.append((1, self._snippet_by_topic("clue prep")))
                scored.append((1, self._snippet_by_topic("clue route friction")))

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
