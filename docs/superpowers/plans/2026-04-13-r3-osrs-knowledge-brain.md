# R3 OSRS Knowledge Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current snippet-based OSRS retrieval layer with a balanced, curated, typed knowledge system that gives Cerebro broader day-one OSRS coverage and cleaner long-term growth.

**Architecture:** Introduce repo-managed curated knowledge files plus a typed knowledge subsystem in `backend/app/services`. Retrieval will become a two-layer flow that returns structured entries and supporting documents, and the chat/assistant pipeline will consume that richer retrieval packet while preserving the current account-aware response flow.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic, pytest, repo-managed JSON/Markdown knowledge files

---

## File Structure

### New files

- Create: `backend/app/services/knowledge_models.py`
- Create: `backend/app/services/knowledge_loader.py`
- Create: `backend/app/services/knowledge_store.py`
- Create: `backend/app/services/knowledge_ranker.py`
- Create: `backend/app/services/knowledge_retrieval.py`
- Create: `backend/data/knowledge/entries/quests.json`
- Create: `backend/data/knowledge/entries/skilling.json`
- Create: `backend/data/knowledge/entries/combat.json`
- Create: `backend/data/knowledge/entries/economy.json`
- Create: `backend/data/knowledge/docs/quests.md`
- Create: `backend/data/knowledge/docs/skilling.md`
- Create: `backend/data/knowledge/docs/combat.md`
- Create: `backend/data/knowledge/docs/economy.md`
- Create: `backend/tests/test_knowledge_base.py`

### Modified files

- Modify: `backend/app/services/knowledge_base.py`
- Modify: `backend/app/services/assistant.py`
- Modify: `backend/app/services/chat.py`
- Modify: `backend/tests/test_chat.py`

### Responsibilities

- `knowledge_models.py`: typed entry/document/retrieval packet definitions and validation
- `knowledge_loader.py`: load JSON/Markdown corpus files from disk into typed models
- `knowledge_store.py`: in-memory corpus container and filtered lookups
- `knowledge_ranker.py`: scoring/ranking logic for entry/document matches
- `knowledge_retrieval.py`: single service interface for domain detection and packet assembly
- `knowledge_base.py`: compatibility shim or thin facade pointing to the new retrieval service
- `backend/data/knowledge/*`: launch corpus data and supporting explanatory docs
- `assistant.py`: accept richer retrieval context and format it cleanly for the model
- `chat.py`: use richer retrieval packets in both deterministic and model-backed paths
- `test_knowledge_base.py`: unit and integration coverage for the new subsystem
- `test_chat.py`: regression coverage proving the new knowledge brain affects answers

---

### Task 1: Build the Typed Knowledge Foundation

**Files:**
- Create: `backend/app/services/knowledge_models.py`
- Create: `backend/app/services/knowledge_loader.py`
- Create: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the failing knowledge-model test**

```python
from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry


def test_knowledge_entry_accepts_balanced_launch_fields() -> None:
    entry = KnowledgeEntry(
        id="unlock-bone-voyage",
        canonical_name="Bone Voyage",
        entry_type="unlock",
        domain="quests",
        aliases=["bone voyage", "fossil island access"],
        summary="Unlocks Fossil Island access.",
        prerequisites=["Digsite progress", "100 museum kudos"],
        benefits=["Fossil Island access"],
        tradeoffs=["Requires quest and kudos setup"],
        related_entries=["travel-fossil-island"],
        retrieval_tags=["quest", "unlock", "travel", "fossil island"],
        source_type="curated",
        status="canonical",
        confidence=0.95,
        last_reviewed_at="2026-04-13",
        change_note="Launch corpus",
    )

    document = KnowledgeDocument(
        id="doc-quest-unlock-leverage",
        domain="quests",
        title="Quest unlock leverage",
        summary="Explains why unlock quests often matter more than isolated quest completions.",
        body="Quest unlocks matter when they open travel, gear, or repeatable account utility.",
        retrieval_tags=["quest", "unlock", "utility"],
        status="canonical",
    )

    assert entry.entry_type == "unlock"
    assert "travel" in entry.retrieval_tags
    assert document.domain == "quests"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: FAIL with `ModuleNotFoundError` for `app.services.knowledge_models`

- [ ] **Step 3: Write the typed models**

```python
from typing import Literal

from pydantic import BaseModel, Field


KnowledgeStatus = Literal["canonical", "staged", "deprecated"]
KnowledgeEntryType = Literal[
    "quest_chain",
    "unlock",
    "skill_method",
    "boss_profile",
    "gear_progression",
    "money_maker",
    "travel_utility",
    "account_routing_pattern",
]
KnowledgeDomain = Literal["quests", "skilling", "combat", "economy"]


class KnowledgeEntry(BaseModel):
    id: str
    canonical_name: str
    entry_type: KnowledgeEntryType
    domain: KnowledgeDomain
    aliases: list[str] = Field(default_factory=list)
    summary: str
    prerequisites: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    related_entries: list[str] = Field(default_factory=list)
    retrieval_tags: list[str] = Field(default_factory=list)
    source_type: str = "curated"
    status: KnowledgeStatus = "canonical"
    confidence: float = 1.0
    last_reviewed_at: str | None = None
    change_note: str | None = None


class KnowledgeDocument(BaseModel):
    id: str
    domain: KnowledgeDomain
    title: str
    summary: str
    body: str
    retrieval_tags: list[str] = Field(default_factory=list)
    status: KnowledgeStatus = "canonical"


class KnowledgeCorpus(BaseModel):
    entries: list[KnowledgeEntry] = Field(default_factory=list)
    documents: list[KnowledgeDocument] = Field(default_factory=list)
```

- [ ] **Step 4: Add the loader skeleton**

```python
from pathlib import Path
import json

from app.services.knowledge_models import KnowledgeCorpus, KnowledgeDocument, KnowledgeEntry


class KnowledgeLoader:
    def __init__(self, root: Path) -> None:
        self._root = root

    def load(self) -> KnowledgeCorpus:
        entry_files = sorted((self._root / "entries").glob("*.json"))
        document_files = sorted((self._root / "docs").glob("*.md"))

        entries: list[KnowledgeEntry] = []
        for path in entry_files:
            payload = json.loads(path.read_text(encoding="utf-8"))
            entries.extend(KnowledgeEntry.model_validate(item) for item in payload["entries"])

        documents: list[KnowledgeDocument] = []
        for path in document_files:
            lines = path.read_text(encoding="utf-8").splitlines()
            title = lines[0].removeprefix("# ").strip()
            summary = lines[1].strip()
            body = "\n".join(lines[3:]).strip()
            domain = path.stem
            documents.append(
                KnowledgeDocument(
                    id=f"doc-{path.stem}",
                    domain=domain,
                    title=title,
                    summary=summary,
                    body=body,
                    retrieval_tags=[domain],
                )
            )

        return KnowledgeCorpus(entries=entries, documents=documents)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: PASS for `test_knowledge_entry_accepts_balanced_launch_fields`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/knowledge_models.py backend/app/services/knowledge_loader.py backend/tests/test_knowledge_base.py
git commit -m "feat: add typed knowledge foundation"
```

---

### Task 2: Add the Launch Corpus and Retrieval Service

**Files:**
- Create: `backend/app/services/knowledge_store.py`
- Create: `backend/app/services/knowledge_ranker.py`
- Create: `backend/app/services/knowledge_retrieval.py`
- Create: `backend/data/knowledge/entries/quests.json`
- Create: `backend/data/knowledge/entries/skilling.json`
- Create: `backend/data/knowledge/entries/combat.json`
- Create: `backend/data/knowledge/entries/economy.json`
- Create: `backend/data/knowledge/docs/quests.md`
- Create: `backend/data/knowledge/docs/skilling.md`
- Create: `backend/data/knowledge/docs/combat.md`
- Create: `backend/data/knowledge/docs/economy.md`
- Modify: `backend/app/services/knowledge_base.py`
- Test: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the failing retrieval test**

```python
from app.services.knowledge_base import knowledge_base_service


def test_retrieve_returns_structured_entries_and_docs_for_barrows_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="Am I ready for Barrows and what matters most?",
        session_intent="bossing",
        session_focus_summary="Barrows prep for a midgame account",
    )

    assert packet.entries
    assert packet.documents
    assert any(entry.canonical_name == "Barrows" for entry in packet.entries)
    assert any("barrows" in doc.title.lower() or "combat" in doc.title.lower() for doc in packet.documents)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py::test_retrieve_returns_structured_entries_and_docs_for_barrows_question -q`

Expected: FAIL with `AttributeError` because `retrieve_packet` does not exist yet

- [ ] **Step 3: Create the balanced launch corpus files**

```json
{
  "entries": [
    {
      "id": "boss-barrows",
      "canonical_name": "Barrows",
      "entry_type": "boss_profile",
      "domain": "combat",
      "aliases": ["barrows", "barrows brothers"],
      "summary": "Midgame repeatable combat activity that combines route comfort, prayer sustain, and profitable rune/chest rewards.",
      "prerequisites": ["Prayer sustain", "Travel coverage", "Reliable combat style"],
      "benefits": ["Midgame profit", "Tank and mage gear progression", "Bossing routine confidence"],
      "tradeoffs": ["Travel friction without teleports", "Prayer drain can feel annoying early"],
      "related_entries": ["travel-barrows", "gear-midgame-magic-upgrades"],
      "retrieval_tags": ["barrows", "boss", "bossing", "midgame", "profit"],
      "source_type": "curated",
      "status": "canonical",
      "confidence": 0.94,
      "last_reviewed_at": "2026-04-13",
      "change_note": "Launch corpus"
    }
  ]
}
```

```markdown
# Combat progression and boss readiness

Explanatory guidance for boss readiness, unlock burden, gear consistency, and repeatable combat routing.

Bossing advice should weigh unlock burden, route comfort, survivability, and repeatability rather than only raw combat stats. Barrows, Fight Caves, and similar activities feel much better once the account can repeat them cleanly.
```

- [ ] **Step 4: Implement the store and ranker**

```python
from app.services.knowledge_models import KnowledgeCorpus, KnowledgeDocument, KnowledgeEntry


class KnowledgeStore:
    def __init__(self, corpus: KnowledgeCorpus) -> None:
        self._entries = corpus.entries
        self._documents = corpus.documents

    def canonical_entries(self) -> list[KnowledgeEntry]:
        return [entry for entry in self._entries if entry.status == "canonical"]

    def canonical_documents(self) -> list[KnowledgeDocument]:
        return [document for document in self._documents if document.status == "canonical"]
```

```python
from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry


def score_entry(entry: KnowledgeEntry, normalized_query: str) -> int:
    haystacks = [entry.canonical_name.lower(), entry.summary.lower(), *[alias.lower() for alias in entry.aliases], *[tag.lower() for tag in entry.retrieval_tags]]
    return sum(1 for haystack in haystacks if any(token in haystack for token in normalized_query.split()))


def score_document(document: KnowledgeDocument, normalized_query: str) -> int:
    haystacks = [document.title.lower(), document.summary.lower(), document.body.lower(), *[tag.lower() for tag in document.retrieval_tags]]
    return sum(1 for haystack in haystacks if any(token in haystack for token in normalized_query.split()))
```

- [ ] **Step 5: Implement the retrieval packet service and facade**

```python
from pathlib import Path

from app.services.knowledge_loader import KnowledgeLoader
from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry
from app.services.knowledge_ranker import score_document, score_entry
from app.services.knowledge_store import KnowledgeStore


class KnowledgeRetrievalPacket(BaseModel):
    entries: list[KnowledgeEntry] = Field(default_factory=list)
    documents: list[KnowledgeDocument] = Field(default_factory=list)
    summary: str | None = None


class KnowledgeRetrievalService:
    def __init__(self) -> None:
        corpus = KnowledgeLoader(Path("backend/data/knowledge")).load()
        self._store = KnowledgeStore(corpus)

    def retrieve_packet(self, *, query: str, session_intent: str | None = None, session_focus_summary: str | None = None) -> KnowledgeRetrievalPacket:
        normalized = f"{query} {session_focus_summary or ''} {session_intent or ''}".lower()
        entry_matches = sorted(self._store.canonical_entries(), key=lambda item: score_entry(item, normalized), reverse=True)
        document_matches = sorted(self._store.canonical_documents(), key=lambda item: score_document(item, normalized), reverse=True)
        entries = [entry for entry in entry_matches if score_entry(entry, normalized) > 0][:3]
        documents = [document for document in document_matches if score_document(document, normalized) > 0][:2]
        summary = "\n".join(f"- {entry.canonical_name}: {entry.summary}" for entry in entries) or None
        return KnowledgeRetrievalPacket(entries=entries, documents=documents, summary=summary)
```

```python
from app.services.knowledge_retrieval import KnowledgeRetrievalService


knowledge_base_service = KnowledgeRetrievalService()
```

- [ ] **Step 6: Run tests to verify retrieval passes**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: PASS for the packet retrieval test and the earlier model test

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/knowledge_store.py backend/app/services/knowledge_ranker.py backend/app/services/knowledge_retrieval.py backend/app/services/knowledge_base.py backend/data/knowledge backend/tests/test_knowledge_base.py
git commit -m "feat: add structured OSRS retrieval corpus"
```

---

### Task 3: Integrate the Knowledge Brain Into Chat and Assistant

**Files:**
- Modify: `backend/app/services/assistant.py`
- Modify: `backend/app/services/chat.py`
- Test: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing chat integration test**

```python
@pytest.mark.asyncio
async def test_chat_includes_retrieved_knowledge_for_barrows_readiness(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    async def fake_generate_chat_reply(context):
        captured["retrieval"] = context.retrieval_summary or ""
        return "Barrows looks serviceable, but route comfort and prayer sustain still matter."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)

    account_response = await client.post("/api/accounts", json={"rsn": "BarrowsCheck"})
    await client.post(f"/api/accounts/{account_response.json()['id']}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Barrows Check"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Am I ready for Barrows?"},
    )

    assert response.status_code == 201
    assert "barrows" in captured["retrieval"].lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run pytest tests/test_chat.py::test_chat_includes_retrieved_knowledge_for_barrows_readiness -q`

Expected: FAIL because retrieval is still only a plain snippet summary path

- [ ] **Step 3: Extend the assistant context**

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
```

```python
sections = [
    f"Retrieved OSRS entry context: {context.retrieval_entries_summary or 'No structured entry matches.'}",
    f"Retrieved OSRS supporting context: {context.retrieval_documents_summary or 'No supporting documents retrieved.'}",
    f"Retrieved OSRS reference context: {context.retrieval_summary or 'No extra reference context retrieved for this question.'}",
]
```

- [ ] **Step 4: Wire the retrieval packet into chat**

```python
retrieval_packet = knowledge_base_service.retrieve_packet(
    query=resolved_message,
    session_intent=session_intent,
    session_focus_summary=session_focus_summary,
)

ai_response = await assistant_service.generate_chat_reply(
    AssistantChatContext(
        session_title=session.title,
        user_display_name=user.display_name,
        user_message=resolved_message,
        structured_fallback=structured_response,
        recent_messages=recent_messages,
        profile_summary=self._summarize_profile(profile),
        account_summary=self._summarize_account(focus_account),
        snapshot_summary=self._summarize_snapshot(latest_snapshot),
        skills_summary=self._summarize_skills(latest_snapshot),
        progress_summary=self._summarize_progress(progress),
        snapshot_delta_summary=self._summarize_snapshot_delta(latest_snapshot, previous_snapshot),
        goal_summary=self._summarize_goal(latest_goal) if emphasize_goal else None,
        session_focus_summary=session_focus_summary,
        session_intent_summary=self._summarize_session_intent(session_intent=session_intent),
        retrieval_summary=retrieval_packet.summary,
        retrieval_entries_summary="\n".join(f"- {entry.canonical_name}: {entry.summary}" for entry in retrieval_packet.entries) or None,
        retrieval_documents_summary="\n".join(f"- {doc.title}: {doc.summary}" for doc in retrieval_packet.documents) or None,
    )
)
```

- [ ] **Step 5: Run tests to verify the chat integration passes**

Run: `docker compose exec backend uv run pytest tests/test_chat.py::test_chat_includes_retrieved_knowledge_for_barrows_readiness -q`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/assistant.py backend/app/services/chat.py backend/tests/test_chat.py
git commit -m "feat: feed structured OSRS retrieval into chat"
```

---

### Task 4: Expand Balanced Day-One Coverage and Lock In Regression Tests

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
- Modify: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing balanced-coverage regression tests**

```python
def test_retrieve_balanced_launch_domains_for_weekend_profit_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What should I push if I want better money by this weekend?",
        session_intent="money",
        session_focus_summary="Weekend planning for account progression",
    )

    matched_domains = {entry.domain for entry in packet.entries}
    assert "economy" in matched_domains
    assert packet.documents
```

```python
@pytest.mark.asyncio
async def test_chat_uses_balanced_launch_knowledge_for_unlock_question(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    async def fake_generate_chat_reply(context):
        captured["entries"] = context.retrieval_entries_summary or ""
        return "The next unlock should improve travel and repeatable account utility."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)
    account_response = await client.post("/api/accounts", json={"rsn": "UnlockPath"})
    await client.post(f"/api/accounts/{account_response.json()['id']}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Unlock Brain"} )

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What utility unlock should I push next?"},
    )

    assert response.status_code == 201
    assert "unlock" in captured["entries"].lower() or "travel" in captured["entries"].lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py::test_retrieve_balanced_launch_domains_for_weekend_profit_question tests/test_chat.py::test_chat_uses_balanced_launch_knowledge_for_unlock_question -q`

Expected: FAIL because the launch corpus is still too thin

- [ ] **Step 3: Expand the curated corpus across all four domains**

```json
{
  "entries": [
    {
      "id": "quest-recipe-for-disaster",
      "canonical_name": "Recipe for Disaster",
      "entry_type": "quest_chain",
      "domain": "quests",
      "aliases": ["recipe for disaster", "rfd", "barrows gloves"],
      "summary": "High-value quest chain that unlocks Barrows gloves and anchors many midgame account routes.",
      "prerequisites": ["Subquest progression", "Quest prerequisites", "Skill checks"],
      "benefits": ["Barrows gloves", "Midgame progression anchor"],
      "tradeoffs": ["Long chain", "Mixed requirements"],
      "related_entries": ["unlock-bone-voyage"],
      "retrieval_tags": ["quest", "unlock", "barrows gloves", "midgame"],
      "source_type": "curated",
      "status": "canonical",
      "confidence": 0.96,
      "last_reviewed_at": "2026-04-13",
      "change_note": "Launch corpus"
    }
  ]
}
```

```json
{
  "entries": [
    {
      "id": "skill-high-alchemy",
      "canonical_name": "High Alchemy",
      "entry_type": "skill_method",
      "domain": "skilling",
      "aliases": ["high alchemy", "alching", "train magic"],
      "summary": "Low-attention magic training method that trades top-end efficiency for routine-friendly progress.",
      "prerequisites": ["Magic level for spell", "Alchemy items or profit-tolerant supply setup"],
      "benefits": ["Low-attention magic XP", "Routine-friendly progress"],
      "tradeoffs": ["Lower peak XP than sweaty methods", "Can lose money depending on inputs"],
      "related_entries": ["money-maker-low-burden"],
      "retrieval_tags": ["magic", "training", "afk", "low attention"],
      "source_type": "curated",
      "status": "canonical",
      "confidence": 0.92,
      "last_reviewed_at": "2026-04-13",
      "change_note": "Launch corpus"
    }
  ]
}
```

- [ ] **Step 4: Add explanatory docs that match launch questions**

```markdown
# Money routing and unlock burden

Guidance for comparing GP methods, unlock burden, routine fit, and weekend planning.

Money advice should compare raw profit, unlock burden, setup friction, and whether the activity builds toward future value. Lower-burden methods can be the correct answer even when their peak GP is lower.
```

- [ ] **Step 5: Run the focused knowledge tests**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: PASS

- [ ] **Step 6: Run the chat regression suite**

Run: `docker compose exec backend uv run pytest tests/test_chat.py -q`

Expected: PASS with all existing chat expectations preserved and the new retrieval-backed tests green

- [ ] **Step 7: Commit**

```bash
git add backend/data/knowledge backend/tests/test_knowledge_base.py backend/tests/test_chat.py
git commit -m "feat: expand curated OSRS launch corpus"
```

---

### Task 5: Harden the Knowledge Lifecycle for Launch Safety

**Files:**
- Modify: `backend/app/services/knowledge_loader.py`
- Modify: `backend/app/services/knowledge_store.py`
- Modify: `backend/app/services/knowledge_retrieval.py`
- Modify: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the failing lifecycle-status test**

```python
def test_retrieve_prefers_canonical_entries_over_staged_entries() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What utility unlock should I push next?",
        session_intent="progression",
        session_focus_summary="Utility unlock planning",
    )

    assert all(entry.status == "canonical" for entry in packet.entries)
```

- [ ] **Step 2: Run test to verify it fails or is unimplemented**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py::test_retrieve_prefers_canonical_entries_over_staged_entries -q`

Expected: FAIL or missing lifecycle behavior

- [ ] **Step 3: Add status-aware filtering to the store**

```python
class KnowledgeStore:
    def canonical_entries(self) -> list[KnowledgeEntry]:
        return [entry for entry in self._entries if entry.status == "canonical"]

    def staged_entries(self) -> list[KnowledgeEntry]:
        return [entry for entry in self._entries if entry.status == "staged"]

    def canonical_documents(self) -> list[KnowledgeDocument]:
        return [document for document in self._documents if document.status == "canonical"]
```

- [ ] **Step 4: Add loader validation coverage**

```python
def test_loader_rejects_invalid_status() -> None:
    with pytest.raises(Exception):
        KnowledgeEntry(
            id="bad-entry",
            canonical_name="Bad Entry",
            entry_type="unlock",
            domain="quests",
            summary="bad",
            status="broken",
        )
```

- [ ] **Step 5: Run the lifecycle tests**

Run: `docker compose exec backend uv run pytest tests/test_knowledge_base.py -q`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/knowledge_loader.py backend/app/services/knowledge_store.py backend/app/services/knowledge_retrieval.py backend/tests/test_knowledge_base.py
git commit -m "feat: add launch-safe knowledge lifecycle handling"
```

---

## Self-Review

### Spec coverage

- Typed entry model: covered by Task 1
- Hybrid retrieval architecture: covered by Task 2
- Chat/assistant integration: covered by Task 3
- Balanced day-one breadth: covered by Task 4
- Update path and lifecycle states: covered by Task 5

No spec gaps remain for the first implementation cycle.

### Placeholder scan

- Removed vague "add validation" language and replaced it with specific tests and file responsibilities
- Each task has concrete files, commands, and code examples
- No `TODO`, `TBD`, or "similar to above" placeholders remain

### Type consistency

- `KnowledgeEntry`, `KnowledgeDocument`, and `KnowledgeCorpus` are introduced in Task 1 and reused consistently later
- `retrieve_packet()` is the retrieval entrypoint everywhere after Task 2
- `retrieval_entries_summary` and `retrieval_documents_summary` are introduced in Task 3 and used consistently in later tests

## Recommended Execution Order

Implement Tasks 1 through 5 in order. Do not skip the early typed-model and retrieval-service split, because the later corpus and chat-integration work assumes those interfaces exist.
