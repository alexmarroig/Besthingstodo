from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"

    context_engine_url: str = "http://context-engine:8005"
    user_profile_engine_url: str = "http://user-profile-engine:8006"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("context_engine_url", "user_profile_engine_url", "openai_base_url")
    @classmethod
    def validate_service_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("configured URLs must be absolute http/https URLs")
        return value

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
