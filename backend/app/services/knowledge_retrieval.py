from pathlib import Path

from pydantic import BaseModel, Field

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
        corpus_root = Path(__file__).resolve().parents[2] / "data" / "knowledge"
        corpus = KnowledgeLoader(corpus_root).load()
        self._store = KnowledgeStore(corpus)

    def retrieve_packet(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> KnowledgeRetrievalPacket:
        normalized = f"{query} {session_focus_summary or ''} {session_intent or ''}".lower()
        entry_matches = sorted(
            self._store.canonical_entries(),
            key=lambda item: score_entry(item, normalized)
            + self._contextual_entry_boost(item.canonical_name, normalized, session_intent, session_focus_summary),
            reverse=True,
        )
        document_matches = sorted(
            self._store.canonical_documents(),
            key=lambda item: score_document(item, normalized),
            reverse=True,
        )

        entries = [entry for entry in entry_matches if score_entry(entry, normalized) > 0][:3]
        documents = [document for document in document_matches if score_document(document, normalized) > 0][:2]
        summary = "\n".join(f"- {entry.canonical_name}: {entry.summary}" for entry in entries) or None
        return KnowledgeRetrievalPacket(entries=entries, documents=documents, summary=summary)

    def _contextual_entry_boost(
        self,
        canonical_name: str,
        normalized_query: str,
        session_intent: str | None,
        session_focus_summary: str | None,
    ) -> int:
        name = canonical_name.lower()
        focus = (session_focus_summary or "").lower()
        boost = 0

        if session_intent in {"money", "profit"} and name == "profit versus progression":
            boost += 5
        if session_intent in {"money", "profit"} and any(token in normalized_query for token in ("low attention", "afk", "casual")):
            if name == "afk planning":
                boost += 8
            if name == "low-attention profit routing":
                boost += 6
        if session_intent == "progression" and any(token in normalized_query for token in ("weekend", "sunday", "this week")):
            if name == "weekend milestone planning":
                boost += 5
        if "slayer" in normalized_query or "slayer" in focus:
            if name == "slayer unlock planning":
                boost += 5
        if "diary" in normalized_query or "diary" in focus:
            if name == "achievement diary utility":
                boost += 4
        if "barrows" in normalized_query or "barrows" in focus:
            if name == "barrows":
                boost += 4

        return boost
