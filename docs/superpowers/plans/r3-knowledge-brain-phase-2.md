# R3 Knowledge Brain Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Cerebro's curated OSRS knowledge, make retrieval choose the right knowledge more reliably, and wire that richer knowledge directly into deterministic account-aware answers.

**Architecture:** Keep the typed knowledge foundation from phase 1, then add a routing layer, richer retrieval packet metadata, and a focused knowledge-answering helper that the chat service can use before it falls back to model-backed replies. The work should compound in this order: broader corpus first, smarter routing second, deterministic responder integration third, and regression hardening last.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic, pytest, repo-managed JSON/Markdown knowledge files

---

## File Structure

### New files

- Create: `backend/app/services/knowledge_router.py`
- Create: `backend/app/services/knowledge_answering.py`
- Create: `backend/tests/test_knowledge_answering.py`

### Modified files

- Modify: `backend/app/services/knowledge_models.py`
- Modify: `backend/app/services/knowledge_ranker.py`
- Modify: `backend/app/services/knowledge_retrieval.py`
- Modify: `backend/app/services/knowledge_base.py`
- Modify: `backend/app/services/assistant.py`
- Modify: `backend/app/services/chat.py`
- Modify: `backend/data/knowledge/entries/quests.json`
- Modify: `backend/data/knowledge/entries/skilling.json`
- Modify: `backend/data/knowledge/entries/combat.json`
- Modify: `backend/data/knowledge/entries/economy.json`
- Modify: `backend/data/knowledge/docs/quests.md`
- Modify: `backend/data/knowledge/docs/skilling.md`
- Modify: `backend/data/knowledge/docs/combat.md`
- Modify: `backend/data/knowledge/docs/economy.md`
- Modify: `backend/tests/test_knowledge_base.py`
- Modify: `backend/tests/test_chat.py`

### Responsibilities

- `knowledge_router.py`: classify question mode, infer primary and secondary domains, and decide whether supporting documents should be included
- `knowledge_answering.py`: build deterministic, knowledge-backed answers for high-value account-aware lanes
- `knowledge_models.py`: carry route metadata and richer retrieval packet fields
- `knowledge_ranker.py`: provide score plus compact match-reason helpers
- `knowledge_retrieval.py`: compose route-aware retrieval packets with entry/document match notes
- `assistant.py`: receive route-aware knowledge summaries in addition to existing corpus summaries
- `chat.py`: compute retrieval packets earlier and let deterministic answer lanes use the knowledge brain directly
- `backend/data/knowledge/*`: broaden day-one OSRS launch coverage across all four balanced domains
- `test_knowledge_base.py`: validate corpus breadth and route-aware retrieval behavior
- `test_knowledge_answering.py`: validate deterministic knowledge application logic
- `test_chat.py`: protect end-to-end knowledge use in both deterministic and model-backed paths

---

### Task 1: Expand the Curated OSRS Launch Corpus

**Files:**
- Modify: `backend/data/knowledge/entries/quests.json`
- Modify: `backend/data/knowledge/entries/skilling.json`
- Modify: `backend/data/knowledge/entries/combat.json`
- Modify: `backend/data/knowledge/entries/economy.json`
- Modify: `backend/data/knowledge/docs/quests.md`
- Modify: `backend/data/knowledge/docs/skilling.md`
- Modify: `backend/data/knowledge/docs/combat.md`
- Modify: `backend/data/knowledge/docs/economy.md`
- Modify: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the failing corpus-breadth tests**

```python
from app.services.knowledge_base import knowledge_base_service


def test_retrieve_diary_and_travel_utility_for_diary_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What diary-style utility unlock should I care about next?",
        session_intent="progression",
        session_focus_summary="Travel utility and friction cleanup",
    )

    names = {entry.canonical_name for entry in packet.entries}
    assert "Achievement diary utility" in names
    assert "Fairy ring utility" in names


def test_retrieve_skilling_methods_for_low_attention_training_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What low-attention skilling method should I lean on this week?",
        session_intent="training",
        session_focus_summary="Routine-friendly skilling progress",
    )

    names = {entry.canonical_name for entry in packet.entries}
    assert "High Alchemy" in names
    assert "Farming contracts" in names


def test_retrieve_combat_and_economy_knowledge_for_weekend_profit_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What should I push if I want better money by this weekend?",
        session_intent="profit",
        session_focus_summary="Weekend planning for a midgame account",
    )

    matched_domains = {entry.domain for entry in packet.entries}
    assert "economy" in matched_domains
    assert "combat" in matched_domains
```

- [ ] **Step 2: Run the focused knowledge tests and verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py::test_retrieve_diary_and_travel_utility_for_diary_question tests/test_knowledge_base.py::test_retrieve_skilling_methods_for_low_attention_training_question tests/test_knowledge_base.py::test_retrieve_combat_and_economy_knowledge_for_weekend_profit_question -q`

Expected: FAIL because the current launch corpus does not yet contain the required breadth

- [ ] **Step 3: Expand `quests.json` with more utility and prerequisite leverage**

Add these entry objects to the `entries` array in `backend/data/knowledge/entries/quests.json`:

```json
{
  "id": "utility-fairy-rings",
  "canonical_name": "Fairy ring utility",
  "entry_type": "travel_utility",
  "domain": "quests",
  "aliases": ["fairy rings", "fairy ring unlock", "fairy ring travel"],
  "summary": "Fairy rings are one of the highest-leverage utility unlocks because they reduce travel friction across skilling, clues, and repeatable account routing.",
  "prerequisites": ["Fairytale II progress", "Quest setup for access"],
  "benefits": ["Huge travel coverage", "Lower route friction", "Pairs with many future unlocks"],
  "tradeoffs": ["Requires quest progress before the payoff is felt"],
  "related_entries": ["unlock-bone-voyage", "utility-achievement-diaries"],
  "retrieval_tags": ["fairy ring", "travel", "utility", "routing", "unlock"],
  "source_type": "curated",
  "status": "canonical",
  "confidence": 0.96,
  "last_reviewed_at": "2026-04-15",
  "change_note": "Phase 2 launch expansion"
},
{
  "id": "quest-rfd-prerequisite-cleanup",
  "canonical_name": "Recipe for Disaster prerequisite cleanup",
  "entry_type": "quest_chain",
  "domain": "quests",
  "aliases": ["recipe for disaster prerequisites", "rfd prerequisite cleanup", "barrows gloves requirements"],
  "summary": "The real value in working toward Recipe for Disaster is the prerequisite cleanup, because it pulls many foundational quest and skill gaps forward into one strong midgame route.",
  "prerequisites": ["Subquest access", "Mixed quest requirements", "Mixed skill thresholds"],
  "benefits": ["Clear prerequisite sequencing", "Barrows gloves route clarity", "Stronger midgame cleanup"],
  "tradeoffs": ["Can feel wide before the route is broken down"],
  "related_entries": ["quest-recipe-for-disaster", "unlock-bone-voyage"],
  "retrieval_tags": ["rfd", "recipe for disaster", "prerequisite", "quest route", "barrows gloves"],
  "source_type": "curated",
  "status": "canonical",
  "confidence": 0.94,
  "last_reviewed_at": "2026-04-15",
  "change_note": "Phase 2 launch expansion"
}
```

- [ ] **Step 4: Expand `skilling.json` with routine and method-comparison entries**

Add these entry objects to the `entries` array in `backend/data/knowledge/entries/skilling.json`:

```json
{
  "id": "skill-farming-contracts",
  "canonical_name": "Farming contracts",
  "entry_type": "skill_method",
  "domain": "skilling",
  "aliases": ["farming contracts", "guild contracts", "farming routine"],
  "summary": "Farming contracts are a routine-first progression method that compound account utility through herbs, seeds, and repeatable low-friction Farming XP.",
  "prerequisites": ["Farming Guild access", "Seed stock", "Routine tolerance"],
  "benefits": ["Repeatable farming XP", "Herb and seed value", "Routine-friendly account growth"],
  "tradeoffs": ["Works best as a repeating loop rather than a long single session"],
  "related_entries": ["skill-birdhouse-runs"],
  "retrieval_tags": ["farming", "contracts", "routine", "utility", "low attention"],
  "source_type": "curated",
  "status": "canonical",
  "confidence": 0.93,
  "last_reviewed_at": "2026-04-15",
  "change_note": "Phase 2 launch expansion"
},
{
  "id": "skill-tempoross",
  "canonical_name": "Tempoross",
  "entry_type": "skill_method",
  "domain": "skilling",
  "aliases": ["tempoross", "fishing boss", "fishing training"],
  "summary": "Tempoross is a structured Fishing method that trades full AFK comfort for stronger engagement, useful rewards, and cleaner short-session progression.",
  "prerequisites": ["Fishing access", "Willingness to play an active skilling loop"],
  "benefits": ["Fishing XP", "Useful rewards", "Short-session friendly activity"],
  "tradeoffs": ["More active than passive fishing methods"],
  "related_entries": ["money-weekend-milestone-planning"],
  "retrieval_tags": ["tempoross", "fishing", "training", "rewards", "session"],
  "source_type": "curated",
  "status": "canonical",
  "confidence": 0.9,
  "last_reviewed_at": "2026-04-15",
  "change_note": "Phase 2 launch expansion"
}
```

- [ ] **Step 5: Expand `combat.json` and `economy.json` with stronger progression and profit routing**

Add these entry objects to the `entries` arrays:

```json
{
  "id": "boss-demonic-gorillas",
  "canonical_name": "Demonic gorillas",
  "entry_type": "boss_profile",
  "domain": "combat",
  "aliases": ["demonic gorillas", "zenytes", "monkey madness 2 money"],
  "summary": "Demonic gorillas are a strong midgame bridge between unlock routing, profit, and PvM confidence once the account can handle gear switching and repeatable combat rhythm.",
  "prerequisites": ["Monkey Madness II access", "Combat comfort", "Switching consistency"],
  "benefits": ["Zenyte profit", "PvM confidence", "Unlock-linked money making"],
  "tradeoffs": ["Unlock burden is meaningful", "Execution load is higher than calmer profit routes"],
  "related_entries": ["money-midgame-consistency", "quest-recipe-for-disaster"],
  "retrieval_tags": ["demonic gorillas", "zenyte", "bossing", "profit", "unlock burden"],
  "source_type": "curated",
  "status": "canonical",
  "confidence": 0.92,
  "last_reviewed_at": "2026-04-15",
  "change_note": "Phase 2 launch expansion"
}
```

```json
{
  "id": "money-barrows-consistency",
  "canonical_name": "Barrows consistency profit",
  "entry_type": "money_maker",
  "domain": "economy",
  "aliases": ["barrows money", "barrows profit", "midgame barrows gp"],
  "summary": "Barrows is a consistency-focused midgame money route when the account has enough travel comfort and prayer sustain to repeat runs cleanly.",
  "prerequisites": ["Barrows readiness", "Travel comfort", "Prayer sustain"],
  "benefits": ["Repeatable profit", "Midgame account rhythm", "Pairs with gear progression"],
  "tradeoffs": ["Feels much worse without route and sustain setup"],
  "related_entries": ["boss-barrows", "money-midgame-consistency"],
  "retrieval_tags": ["barrows", "profit", "money maker", "midgame", "consistency"],
  "source_type": "curated",
  "status": "canonical",
  "confidence": 0.91,
  "last_reviewed_at": "2026-04-15",
  "change_note": "Phase 2 launch expansion"
}
```

- [ ] **Step 6: Expand the supporting documents to match the new breadth**

Update the markdown documents so each one has at least one new paragraph that supports the new entries:

```markdown
# Quest leverage and utility routing

Guidance for unlock quests, prerequisite cleanup, diary-style utility, and travel friction reduction.

Unlock quests matter most when they remove repeated friction. Fairy rings, Fossil Island access, and broad prerequisite cleanup are often worth prioritizing because they make later skilling, travel, and account routing smoother instead of only adding one isolated reward.

Recipe for Disaster matters not only because of Barrows gloves, but because its prerequisite cleanup often forces the account into healthier midgame progression.
```

```markdown
# Skilling routines and method tradeoffs

Guidance for low-attention skilling, routine loops, and method selection based on session shape.

Good skilling advice is not only about raw XP. Methods like High Alchemy, birdhouse runs, farming contracts, and Tempoross should be judged by unlock burden, attention cost, repeatability, and whether they fit the player's real session style.
```

- [ ] **Step 7: Run the corpus coverage tests and verify they pass**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: PASS with the new breadth tests green

- [ ] **Step 8: Commit**

```bash
git add backend/data/knowledge backend/tests/test_knowledge_base.py
git commit -m "Expand the curated OSRS knowledge corpus"
```

---

### Task 2: Add Smarter Retrieval Routing and Match Notes

**Files:**
- Create: `backend/app/services/knowledge_router.py`
- Modify: `backend/app/services/knowledge_models.py`
- Modify: `backend/app/services/knowledge_ranker.py`
- Modify: `backend/app/services/knowledge_retrieval.py`
- Modify: `backend/app/services/knowledge_base.py`
- Modify: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the failing retrieval-routing tests**

```python
from app.services.knowledge_base import knowledge_base_service


def test_retrieve_packet_marks_readiness_route_for_barrows_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="Am I ready for Barrows right now?",
        session_intent="bossing",
        session_focus_summary="Barrows prep for a midgame account",
    )

    assert packet.question_mode == "readiness"
    assert packet.primary_domain == "combat"
    assert packet.include_supporting_documents is True
    assert packet.match_notes


def test_retrieve_packet_marks_comparison_route_for_profit_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What is better for me right now, profit or progression?",
        session_intent="profit",
        session_focus_summary="Comparing account routes",
    )

    assert packet.question_mode == "comparison"
    assert packet.primary_domain == "economy"
    assert "economy" in [packet.primary_domain, *packet.secondary_domains]
```

- [ ] **Step 2: Run the focused routing tests and verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py::test_retrieve_packet_marks_readiness_route_for_barrows_question tests/test_knowledge_base.py::test_retrieve_packet_marks_comparison_route_for_profit_question -q`

Expected: FAIL because the retrieval packet does not yet expose route metadata

- [ ] **Step 3: Extend `knowledge_models.py` with route-aware packet fields**

Update `backend/app/services/knowledge_models.py` to add these types after the existing `KnowledgeDomain` alias:

```python
KnowledgeQuestionMode = Literal["factual", "readiness", "comparison", "planning", "explanation"]


class KnowledgeRouteDecision(BaseModel):
    question_mode: KnowledgeQuestionMode
    primary_domain: KnowledgeDomain | None = None
    secondary_domains: list[KnowledgeDomain] = Field(default_factory=list)
    include_supporting_documents: bool = False
    reasoning: list[str] = Field(default_factory=list)


class KnowledgeRetrievalPacket(BaseModel):
    entries: list["KnowledgeEntry"] = Field(default_factory=list)
    documents: list["KnowledgeDocument"] = Field(default_factory=list)
    summary: str | None = None
    question_mode: KnowledgeQuestionMode | None = None
    primary_domain: KnowledgeDomain | None = None
    secondary_domains: list[KnowledgeDomain] = Field(default_factory=list)
    include_supporting_documents: bool = False
    match_notes: list[str] = Field(default_factory=list)
```

- [ ] **Step 4: Add the routing helper**

Create `backend/app/services/knowledge_router.py` with this starting implementation:

```python
from app.services.knowledge_models import KnowledgeDomain, KnowledgeRouteDecision


class KnowledgeRouter:
    def route(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> KnowledgeRouteDecision:
        normalized = f"{query} {session_focus_summary or ''}".lower()
        secondary_domains: list[KnowledgeDomain] = []

        if any(token in normalized for token in ("ready for", "am i ready", "missing for", "prep for")):
            mode = "readiness"
        elif any(token in normalized for token in ("better than", "versus", "vs", "tradeoff", "worth it")):
            mode = "comparison"
        elif any(token in normalized for token in ("this week", "this weekend", "by sunday", "focus on")):
            mode = "planning"
        elif any(token in normalized for token in ("why", "how does", "what matters most")):
            mode = "explanation"
        else:
            mode = "factual"

        if any(token in normalized for token in ("barrows", "jad", "fight caves", "boss", "slayer")):
            primary_domain: KnowledgeDomain | None = "combat"
        elif any(token in normalized for token in ("money", "profit", "gp", "weekend")):
            primary_domain = "economy"
        elif any(token in normalized for token in ("quest", "diary", "unlock", "travel", "fairy ring")):
            primary_domain = "quests"
        elif any(token in normalized for token in ("train", "skilling", "xp", "birdhouse", "farming")):
            primary_domain = "skilling"
        else:
            primary_domain = None

        if primary_domain == "economy" and any(token in normalized for token in ("barrows", "gorillas", "boss")):
            secondary_domains.append("combat")
        if primary_domain == "quests" and any(token in normalized for token in ("travel", "utility", "route")):
            secondary_domains.append("economy")

        return KnowledgeRouteDecision(
            question_mode=mode,
            primary_domain=primary_domain,
            secondary_domains=secondary_domains,
            include_supporting_documents=mode in {"readiness", "comparison", "planning", "explanation"},
            reasoning=[f"mode={mode}", f"primary={primary_domain or 'none'}"],
        )
```

- [ ] **Step 5: Make ranking route-aware and emit match notes**

Update `backend/app/services/knowledge_ranker.py` so it can explain why an item matched:

```python
from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry, KnowledgeRouteDecision


def explain_entry_match(entry: KnowledgeEntry, normalized_query: str) -> tuple[int, list[str]]:
    tokens = _tokenize(normalized_query)
    reasons: list[str] = []
    score = 0

    for token in tokens:
        if token in entry.canonical_name.lower():
            score += 4
            reasons.append(f"name:{token}")
        if any(token in alias.lower() for alias in entry.aliases):
            score += 3
            reasons.append(f"alias:{token}")
        if any(token in tag.lower() for tag in entry.retrieval_tags):
            score += 2
            reasons.append(f"tag:{token}")
        if token in entry.summary.lower():
            score += 1
            reasons.append(f"summary:{token}")

    return score, reasons[:4]


def apply_route_bonus(
    *,
    entry: KnowledgeEntry,
    route: KnowledgeRouteDecision,
) -> tuple[int, list[str]]:
    bonus = 0
    reasons: list[str] = []
    if route.primary_domain == entry.domain:
        bonus += 4
        reasons.append(f"primary-domain:{entry.domain}")
    if entry.domain in route.secondary_domains:
        bonus += 2
        reasons.append(f"secondary-domain:{entry.domain}")
    return bonus, reasons
```

- [ ] **Step 6: Update `knowledge_retrieval.py` to use the router and richer packet**

Refactor `backend/app/services/knowledge_retrieval.py` so the packet is built from route metadata:

```python
from pathlib import Path

from app.services.knowledge_loader import KnowledgeLoader
from app.services.knowledge_models import KnowledgeRetrievalPacket
from app.services.knowledge_ranker import apply_route_bonus, explain_entry_match, score_document
from app.services.knowledge_router import KnowledgeRouter
from app.services.knowledge_store import KnowledgeStore


class KnowledgeRetrievalService:
    def __init__(self) -> None:
        corpus_root = Path(__file__).resolve().parents[2] / "data" / "knowledge"
        corpus = KnowledgeLoader(corpus_root).load()
        self._store = KnowledgeStore(corpus)
        self._router = KnowledgeRouter()

    def retrieve_packet(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> KnowledgeRetrievalPacket:
        normalized = f"{query} {session_focus_summary or ''} {session_intent or ''}".lower()
        route = self._router.route(
            query=query,
            session_intent=session_intent,
            session_focus_summary=session_focus_summary,
        )

        ranked_entries: list[tuple[int, list[str], object]] = []
        for entry in self._store.canonical_entries():
            score, reasons = explain_entry_match(entry, normalized)
            bonus, bonus_reasons = apply_route_bonus(entry=entry, route=route)
            total = score + bonus + self._contextual_entry_boost(
                entry.canonical_name,
                normalized,
                session_intent,
                session_focus_summary,
            )
            if total > 0:
                ranked_entries.append((total, [*reasons, *bonus_reasons], entry))

        ranked_entries.sort(key=lambda item: item[0], reverse=True)
        entries = [entry for _, _, entry in ranked_entries[:4]]
        match_notes = [
            f"{entry.canonical_name}: {', '.join(reasons) or 'context match'}"
            for _, reasons, entry in ranked_entries[:4]
        ]

        ranked_documents = sorted(
            self._store.canonical_documents(),
            key=lambda item: score_document(item, normalized),
            reverse=True,
        )
        documents = [document for document in ranked_documents if score_document(document, normalized) > 0][:2]
        if not route.include_supporting_documents:
            documents = []

        summary = "\n".join(f"- {entry.canonical_name}: {entry.summary}" for entry in entries) or None
        return KnowledgeRetrievalPacket(
            entries=entries,
            documents=documents,
            summary=summary,
            question_mode=route.question_mode,
            primary_domain=route.primary_domain,
            secondary_domains=route.secondary_domains,
            include_supporting_documents=route.include_supporting_documents,
            match_notes=match_notes,
        )
```

- [ ] **Step 7: Run the full knowledge-base suite and verify it passes**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: PASS with route metadata and match-note tests green

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/knowledge_models.py backend/app/services/knowledge_router.py backend/app/services/knowledge_ranker.py backend/app/services/knowledge_retrieval.py backend/app/services/knowledge_base.py backend/tests/test_knowledge_base.py
git commit -m "Teach retrieval to classify question routes"
```

---

### Task 3: Let Deterministic Account Answers Use the Knowledge Brain

**Files:**
- Create: `backend/app/services/knowledge_answering.py`
- Create: `backend/tests/test_knowledge_answering.py`
- Modify: `backend/app/services/chat.py`
- Modify: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing deterministic knowledge-answer tests**

Create `backend/tests/test_knowledge_answering.py` with these tests:

```python
from app.services.knowledge_answering import knowledge_answering_service
from app.services.knowledge_models import KnowledgeEntry, KnowledgeRetrievalPacket


def test_build_utility_unlock_answer_uses_retrieved_unlocks() -> None:
    packet = KnowledgeRetrievalPacket(
        entries=[
            KnowledgeEntry(
                id="utility-fairy-rings",
                canonical_name="Fairy ring utility",
                entry_type="travel_utility",
                domain="quests",
                summary="Fairy rings reduce travel friction across the account.",
                benefits=["Huge travel coverage"],
                tradeoffs=["Needs quest progress"],
                retrieval_tags=["fairy ring", "travel", "utility"],
            )
        ],
        question_mode="planning",
        primary_domain="quests",
        include_supporting_documents=True,
    )

    answer = knowledge_answering_service.build_utility_unlock_answer(
        message="What utility unlock should I push next?",
        packet=packet,
        account_rsn="Gilganor",
    )

    assert answer is not None
    assert "Fairy ring utility" in answer
    assert "Gilganor" in answer


def test_build_money_tradeoff_answer_uses_retrieved_money_knowledge() -> None:
    packet = KnowledgeRetrievalPacket(
        entries=[
            KnowledgeEntry(
                id="money-profit-vs-progression",
                canonical_name="Profit versus progression",
                entry_type="money_maker",
                domain="economy",
                summary="The right money route balances GP, unlock burden, and future account value.",
                tradeoffs=["Highest GP is not always the best route"],
                retrieval_tags=["profit", "progression", "tradeoff"],
            )
        ],
        question_mode="comparison",
        primary_domain="economy",
    )

    answer = knowledge_answering_service.build_money_tradeoff_answer(
        message="What is better for me right now, profit or progression?",
        packet=packet,
    )

    assert answer is not None
    assert "profit versus progression" in answer.lower()
```

- [ ] **Step 2: Run the new helper tests and verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_answering.py -q`

Expected: FAIL because `knowledge_answering.py` does not exist yet

- [ ] **Step 3: Add the focused knowledge-answering helper**

Create `backend/app/services/knowledge_answering.py` with this implementation:

```python
from app.services.knowledge_models import KnowledgeRetrievalPacket


class KnowledgeAnsweringService:
    def build_utility_unlock_answer(
        self,
        *,
        message: str,
        packet: KnowledgeRetrievalPacket,
        account_rsn: str | None,
    ) -> str | None:
        normalized = message.lower()
        if "unlock" not in normalized or "utility" not in normalized:
            return None
        if not packet.entries:
            return None

        top = packet.entries[0]
        subject = account_rsn or "this account"
        benefit = top.benefits[0] if top.benefits else "broader account utility"
        tradeoff = top.tradeoffs[0] if top.tradeoffs else "it still needs some setup first"
        return (
            f"For {subject}, I'd prioritize {top.canonical_name} next. "
            f"{top.summary} The main payoff is {benefit.lower()}, and the tradeoff is that {tradeoff.lower()}."
        )

    def build_money_tradeoff_answer(
        self,
        *,
        message: str,
        packet: KnowledgeRetrievalPacket,
    ) -> str | None:
        normalized = message.lower()
        if not any(token in normalized for token in ("profit", "progression", "tradeoff", "better for me")):
            return None
        if packet.primary_domain != "economy" or not packet.entries:
            return None

        top = packet.entries[0]
        tradeoff = top.tradeoffs[0] if top.tradeoffs else "highest GP is not always the right route"
        return (
            f"The best frame here is {top.canonical_name}. "
            f"{top.summary} In practice, that means {tradeoff.lower()}."
        )

    def build_readiness_answer(
        self,
        *,
        message: str,
        packet: KnowledgeRetrievalPacket,
    ) -> str | None:
        normalized = message.lower()
        if packet.question_mode != "readiness" or not any(token in normalized for token in ("ready", "prep")):
            return None
        if not packet.entries:
            return None

        top = packet.entries[0]
        prerequisites = ", ".join(top.prerequisites[:3]) or "clean account setup"
        return (
            f"The main readiness lens here is {top.canonical_name}. "
            f"{top.summary} The biggest things to check are {prerequisites.lower()}."
        )


knowledge_answering_service = KnowledgeAnsweringService()
```

- [ ] **Step 4: Compute retrieval before deterministic answers and wire the helper into chat**

In `backend/app/services/chat.py`, move retrieval earlier inside `_generate_response()` and pass it into `_build_direct_stat_answer()`:

```python
        session_focus_summary = self._summarize_session_focus(
            session_focus=session_focus,
            latest_goal=latest_goal,
            account=focus_account,
            include_goal=emphasize_goal,
        )
        retrieval_packet = knowledge_base_service.retrieve_packet(
            query=resolved_message,
            session_intent=session_intent,
            session_focus_summary=session_focus_summary,
        )

        stat_answer = await self._build_direct_stat_answer(
            db_session=db_session,
            user=user,
            message=resolved_message,
            account=focus_account,
            profile=profile,
            latest_goal=latest_goal,
            session_focus=session_focus,
            session_intent=session_intent,
            session_state=session.session_state or {},
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
            progress=progress,
            retrieval_packet=retrieval_packet,
        )
```

Update `_build_direct_stat_answer()` so it accepts the packet and uses the helper before the older local heuristics:

```python
        knowledge_unlock_answer = knowledge_answering_service.build_utility_unlock_answer(
            message=message,
            packet=retrieval_packet,
            account_rsn=account.rsn if account is not None else None,
        )
        if knowledge_unlock_answer is not None:
            return knowledge_unlock_answer

        knowledge_money_answer = knowledge_answering_service.build_money_tradeoff_answer(
            message=message,
            packet=retrieval_packet,
        )
        if knowledge_money_answer is not None:
            return knowledge_money_answer

        knowledge_readiness_answer = knowledge_answering_service.build_readiness_answer(
            message=message,
            packet=retrieval_packet,
        )
        if knowledge_readiness_answer is not None:
            return knowledge_readiness_answer
```

- [ ] **Step 5: Add the end-to-end chat regressions**

Add these tests to `backend/tests/test_chat.py`:

```python
@pytest.mark.asyncio
async def test_chat_uses_knowledge_brain_for_utility_unlock_answer(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "UtilityMind"})
    await client.post(f"/api/accounts/{account_response.json()['id']}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Utility Brain"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What utility unlock should I push next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "utility" in content
    assert "fairy ring" in content or "bone voyage" in content


@pytest.mark.asyncio
async def test_chat_uses_knowledge_brain_for_profit_vs_progression_answer(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "TradeoffMind"})
    await client.post(f"/api/accounts/{account_response.json()['id']}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Tradeoff Brain"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What is better for me right now, profit or progression?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "profit versus progression" in content
```

- [ ] **Step 6: Run the helper tests and chat regressions**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_answering.py tests/test_chat.py -q`

Expected: PASS with the new deterministic knowledge-backed answer coverage green

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/knowledge_answering.py backend/app/services/chat.py backend/tests/test_knowledge_answering.py backend/tests/test_chat.py
git commit -m "Let direct answers use the knowledge brain"
```

---

### Task 4: Expose Route Metadata to the Assistant and Harden Regression Coverage

**Files:**
- Modify: `backend/app/services/assistant.py`
- Modify: `backend/app/services/chat.py`
- Modify: `backend/tests/test_chat.py`
- Modify: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the failing assistant-context test**

Add this test to `backend/tests/test_chat.py`:

```python
@pytest.mark.asyncio
async def test_chat_includes_route_metadata_in_assistant_context(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["route"] = getattr(context, "retrieval_route_summary", "") or ""
        captured["notes"] = getattr(context, "retrieval_match_notes_summary", "") or ""
        return "Grounded route-aware reply."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)

    account_response = await client.post("/api/accounts", json={"rsn": "RouteAware"})
    await client.post(f"/api/accounts/{account_response.json()['id']}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Route Aware"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Am I ready for Barrows right now?"},
    )

    assert response.status_code == 201
    assert "readiness" in captured["route"].lower()
    assert "combat" in captured["route"].lower()
    assert captured["notes"]
```

- [ ] **Step 2: Run the focused assistant-context test and verify it fails**

Run: `docker compose exec backend uv run pytest tests/test_chat.py::test_chat_includes_route_metadata_in_assistant_context -q`

Expected: FAIL because the assistant context does not yet include route summaries or match notes

- [ ] **Step 3: Extend the assistant context and prompt builder**

Update `backend/app/services/assistant.py`:

```python
@dataclass(slots=True)
class AssistantChatContext:
    session_title: str
    user_display_name: str
    user_message: str
    structured_fallback: str
    recent_messages: list[tuple[str, str]] = field(default_factory=list)
    profile_summary: str | None = None
    account_summary: str | None = None
    snapshot_summary: str | None = None
    skills_summary: str | None = None
    progress_summary: str | None = None
    snapshot_delta_summary: str | None = None
    goal_summary: str | None = None
    session_focus_summary: str | None = None
    session_intent_summary: str | None = None
    retrieval_summary: str | None = None
    retrieval_entries_summary: str | None = None
    retrieval_documents_summary: str | None = None
    retrieval_route_summary: str | None = None
    retrieval_match_notes_summary: str | None = None
```

Add these sections inside `_build_input()` just above the entry/document context:

```python
            f"Retrieved OSRS route context: {context.retrieval_route_summary or 'No route classification available.'}",
            f"Retrieved OSRS match notes: {context.retrieval_match_notes_summary or 'No retrieval notes available.'}",
```

- [ ] **Step 4: Feed the route metadata from chat**

Update the `AssistantChatContext(...)` call in `backend/app/services/chat.py`:

```python
                retrieval_route_summary=(
                    f"Question mode={retrieval_packet.question_mode or 'unknown'}, "
                    f"primary domain={retrieval_packet.primary_domain or 'none'}, "
                    f"secondary domains={', '.join(retrieval_packet.secondary_domains) or 'none'}, "
                    f"supporting docs={retrieval_packet.include_supporting_documents}"
                ),
                retrieval_match_notes_summary="\n".join(retrieval_packet.match_notes) or None,
```

- [ ] **Step 5: Add a final route-quality regression**

Add this knowledge-base test:

```python
def test_retrieve_packet_exposes_match_notes_for_unlock_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What utility unlock should I push next?",
        session_intent="progression",
        session_focus_summary="Travel and utility cleanup",
    )

    assert packet.match_notes
    assert any("domain" in note or "tag" in note or "alias" in note for note in packet.match_notes)
```

- [ ] **Step 6: Run the full R3 regression suite**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py tests/test_knowledge_answering.py tests/test_chat.py -q`

Expected: PASS with corpus, routing, deterministic knowledge answers, and assistant-context regressions all green

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/assistant.py backend/app/services/chat.py backend/tests/test_knowledge_base.py backend/tests/test_chat.py
git commit -m "Harden the phase 2 knowledge regressions"
```

---

## Self-Review

### Spec coverage

- bigger day-one corpus: covered by Task 1
- smarter retrieval and routing: covered by Task 2
- knowledge-driven deterministic account answers: covered by Task 3
- stronger regression coverage and route-aware assistant context: covered by Task 4

No phase-2 spec gaps remain for this implementation cycle.

### Placeholder scan

- each task names exact files
- each task includes concrete tests, commands, and code
- no `TODO`, `TBD`, or "similar to above" placeholders remain

### Type consistency

- `KnowledgeRetrievalPacket` is extended in Task 2 and then reused consistently in Tasks 3 and 4
- `KnowledgeRouter` is introduced in Task 2 and consumed only through `KnowledgeRetrievalService`
- `KnowledgeAnsweringService` is introduced in Task 3 and used by `chat.py` for deterministic answer lanes
- assistant route summaries in Task 4 are built directly from the route-aware retrieval packet fields defined in Task 2
