from typing import Any

from pydantic import BaseModel, Field, field_validator


class GearRecommendationRequest(BaseModel):
    combat_style: str = Field(min_length=1, max_length=24)
    budget_tier: str = Field(min_length=1, max_length=24)
    current_gear: list[str] = Field(default_factory=list)
    account_rsn: str | None = Field(default=None, max_length=12)

    @field_validator("combat_style", "budget_tier")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return " ".join(value.strip().lower().split())


class GearUpgradeRecommendation(BaseModel):
    item_name: str
    slot: str
    budget_tier: str
    upgrade_reason: str
    requirements: list[str]
    estimated_cost: str
    priority: str


class GearRecommendationResponse(BaseModel):
    combat_style: str
    budget_tier: str
    account_rsn: str | None
    recommendations: list[GearUpgradeRecommendation]
    context: dict[str, Any]
