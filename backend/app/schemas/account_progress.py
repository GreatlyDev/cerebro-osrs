from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AccountProgressUpdateRequest(BaseModel):
    completed_quests: list[str] = Field(default_factory=list)
    completed_diaries: dict[str, list[str]] = Field(default_factory=dict)
    unlocked_transports: list[str] = Field(default_factory=list)
    owned_gear: list[str] = Field(default_factory=list)
    equipped_gear: dict[str, str] = Field(default_factory=dict)
    notable_items: list[str] = Field(default_factory=list)
    active_unlocks: list[str] = Field(default_factory=list)
    companion_state: dict[str, Any] = Field(default_factory=dict)

    @field_validator(
        "completed_quests",
        "unlocked_transports",
        "owned_gear",
        "notable_items",
        "active_unlocks",
    )
    @classmethod
    def normalize_entries(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for item in value:
            cleaned = " ".join(item.strip().lower().split())
            if cleaned:
                normalized.append(cleaned)
        return sorted(set(normalized))


class AccountProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    completed_quests: list[str]
    completed_diaries: dict[str, list[str]]
    unlocked_transports: list[str]
    owned_gear: list[str]
    equipped_gear: dict[str, str]
    notable_items: list[str]
    active_unlocks: list[str]
    companion_state: dict[str, Any]
    created_at: datetime
    updated_at: datetime
