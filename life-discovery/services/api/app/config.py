from urllib.parse import urlparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60 * 24

    context_engine_url: str = "http://context-engine:8005"
    user_profile_engine_url: str = "http://user-profile-engine:8006"
    ai_concierge_url: str = "http://ai-concierge:8007"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("context_engine_url", "user_profile_engine_url", "ai_concierge_url")
    @classmethod
    def validate_service_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("service URLs must be absolute http/https URLs")
        return value

    @model_validator(mode="after")
    def validate_runtime_safety(self):
        if self.app_env.lower() in {"production", "staging"} and self.jwt_secret == "change-me":
            raise ValueError("jwt_secret must not use the development default outside development")
        return self

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
