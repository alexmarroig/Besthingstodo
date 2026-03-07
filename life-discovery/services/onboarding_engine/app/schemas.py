from pydantic import BaseModel, Field


class QuestionOut(BaseModel):
    id: int
    question: str
    category: str


class AnswerIn(BaseModel):
    question_id: int
    answer: str
    weight: float = 1.0


class SubmitAnswersIn(BaseModel):
    user_id: str
    answers: list[AnswerIn] = Field(default_factory=list)
