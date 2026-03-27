from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GoalCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    goal_type: str = Field(min_length=1, max_length=32)
    target_account_rsn: str | None = Field(default=None, max_length=12)
    notes: str | None = None

    @field_validator("title", "goal_type", "target_account_rsn", "notes")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("Text fields must not be blank.")
        return normalized


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    goal_type: str
    target_account_rsn: str | None
    status: str
    notes: str | None
    generated_plan: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class GoalListResponse(BaseModel):
    items: list[GoalResponse]
    total: int


class GoalPlanResponse(BaseModel):
    goal_id: int
    status: str
    summary: str
    steps: list[str]
    context: dict[str, Any]
