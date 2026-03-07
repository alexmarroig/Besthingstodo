from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    user_id: str
    city: str = "Sao Paulo"
    context: dict = Field(default_factory=dict)
    limit: int = 10


class RecommendationItem(BaseModel):
    experience_id: str
    title: str
    category: str
    score: float
    why: str


class RecommendationResponse(BaseModel):
    items: list[RecommendationItem]
