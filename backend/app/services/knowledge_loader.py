import json
from pathlib import Path

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
            entries.extend(KnowledgeEntry.model_validate(item) for item in payload.get("entries", []))

        documents: list[KnowledgeDocument] = []
        for path in document_files:
            lines = path.read_text(encoding="utf-8").splitlines()
            if not lines:
                continue

            title = lines[0].removeprefix("# ").strip() or path.stem.replace("-", " ").title()
            summary = lines[2].strip() if len(lines) > 2 else ""
            body = "\n".join(lines[4:]).strip() if len(lines) > 4 else ""
            documents.append(
                KnowledgeDocument(
                    id=f"doc-{path.stem}",
                    domain=path.stem,
                    title=title,
                    summary=summary,
                    body=body,
                    retrieval_tags=[path.stem],
                )
            )

        return KnowledgeCorpus(entries=entries, documents=documents)
