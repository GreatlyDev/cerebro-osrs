from app.services.knowledge_models import KnowledgeCorpus, KnowledgeDocument, KnowledgeEntry


class KnowledgeStore:
    def __init__(self, corpus: KnowledgeCorpus) -> None:
        self._entries = corpus.entries
        self._documents = corpus.documents

    def canonical_entries(self) -> list[KnowledgeEntry]:
        return [entry for entry in self._entries if entry.status == "canonical"]

    def canonical_documents(self) -> list[KnowledgeDocument]:
        return [document for document in self._documents if document.status == "canonical"]
