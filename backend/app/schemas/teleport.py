from typing import Any

from pydantic import BaseModel, Field, field_validator


class TeleportRouteRequest(BaseModel):
    destination: str = Field(min_length=1, max_length=80)
    account_rsn: str | None = Field(default=None, max_length=12)
    preference: str | None = Field(default=None, max_length=24)

    @field_validator("destination", "preference")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return " ".join(value.strip().lower().split())


class TeleportOption(BaseModel):
    method: str
    route_type: str
    requirements: list[str]
    travel_notes: str
    convenience: str


class TeleportRouteResponse(BaseModel):
    destination: str
    account_rsn: str | None
    preference: str
    recommended_route: TeleportOption
    alternatives: list[TeleportOption]
    context: dict[str, Any]
