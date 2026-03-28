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


class EmailPasswordAuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("display_name")
    @classmethod
    def normalize_optional_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("Display name must not be blank.")
        return normalized

    @field_validator("password")
    @classmethod
    def normalize_password(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 8:
            raise ValueError("Password must be at least 8 characters.")
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
