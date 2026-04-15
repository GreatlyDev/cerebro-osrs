from app.services.knowledge_models import KnowledgeDocument, KnowledgeEntry, KnowledgeRouteDecision


def _tokenize(text: str) -> list[str]:
    stopwords = {
        "a",
        "am",
        "an",
        "and",
        "are",
        "at",
        "for",
        "how",
        "i",
        "if",
        "is",
        "it",
        "most",
        "next",
        "of",
        "on",
        "or",
        "should",
        "the",
        "this",
        "to",
        "what",
    }
    normalized = (
        text.lower()
        .replace("?", " ")
        .replace(",", " ")
        .replace(".", " ")
        .replace("!", " ")
        .replace("/", " ")
    )
    return [
        token
        for token in normalized.split()
        if token and len(token) > 2 and token not in stopwords
    ]


def score_entry(entry: KnowledgeEntry, normalized_query: str) -> int:
    tokens = _tokenize(normalized_query)
    haystacks = [
        entry.canonical_name.lower(),
        entry.summary.lower(),
        *[alias.lower() for alias in entry.aliases],
        *[tag.lower() for tag in entry.retrieval_tags],
    ]
    return sum(1 for haystack in haystacks if any(token in haystack for token in tokens))


def explain_entry_match(entry: KnowledgeEntry, normalized_query: str) -> tuple[int, list[str]]:
    tokens = _tokenize(normalized_query)
    reasons: list[str] = []
    score = 0

    for token in tokens:
        if token in entry.canonical_name.lower():
            score += 4
            reasons.append(f"name:{token}")
        if any(token in alias.lower() for alias in entry.aliases):
            score += 3
            reasons.append(f"alias:{token}")
        if any(token in tag.lower() for tag in entry.retrieval_tags):
            score += 2
            reasons.append(f"tag:{token}")
        if token in entry.summary.lower():
            score += 1
            reasons.append(f"summary:{token}")

    return score, reasons[:4]


def score_document(document: KnowledgeDocument, normalized_query: str) -> int:
    tokens = _tokenize(normalized_query)
    haystacks = [
        document.title.lower(),
        document.summary.lower(),
        document.body.lower(),
        *[tag.lower() for tag in document.retrieval_tags],
    ]
    return sum(1 for haystack in haystacks if any(token in haystack for token in tokens))


def apply_route_bonus(
    *,
    entry: KnowledgeEntry,
    route: KnowledgeRouteDecision,
) -> tuple[int, list[str]]:
    bonus = 0
    reasons: list[str] = []
    if route.primary_domain == entry.domain:
        bonus += 4
        reasons.append(f"primary-domain:{entry.domain}")
    if entry.domain in route.secondary_domains:
        bonus += 2
        reasons.append(f"secondary-domain:{entry.domain}")
    return bonus, reasons
