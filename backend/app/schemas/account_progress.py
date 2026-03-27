from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AccountProgressUpdateRequest(BaseModel):
    completed_quests: list[str] = Field(default_factory=list)
    unlocked_transports: list[str] = Field(default_factory=list)
    owned_gear: list[str] = Field(default_factory=list)
    active_unlocks: list[str] = Field(default_factory=list)

    @field_validator("completed_quests", "unlocked_transports", "owned_gear", "active_unlocks")
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
    unlocked_transports: list[str]
    owned_gear: list[str]
    active_unlocks: list[str]
    created_at: datetime
    updated_at: datetime
