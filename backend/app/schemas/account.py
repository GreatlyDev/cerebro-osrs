from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AccountCreateRequest(BaseModel):
    rsn: str = Field(min_length=1, max_length=12, description="Old School RuneScape username")

    @field_validator("rsn")
    @classmethod
    def normalize_rsn(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("RSN must not be blank.")
        return normalized


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rsn: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    companion_status: str | None = None
    companion_last_synced_at: datetime | None = None


class AccountListResponse(BaseModel):
    items: list[AccountResponse]
    total: int


class AccountSyncResponse(BaseModel):
    account_id: int
    status: str
    detail: str
    snapshot_id: int


class AccountSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    source: str
    sync_status: str
    summary: dict[str, Any]
    created_at: datetime


class AccountSnapshotListResponse(BaseModel):
    items: list[AccountSnapshotResponse]
    total: int
