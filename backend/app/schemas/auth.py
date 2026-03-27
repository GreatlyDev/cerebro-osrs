from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class DevLoginRequest(BaseModel):
    email: EmailStr
    display_name: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("Display name must not be blank.")
        return normalized


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    created_at: datetime
    updated_at: datetime


class AuthSessionResponse(BaseModel):
    user: AuthUserResponse
    session_token: str
