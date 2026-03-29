from functools import lru_cache

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cerebro OSRS API"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_version: str = "0.1.0"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_chat_model: str = "gpt-5-mini"
    openai_chat_enabled: bool = True
    openai_timeout_seconds: float = 20.0

    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "cerebro"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    osrs_hiscores_base_url: str = (
        "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws"
    )
    backend_cors_origins: list[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def debug(self) -> bool:
        return self.app_env.lower() == "development"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ai_chat_available(self) -> bool:
        return self.openai_chat_enabled and bool(self.openai_api_key)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        return (
            "postgresql+asyncpg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
