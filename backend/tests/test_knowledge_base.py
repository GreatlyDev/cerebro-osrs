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


def test_retrieve_packet_exposes_match_notes_for_unlock_question() -> None:
    packet = knowledge_base_service.retrieve_packet(
        query="What utility unlock should I push next?",
        session_intent="progression",
        session_focus_summary="Travel and utility cleanup",
    )

    assert packet.match_notes
    assert any("domain" in note or "tag" in note or "alias" in note for note in packet.match_notes)


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
