from app.services.knowledge_models import KnowledgeRetrievalPacket


class KnowledgeAnsweringService:
    def build_utility_unlock_answer(
        self,
        *,
        message: str,
        packet: KnowledgeRetrievalPacket,
        account_rsn: str | None,
    ) -> str | None:
        normalized = message.lower()
        if "unlock" not in normalized or "utility" not in normalized:
            return None
        if not packet.entries:
            return None

        top = packet.entries[0]
        subject = account_rsn or "this account"
        benefit = top.benefits[0] if top.benefits else "broader account utility"
        tradeoff = top.tradeoffs[0] if top.tradeoffs else "it still needs some setup first"
        qualifier = " as a diary-style utility unlock" if "diary-style" in normalized else " as your next utility unlock"
        return (
            f"For {subject}, I'd prioritize {top.canonical_name}{qualifier}. "
            f"{top.summary} It has broader account value because it reduces route friction and supports repeatable utility. "
            f"The main payoff is {benefit.lower()}, and the tradeoff is that {tradeoff.lower()}."
        )

    def build_money_tradeoff_answer(
        self,
        *,
        message: str,
        packet: KnowledgeRetrievalPacket,
    ) -> str | None:
        normalized = message.lower()
        if not (
            "tradeoff" in normalized
            or "better for me" in normalized
            or ("profit" in normalized and "progression" in normalized)
        ):
            return None
        if packet.primary_domain != "economy" or not packet.entries:
            return None

        top = packet.entries[0]
        tradeoff = top.tradeoffs[0] if top.tradeoffs else "highest GP is not always the right route"
        return (
            f"The best frame here is {top.canonical_name}. "
            f"{top.summary} In practice, that means {tradeoff.lower()}."
        )

knowledge_answering_service = KnowledgeAnsweringService()
