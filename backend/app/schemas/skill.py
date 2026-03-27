from typing import Any

from pydantic import BaseModel, Field


class SkillSummary(BaseModel):
    key: str
    label: str
    category: str


class SkillListResponse(BaseModel):
    items: list[SkillSummary]
    total: int


class SkillRecommendation(BaseModel):
    method: str
    preference: str
    min_level: int = Field(ge=1)
    max_level: int = Field(ge=1)
    estimated_xp_rate: str
    requirements: list[str]
    rationale: str
    tags: list[str]


class SkillRecommendationListResponse(BaseModel):
    skill: str
    account_rsn: str | None
    preference: str
    current_level: int | None
    recommendations: list[SkillRecommendation]
    context: dict[str, Any]
