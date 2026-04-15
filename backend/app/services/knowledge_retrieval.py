from pathlib import Path

from app.services.knowledge_loader import KnowledgeLoader
from app.services.knowledge_models import KnowledgeRetrievalPacket
from app.services.knowledge_ranker import (
    apply_route_bonus,
    explain_entry_match,
    score_document,
)
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
        document_matches = sorted(
            self._store.canonical_documents(),
            key=lambda item: score_document(item, normalized),
            reverse=True,
        )

        entries = [entry for _, _, entry in ranked_entries[:4]]
        match_notes = [
            f"{entry.canonical_name}: {', '.join(reasons) or 'context match'}"
            for _, reasons, entry in ranked_entries[:4]
        ]
        documents = [document for document in document_matches if score_document(document, normalized) > 0][:2]
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
