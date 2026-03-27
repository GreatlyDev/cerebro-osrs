from typing import Any

from pydantic import BaseModel, Field, field_validator


class NextActionRequest(BaseModel):
    account_rsn: str | None = Field(default=None, max_length=12)
    goal_id: int | None = Field(default=None, ge=1)
    limit: int = Field(default=4, ge=1, le=10)

    @field_validator("account_rsn")
    @classmethod
    def normalize_account_rsn(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        return normalized or None


class NextActionRecommendation(BaseModel):
    action_type: str
    title: str
    summary: str
    score: int = Field(ge=0, le=100)
    priority: str
    target: dict[str, Any]
    blockers: list[str]
    supporting_data: dict[str, Any]


class NextActionResponse(BaseModel):
    account_rsn: str | None
    goal_id: int | None
    goal_title: str | None
    top_action: NextActionRecommendation | None
    actions: list[NextActionRecommendation]
    context: dict[str, Any]
