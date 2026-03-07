from pydantic import BaseModel


class DateNightIn(BaseModel):
    user_id: str
    date: str
    location: str
    weather: str | None = None
    time: str | None = "evening"


class DateNightPlan(BaseModel):
    activity_1: dict
    activity_2: dict
    activity_3: dict
    reasoning: str
