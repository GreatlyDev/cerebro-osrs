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
    plugin_instance_id: str
    plugin_version: str
    completed_quests: list[str] = Field(default_factory=list)
    completed_diaries: dict[str, list[str]] = Field(default_factory=dict)
    unlocked_transports: list[str] = Field(default_factory=list)
    active_unlocks: list[str] = Field(default_factory=list)
    owned_gear: list[str] = Field(default_factory=list)
    equipped_gear: dict[str, str] = Field(default_factory=dict)
    notable_items: list[str] = Field(default_factory=list)
    companion_state: dict[str, Any] = Field(default_factory=dict)


class CompanionSyncResponse(BaseModel):
    account_id: int
    status: str
    detail: str
    synced_at: datetime
