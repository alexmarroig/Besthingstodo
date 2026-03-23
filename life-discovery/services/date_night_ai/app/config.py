from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("postgres_port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("postgres_port must be positive")
        return value

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
