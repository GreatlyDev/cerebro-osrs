from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _normalize_text_list(values: list[str]) -> list[str]:
    normalized = {_normalize_text(item) for item in values}
    return sorted(item for item in normalized if item)


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
        return _normalize_text_list(value)

    @field_validator("completed_diaries")
    @classmethod
    def normalize_completed_diaries(
        cls,
        value: dict[str, list[str]],
    ) -> dict[str, list[str]]:
        normalized = {
            cleaned_key: _normalize_text_list(tiers)
            for key, tiers in value.items()
            if (cleaned_key := _normalize_text(key))
        }
        return {
            key: tiers
            for key, tiers in sorted(normalized.items())
            if tiers
        }

    @field_validator("equipped_gear")
    @classmethod
    def normalize_equipped_gear(cls, value: dict[str, str]) -> dict[str, str]:
        normalized = {
            cleaned_slot: cleaned_item
            for slot, item in value.items()
            if (cleaned_slot := _normalize_text(slot))
            if (cleaned_item := _normalize_text(item))
        }
        return dict(sorted(normalized.items()))


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
