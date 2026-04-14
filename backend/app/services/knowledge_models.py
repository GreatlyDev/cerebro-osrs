from typing import Literal

from pydantic import BaseModel, Field


KnowledgeStatus = Literal["canonical", "staged", "deprecated"]
KnowledgeEntryType = Literal[
    "quest_chain",
    "unlock",
    "skill_method",
    "boss_profile",
    "gear_progression",
    "money_maker",
    "travel_utility",
    "account_routing_pattern",
]
KnowledgeDomain = Literal["quests", "skilling", "combat", "economy"]


class KnowledgeEntry(BaseModel):
    id: str
    canonical_name: str
    entry_type: KnowledgeEntryType
    domain: KnowledgeDomain
    aliases: list[str] = Field(default_factory=list)
    summary: str
    prerequisites: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    related_entries: list[str] = Field(default_factory=list)
    retrieval_tags: list[str] = Field(default_factory=list)
    source_type: str = "curated"
    status: KnowledgeStatus = "canonical"
    confidence: float = 1.0
    last_reviewed_at: str | None = None
    change_note: str | None = None


class KnowledgeDocument(BaseModel):
    id: str
    domain: KnowledgeDomain
    title: str
    summary: str
    body: str
    retrieval_tags: list[str] = Field(default_factory=list)
    status: KnowledgeStatus = "canonical"


class KnowledgeCorpus(BaseModel):
    entries: list[KnowledgeEntry] = Field(default_factory=list)
    documents: list[KnowledgeDocument] = Field(default_factory=list)
