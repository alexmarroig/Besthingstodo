import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings


class ConciergeIn(BaseModel):
    user_id: str
    message: str
    city: str = "Sao Paulo"


router = APIRouter(prefix="", tags=["concierge"])


@router.post("/concierge")
async def concierge(payload: ConciergeIn):
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{settings.ai_concierge_url}/concierge/chat",
            json={"user_id": payload.user_id, "message": payload.message},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Concierge unavailable")
    return response.json()
