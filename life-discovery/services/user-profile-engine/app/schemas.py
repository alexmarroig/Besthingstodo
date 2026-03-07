from datetime import datetime

from pydantic import BaseModel, Field


class FeedbackIn(BaseModel):
    user_id: str
    experience_id: str
    signal: str
    reason: str | None = None


class PreferenceWeight(BaseModel):
    domain: str
    topic_key: str
    weight: float
    confidence: float
    updated_at: datetime


class UserIdentitySnapshot(BaseModel):
    user_id: str
    generated_at: datetime
    weights: list[PreferenceWeight] = Field(default_factory=list)
    restrictions: list[str] = Field(default_factory=list)
