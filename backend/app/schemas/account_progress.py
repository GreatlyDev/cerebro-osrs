from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _normalize_text_list(values: list[str]) -> list[str]:
    normalized = {_normalize_text(item) for item in values}
    return sorted(item for item in normalized if item)


class AccountProgressUpdateRequest(BaseModel):
    completed_quests: list[str] | None = None
    completed_diaries: dict[str, list[str]] | None = None
    unlocked_transports: list[str] | None = None
    owned_gear: list[str] | None = None
    equipped_gear: dict[str, str] | None = None
    notable_items: list[str] | None = None
    active_unlocks: list[str] | None = None
    companion_state: dict[str, Any] | None = None

    @field_validator(
        "completed_quests",
        "unlocked_transports",
        "owned_gear",
        "notable_items",
        "active_unlocks",
    )
    @classmethod
    def normalize_entries(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return _normalize_text_list(value)

    @field_validator("completed_diaries")
    @classmethod
    def normalize_completed_diaries(
        cls,
        value: dict[str, list[str]] | None,
    ) -> dict[str, list[str]] | None:
        if value is None:
            return None
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
    def normalize_equipped_gear(cls, value: dict[str, str] | None) -> dict[str, str] | None:
        if value is None:
            return None
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
