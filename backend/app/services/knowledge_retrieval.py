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
            key=lambda item: score_entry(item, normalized),
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
