import json
import time
import uuid
from datetime import datetime

from pydantic_settings import BaseSettings, SettingsConfigDict
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text

from services.discovery_engine.service import fetch_all_events


class Settings(BaseSettings):
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"
    interval_seconds: int = 21600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def embed(event: dict) -> list[float]:
    text_blob = f"{event.get('title','')}. {event.get('description','')}. {' '.join(event.get('tags', []))}"
    return model.encode([text_blob], normalize_embeddings=True)[0].tolist()


def upsert_events(events: list[dict]) -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        for ev in events:
            key = f"{ev.get('source','')}|{ev.get('title','')}|{ev.get('url','')}"
            event_id = str(uuid.uuid5(uuid.NAMESPACE_URL, key))
            vec = embed(ev)
            conn.execute(
                text(
                    """
                    INSERT INTO experiences (id, title, description, category, city, location, latitude, longitude, start_time, price, tags, source, url, embedding, created_at)
                    VALUES (
                      :id, :title, :description, :category, :city, :location, :latitude, :longitude, :start_time, :price,
                      CAST(:tags AS jsonb), :source, :url, :embedding, :created_at
                    )
                    ON CONFLICT (id) DO UPDATE SET
                      title = EXCLUDED.title,
                      description = EXCLUDED.description,
                      category = EXCLUDED.category,
                      city = EXCLUDED.city,
                      location = EXCLUDED.location,
                      latitude = EXCLUDED.latitude,
                      longitude = EXCLUDED.longitude,
                      start_time = EXCLUDED.start_time,
                      price = EXCLUDED.price,
                      tags = EXCLUDED.tags,
                      source = EXCLUDED.source,
                      url = EXCLUDED.url,
                      embedding = EXCLUDED.embedding
                    """
                ),
                {
                    "id": event_id,
                    "title": ev.get("title", "Untitled"),
                    "description": ev.get("description", ""),
                    "category": ev.get("category", "event"),
                    "city": ev.get("city", "Sao Paulo"),
                    "location": ev.get("venue", ev.get("location", "")),
                    "latitude": ev.get("latitude"),
                    "longitude": ev.get("longitude"),
                    "start_time": ev.get("start_time"),
                    "price": ev.get("price"),
                    "tags": json.dumps(ev.get("tags", [])),
                    "source": ev.get("source", "crawler"),
                    "url": ev.get("url", ""),
                    "embedding": vec,
                    "created_at": datetime.utcnow(),
                },
            )


def run_once():
    events = fetch_all_events()
    if events:
        upsert_events(events)
    print(f"[crawler] upserted={len(events)}")


def main() -> None:
    while True:
        try:
            run_once()
        except Exception as exc:
            print(f"[crawler] error: {exc}")
        time.sleep(settings.interval_seconds)


if __name__ == "__main__":
    main()
