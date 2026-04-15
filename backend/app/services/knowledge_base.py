from app.services.knowledge_models import KnowledgeRetrievalPacket
from app.services.knowledge_retrieval import KnowledgeRetrievalService


class KnowledgeBaseService:
    def __init__(self) -> None:
        self._retrieval = KnowledgeRetrievalService()

    def retrieve_packet(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> KnowledgeRetrievalPacket:
        return self._retrieval.retrieve_packet(
            query=query,
            session_intent=session_intent,
            session_focus_summary=session_focus_summary,
        )

    def retrieve(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> str | None:
        return self.retrieve_packet(
            query=query,
            session_intent=session_intent,
            session_focus_summary=session_focus_summary,
        ).summary


knowledge_base_service = KnowledgeBaseService()
