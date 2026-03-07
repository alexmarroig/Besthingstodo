import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import Feedback
from ..schemas import FeedbackIn, RecommendationRequest, RecommendationResponse

router = APIRouter(prefix="", tags=["recommendation"])


@router.post("/recommendations", response_model=RecommendationResponse)
async def recommendations(payload: RecommendationRequest):
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{settings.recommendation_engine_url}/recommendations",
            json=payload.model_dump(),
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Recommendation engine unavailable")
    return RecommendationResponse(**response.json())


@router.post("/feedback")
async def feedback(payload: FeedbackIn, db: Session = Depends(get_db)):
    item = Feedback(**payload.model_dump())
    db.add(item)
    db.commit()

    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(f"{settings.user_profile_engine_url}/feedback", json=payload.model_dump())

    return {"status": "ok"}
