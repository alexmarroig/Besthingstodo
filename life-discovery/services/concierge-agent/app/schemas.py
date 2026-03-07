from pydantic import BaseModel, Field


class ConciergeRequest(BaseModel):
    user_id: str
    message: str
    city: str = "Sao Paulo"


class ConciergeSuggestion(BaseModel):
    type: str
    title: str
    why: str


class ConciergeResponse(BaseModel):
    response_text: str
    suggestions: list[ConciergeSuggestion] = Field(default_factory=list)
