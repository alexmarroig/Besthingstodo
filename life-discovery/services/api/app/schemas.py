from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    city: str = "Sao Paulo"
    country: str = "Brazil"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    city: str
    country: str


class OnboardingAnswer(BaseModel):
    category: str
    value: str
    weight: float = 1.0


class OnboardingStartIn(BaseModel):
    answers: list[OnboardingAnswer] = Field(default_factory=list)


class FeedbackIn(BaseModel):
    user_id: str
    experience_id: str
    feedback_type: str


class ContextOut(BaseModel):
    city: str
    temperature: float | None = None
    weather: str
    local_time: str
    day_of_week: str


class ExperienceOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    city: str
    location: str
    start_time: datetime | None = None
    price: float | None = None
    tags: list[str] = Field(default_factory=list)
    source: str


class RecommendationOut(ExperienceOut):
    score: float
