from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry


def _tokenize(text: str) -> list[str]:
    return [token for token in text.lower().replace("?", " ").replace(",", " ").split() if token]


def score_entry(entry: KnowledgeEntry, normalized_query: str) -> int:
    tokens = _tokenize(normalized_query)
    haystacks = [
        entry.canonical_name.lower(),
        entry.summary.lower(),
        *[alias.lower() for alias in entry.aliases],
        *[tag.lower() for tag in entry.retrieval_tags],
    ]
    return sum(1 for haystack in haystacks if any(token in haystack for token in tokens))


def score_document(document: KnowledgeDocument, normalized_query: str) -> int:
    tokens = _tokenize(normalized_query)
    haystacks = [
        document.title.lower(),
        document.summary.lower(),
        document.body.lower(),
        *[tag.lower() for tag in document.retrieval_tags],
    ]
    return sum(1 for haystack in haystacks if any(token in haystack for token in tokens))
