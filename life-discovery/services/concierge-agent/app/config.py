from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    recommendation_engine_url: str = "http://recommendation-engine:8002"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
