from pydantic import BaseModel


class ProfileGenerateIn(BaseModel):
    user_id: str
