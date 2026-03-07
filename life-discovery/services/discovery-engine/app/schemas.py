from pydantic import BaseModel


class DiscoveryItem(BaseModel):
    external_id: str
    title: str
    description: str
    category: str
    tags: list[str]
    city: str
    neighborhood: str | None = None
    start_at: str | None = None
    price_min: float | None = None
    price_max: float | None = None
    source: str


class CrawlResult(BaseModel):
    ingested: int
    updated: int
