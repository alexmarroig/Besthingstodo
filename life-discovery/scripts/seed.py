import json
import uuid

from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://life:life@localhost:5432/life_discovery"
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

EXPERIENCES = [
    {
        "title": "Mostra de Suspense Psicologico",
        "description": "Sessao de filmes de suspense com debate cultural.",
        "category": "movie",
        "city": "Sao Paulo",
        "location": "Vila Mariana",
        "start_time": None,
        "price": 35,
        "tags": ["thriller", "cinema", "cultural"],
        "source": "seed",
        "url": "",
    },
    {
        "title": "Exposicao de Arte Contemporanea",
        "description": "Experiencia contemplativa em museu com curadoria local.",
        "category": "exhibition",
        "city": "Sao Paulo",
        "location": "Pinheiros",
        "start_time": None,
        "price": 40,
        "tags": ["museum", "exhibition", "quiet"],
        "source": "seed",
        "url": "",
    },
    {
        "title": "Restaurante Intimista Campo Belo",
        "description": "Ambiente calmo para jantar de casal.",
        "category": "restaurant",
        "city": "Sao Paulo",
        "location": "Campo Belo",
        "start_time": None,
        "price": 120,
        "tags": ["restaurant", "quiet", "romantic"],
        "source": "seed",
        "url": "",
    },
]


def embed(item: dict) -> list[float]:
    text_blob = f"{item['title']}. {item['description']}. {' '.join(item['tags'])}"
    return model.encode([text_blob], normalize_embeddings=True)[0].tolist()


def main() -> None:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        for item in EXPERIENCES:
            exp_id = str(uuid.uuid4())
            conn.execute(
                text(
                    """
                    INSERT INTO experiences (id, title, description, category, city, location, start_time, price, tags, source, url, embedding)
                    VALUES (:id, :title, :description, :category, :city, :location, :start_time, :price, CAST(:tags AS jsonb), :source, :url, :embedding)
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                {
                    "id": exp_id,
                    "title": item["title"],
                    "description": item["description"],
                    "category": item["category"],
                    "city": item["city"],
                    "location": item["location"],
                    "start_time": item["start_time"],
                    "price": item["price"],
                    "tags": json.dumps(item["tags"]),
                    "source": item["source"],
                    "url": item["url"],
                    "embedding": embed(item),
                },
            )
    print("seed complete")


if __name__ == "__main__":
    main()
