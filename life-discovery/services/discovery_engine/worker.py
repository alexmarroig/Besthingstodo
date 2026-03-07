import time
import uuid

import requests
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, text


class Settings(BaseSettings):
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)


def fetch_public_events() -> list[dict]:
    # Public API without key (TVMaze)
    resp = requests.get("https://api.tvmaze.com/search/shows?q=thriller", timeout=30)
    resp.raise_for_status()
    data = resp.json()
    events = []
    for row in data[:20]:
        show = row.get("show", {})
        tags = [g.lower() for g in (show.get("genres") or ["cultural"])]
        events.append(
            {
                "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"tvmaze:{show.get('id')}")),
                "title": show.get("name", "Untitled"),
                "description": (show.get("summary") or "").replace("<p>", "").replace("</p>", ""),
                "tags": tags,
                "category": "movie" if "thriller" in tags else "event",
                "city": "Sao Paulo",
                "price": None,
            }
        )
    return events


def upsert_experiences(events: list[dict]) -> None:
    with engine.begin() as conn:
        for ev in events:
            conn.execute(
                text(
                    """
                    INSERT INTO experiences (id, title, description, tags, category, city, price)
                    VALUES (:id, :title, :description, CAST(:tags AS jsonb), :category, :city, :price)
                    ON CONFLICT (id) DO UPDATE SET
                      title = EXCLUDED.title,
                      description = EXCLUDED.description,
                      tags = EXCLUDED.tags,
                      category = EXCLUDED.category,
                      city = EXCLUDED.city,
                      price = EXCLUDED.price
                    """
                ),
                {
                    "id": ev["id"],
                    "title": ev["title"],
                    "description": ev["description"],
                    "tags": str(ev["tags"]).replace("'", '"'),
                    "category": ev["category"],
                    "city": ev["city"],
                    "price": ev["price"],
                },
            )


def main() -> None:
    while True:
        try:
            events = fetch_public_events()
            upsert_experiences(events)
            print(f"[worker] synced {len(events)} experiences")
        except Exception as exc:
            print(f"[worker] error: {exc}")
        time.sleep(1800)


if __name__ == "__main__":
    main()
