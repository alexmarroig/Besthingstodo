from uuid import uuid5, NAMESPACE_URL

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from .connectors.eventbrite import fetch_eventbrite
from .connectors.fever import fetch_fever
from .connectors.sympla import fetch_sympla
from .db import engine, get_db
from .models import Base, Experience
from .normalize import classify_category, cultural_profile, normalize_city, parse_datetime
from .schemas import CrawlResult

app = FastAPI(title="Discovery Engine", version="1.0.0")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "service": "discovery-engine"}


@app.post("/crawl/run", response_model=CrawlResult)
def run_crawl(db: Session = Depends(get_db)):
    sources = fetch_sympla() + fetch_eventbrite() + fetch_fever()
    ingested = 0
    updated = 0

    for item in sources:
        canonical_id = str(uuid5(NAMESPACE_URL, f"{item.source}:{item.external_id}"))
        row = db.get(Experience, canonical_id)
        metadata_json = {
            "external_id": item.external_id,
            "raw_category": item.category,
            "cultural_profile": cultural_profile(item.tags),
        }
        if row is None:
            db.add(
                Experience(
                    id=canonical_id,
                    title=item.title,
                    description=item.description,
                    category=classify_category(item.title, item.description, item.category),
                    tags=item.tags,
                    city=normalize_city(item.city),
                    neighborhood=item.neighborhood,
                    start_at=parse_datetime(item.start_at),
                    price_min=item.price_min,
                    price_max=item.price_max,
                    source=item.source,
                    metadata_json=metadata_json,
                )
            )
            ingested += 1
        else:
            row.title = item.title
            row.description = item.description
            row.tags = item.tags
            row.metadata_json = metadata_json
            updated += 1

    db.commit()
    return CrawlResult(ingested=ingested, updated=updated)
