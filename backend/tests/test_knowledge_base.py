import pytest

from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry
from app.services.knowledge_base import knowledge_base_service
from app.services.knowledge_store import KnowledgeStore
from app.services.knowledge_models import KnowledgeCorpus


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


def test_retrieve_matches_slayer_unlock_entry_for_slayer_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What slayer unlock should I push next?",
        session_intent="progression",
        session_focus_summary="Slayer utility planning",
    )

    assert any("slayer" in entry.canonical_name.lower() for entry in packet.entries)


def test_store_exposes_staged_entries_separately() -> None:
    store = KnowledgeStore(
        KnowledgeCorpus(
            entries=[
                KnowledgeEntry(
                    id="canonical-entry",
                    canonical_name="Canonical unlock",
                    entry_type="unlock",
                    domain="quests",
                    summary="Trusted knowledge.",
                    status="canonical",
                ),
                KnowledgeEntry(
                    id="staged-entry",
                    canonical_name="Staged unlock",
                    entry_type="unlock",
                    domain="quests",
                    summary="Draft knowledge.",
                    status="staged",
                ),
            ]
        )
    )

    assert [entry.canonical_name for entry in store.canonical_entries()] == ["Canonical unlock"]
    assert [entry.canonical_name for entry in store.staged_entries()] == ["Staged unlock"]


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
