from datetime import datetime, timezone

import httpx
from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Experience
from .schemas import RecommendationItem, RecommendationRequest, RecommendationResponse
from .scoring import context_score, token_overlap_score

app = FastAPI(title="Recommendation Engine", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "recommendation-engine"}


@app.post("/recommendations", response_model=RecommendationResponse)
async def recommend(payload: RecommendationRequest, db: Session = Depends(get_db)):
    async with httpx.AsyncClient(timeout=15) as client:
        profile_resp = await client.get(f"{settings.user_profile_engine_url}/profiles/{payload.user_id}")
    profile = profile_resp.json() if profile_resp.status_code < 400 else {"weights": []}

    user_tokens = {x["topic_key"].replace("_", " ") for x in profile.get("weights", [])}

    stmt = select(Experience).where(Experience.city == payload.city).limit(500)
    rows = db.execute(stmt).scalars().all()

    now = datetime.now(timezone.utc)
    scored = []
    for item in rows:
        item_tokens = set(item.title.lower().split())
        if isinstance(item.tags, list):
            item_tokens.update(str(t).lower() for t in item.tags)
        sem = token_overlap_score(user_tokens, item_tokens)
        ctx = context_score(payload.context, item.category)
        time_rel = 0.05
        if item.start_at is not None and item.start_at.replace(tzinfo=timezone.utc) >= now:
            time_rel = 0.12
        score = round(0.65 * sem + 0.2 * ctx + 0.15 * time_rel, 4)
        if item.category in {"bar", "club", "nightlife"}:
            score -= 0.4
        scored.append(
            RecommendationItem(
                experience_id=item.id,
                title=item.title,
                category=item.category,
                score=score,
                why="Matched with your cultural and calm-profile signals",
            )
        )

    scored.sort(key=lambda x: x.score, reverse=True)
    return RecommendationResponse(items=scored[: payload.limit])
