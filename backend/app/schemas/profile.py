from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    primary_account_rsn: str | None
    play_style: str
    goals_focus: str
    prefers_afk_methods: bool
    prefers_profitable_methods: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=64)
    primary_account_rsn: str | None = Field(default=None, max_length=12)
    play_style: str | None = Field(default=None, max_length=24)
    goals_focus: str | None = Field(default=None, max_length=24)
    prefers_afk_methods: bool | None = None
    prefers_profitable_methods: bool | None = None

    @field_validator("display_name", "primary_account_rsn", "play_style", "goals_focus")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("Text fields must not be blank.")
        return normalized
