from app.services.knowledge_models import KnowledgeDomain, KnowledgeRouteDecision


class KnowledgeRouter:
    def route(
        self,
        *,
        query: str,
        session_intent: str | None = None,
        session_focus_summary: str | None = None,
    ) -> KnowledgeRouteDecision:
        normalized = f"{query} {session_focus_summary or ''} {session_intent or ''}".lower()
        secondary_domains: list[KnowledgeDomain] = []

        if any(token in normalized for token in ("ready for", "am i ready", "missing for", "prep for")):
            mode = "readiness"
        elif any(token in normalized for token in ("better than", "better for me", "versus", "vs", "tradeoff", "worth it")):
            mode = "comparison"
        elif any(token in normalized for token in ("this week", "this weekend", "by sunday", "focus on")):
            mode = "planning"
        elif any(token in normalized for token in ("why", "how does", "what matters most")):
            mode = "explanation"
        else:
            mode = "factual"

        if any(token in normalized for token in ("barrows", "jad", "fight caves", "boss", "slayer", "gorillas")):
            primary_domain: KnowledgeDomain | None = "combat"
        elif any(token in normalized for token in ("money", "profit", "gp", "weekend")):
            primary_domain = "economy"
        elif any(token in normalized for token in ("quest", "diary", "unlock", "travel", "fairy ring")):
            primary_domain = "quests"
        elif any(token in normalized for token in ("train", "skilling", "xp", "birdhouse", "farming", "tempoross")):
            primary_domain = "skilling"
        else:
            primary_domain = None

        if primary_domain == "economy" and any(token in normalized for token in ("barrows", "gorillas", "boss")):
            secondary_domains.append("combat")
        if primary_domain == "combat" and any(token in normalized for token in ("money", "profit", "weekend")):
            secondary_domains.append("economy")
        if primary_domain == "quests" and any(token in normalized for token in ("travel", "utility", "route")):
            secondary_domains.append("economy")

        return KnowledgeRouteDecision(
            question_mode=mode,
            primary_domain=primary_domain,
            secondary_domains=secondary_domains,
            include_supporting_documents=mode in {"readiness", "comparison", "planning", "explanation"},
            reasoning=[f"mode={mode}", f"primary={primary_domain or 'none'}"],
        )
