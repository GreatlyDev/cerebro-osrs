from datetime import datetime

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatSessionCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return " ".join(value.strip().split())


class ChatActionContext(BaseModel):
    action_type: str | None = None
    title: str | None = None
    summary: str | None = None
    score: int | float | None = None
    priority: str | None = None
    target: dict[str, Any] = Field(default_factory=dict)
    blockers: list[str] = Field(default_factory=list)
    supporting_data: dict[str, Any] = Field(default_factory=dict)


class ChatMessageCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    action_context: ChatActionContext | None = None

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        return " ".join(value.strip().split())


class ChatMessageSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    session_state: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class ChatSessionListResponse(BaseModel):
    items: list[ChatSessionResponse]
    total: int


class ChatMessageResponse(BaseModel):
    session_id: int
    user_message: ChatMessageSummary
    assistant_message: ChatMessageSummary
