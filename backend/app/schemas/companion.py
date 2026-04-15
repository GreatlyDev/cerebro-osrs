from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CompanionLinkSessionResponse(BaseModel):
    link_token: str
    expires_at: datetime


class CompanionLinkExchangeRequest(BaseModel):
    link_token: str
    plugin_instance_id: str = Field(min_length=1, max_length=128)
    plugin_version: str = Field(min_length=1, max_length=64)


class CompanionLinkExchangeResponse(BaseModel):
    sync_secret: str
    account_id: int
    rsn: str
    status: str


class CompanionSyncRequest(BaseModel):
    plugin_instance_id: str = Field(min_length=1, max_length=128)
    plugin_version: str = Field(min_length=1, max_length=64)
    completed_quests: list[str] | None = None
    completed_diaries: dict[str, list[str]] | None = None
    unlocked_transports: list[str] | None = None
    active_unlocks: list[str] | None = None
    owned_gear: list[str] | None = None
    equipped_gear: dict[str, str] | None = None
    notable_items: list[str] | None = None
    companion_state: dict[str, Any] | None = None


class CompanionSyncResponse(BaseModel):
    account_id: int
    status: str
    detail: str
    synced_at: datetime
