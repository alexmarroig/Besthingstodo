from __future__ import annotations

import os
import time
from datetime import datetime, timezone

from pydantic_settings import BaseSettings, SettingsConfigDict

from profile_updater import get_engine, refresh_user_profiles


class Settings(BaseSettings):
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"

    interval_seconds: int = 3600
    lambda_decay: float = 0.05

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


def update_user_profiles() -> dict:
    settings = Settings()
    engine = get_engine(settings.database_url)
    return refresh_user_profiles(engine, lambda_decay=settings.lambda_decay)


def run_loop() -> None:
    settings = Settings()
    engine = get_engine(settings.database_url)

    while True:
        try:
            result = refresh_user_profiles(engine, lambda_decay=settings.lambda_decay)
            print(f"[user_learning_engine] {result}")
        except Exception as exc:
            now = datetime.now(timezone.utc).isoformat()
            print(f"[user_learning_engine] error at {now}: {exc}")
        time.sleep(settings.interval_seconds)


if __name__ == "__main__":
    run_loop()
