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
