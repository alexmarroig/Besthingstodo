from pydantic import BaseModel, Field


class ConciergeChatIn(BaseModel):
    user_id: str
    message: str


class Suggestion(BaseModel):
    title: str
    reason: str


class ConciergeChatOut(BaseModel):
    suggestions: list[Suggestion] = Field(default_factory=list)
