from app.services.knowledge_models import KnowledgeEntry, KnowledgeRetrievalPacket
from app.services.knowledge_answering import knowledge_answering_service


def test_build_utility_unlock_answer_uses_retrieved_unlocks() -> None:
    packet = KnowledgeRetrievalPacket(
        entries=[
            KnowledgeEntry(
                id="utility-fairy-rings",
                canonical_name="Fairy ring utility",
                entry_type="travel_utility",
                domain="quests",
                summary="Fairy rings reduce travel friction across the account.",
                benefits=["Huge travel coverage"],
                tradeoffs=["Needs quest progress"],
                retrieval_tags=["fairy ring", "travel", "utility"],
            )
        ],
        question_mode="planning",
        primary_domain="quests",
        include_supporting_documents=True,
    )

    answer = knowledge_answering_service.build_utility_unlock_answer(
        message="What utility unlock should I push next?",
        packet=packet,
        account_rsn="Gilganor",
    )

    assert answer is not None
    assert "Fairy ring utility" in answer
    assert "Gilganor" in answer


def test_build_money_tradeoff_answer_uses_retrieved_money_knowledge() -> None:
    packet = KnowledgeRetrievalPacket(
        entries=[
            KnowledgeEntry(
                id="money-profit-vs-progression",
                canonical_name="Profit versus progression",
                entry_type="money_maker",
                domain="economy",
                summary="The right money route balances GP, unlock burden, and future account value.",
                tradeoffs=["Highest GP is not always the best route"],
                retrieval_tags=["profit", "progression", "tradeoff"],
            )
        ],
        question_mode="comparison",
        primary_domain="economy",
    )

    answer = knowledge_answering_service.build_money_tradeoff_answer(
        message="What is better for me right now, profit or progression?",
        packet=packet,
    )

    assert answer is not None
    assert "profit versus progression" in answer.lower()
