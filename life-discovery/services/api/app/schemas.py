from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    city: str = "Sao Paulo"
    country: str = "Brazil"


class CoupleMemberIn(BaseModel):
    full_name: str
    email: EmailStr | None = None
    birth_date: date | None = None
    drinks_alcohol: bool = False
    smokes: bool = False
    occupation: str | None = None
    interests: list[str] = Field(default_factory=list)
    dislikes: list[str] = Field(default_factory=list)


class RegisterCoupleIn(BaseModel):
    email: EmailStr
    password: str
    account_name: str = "Alex & Camila"
    city: str = "Sao Paulo"
    neighborhood: str = "Campo Belo"
    country: str = "Brazil"
    max_drive_minutes: int = 40
    search_radius_km: float = 10.0
    transport: str = "car"
    avoid_going_out_when_rain: bool = True
    weekend_wake_time: str = "10:00"
    members: list[CoupleMemberIn] = Field(default_factory=list)
    couple_profile_json: dict = Field(default_factory=dict)


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


class FeedbackDetailedIn(BaseModel):
    user_id: str
    experience_id: str
    feedback_type: str | None = None
    decision: str | None = None
    post_experience_rating: int | None = Field(default=None, ge=1, le=5)
    reason_tags: list[str] = Field(default_factory=list)
    context: dict = Field(default_factory=dict)


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
    domain: str = "events_exhibitions"
    city: str
    location: str
    start_time: datetime | None = None
    price: float | None = None
    tags: list[str] = Field(default_factory=list)
    source: str


class RecommendationOut(ExperienceOut):
    score: float
    reason: str | None = None


class CoupleMemberOut(BaseModel):
    id: str
    full_name: str
    email: str | None = None
    birth_date: date | None = None
    drinks_alcohol: bool
    smokes: bool
    occupation: str | None = None
    interests: list[str] = Field(default_factory=list)
    dislikes: list[str] = Field(default_factory=list)


class CoupleProfileOut(BaseModel):
    schema_version: str = "v1"
    couple_profile_json: dict = Field(default_factory=dict)


class CoupleMeOut(BaseModel):
    user_id: str
    email: str
    account_name: str
    city: str
    neighborhood: str | None = None
    country: str
    search_radius_km: float
    max_drive_minutes: int = 40
    transport: str = "car"
    avoid_going_out_when_rain: bool = True
    weekend_wake_time: str = "10:00"
    members: list[CoupleMemberOut] = Field(default_factory=list)
    profile: CoupleProfileOut


class CouplePatchIn(BaseModel):
    city: str | None = None
    neighborhood: str | None = None
    country: str | None = None
    search_radius_km: float | None = None
    max_drive_minutes: int | None = None
    transport: str | None = None
    avoid_going_out_when_rain: bool | None = None
    weekend_wake_time: str | None = None
    members: list[CoupleMemberIn] | None = None
    patch: dict = Field(default_factory=dict)

class CoupleBootstrapIn(BaseModel):
    use_defaults_if_empty: bool = True


class CoupleStepPatchIn(BaseModel):
    step_key: str
    data: dict = Field(default_factory=dict)

