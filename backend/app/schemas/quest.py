from pydantic import BaseModel


class QuestSummary(BaseModel):
    id: str
    name: str
    difficulty: str
    category: str
    recommendation_reason: str


class QuestListResponse(BaseModel):
    items: list[QuestSummary]
    total: int


class QuestDetailResponse(BaseModel):
    id: str
    name: str
    difficulty: str
    category: str
    short_description: str
    requirements: list[str]
    rewards: list[str]
    why_it_matters: str
    next_steps: list[str]
