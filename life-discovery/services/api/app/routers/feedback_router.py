import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Experience, Interaction, User, UserPreference
from ..schemas import FeedbackIn

router = APIRouter(tags=["feedback"])

ALLOWED = {"like", "dislike", "save", "skip"}


@router.post("/feedback")
async def feedback(
    payload: FeedbackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.user_id != user.id:
        raise HTTPException(status_code=403, detail="user_id does not match token")

    if payload.feedback_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Invalid feedback_type")

    exp = db.get(Experience, payload.experience_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")

    db.add(
        Interaction(
            user_id=user.id,
            experience_id=payload.experience_id,
            feedback_type=payload.feedback_type,
        )
    )

    delta = 0.25 if payload.feedback_type == "like" else -0.2 if payload.feedback_type == "dislike" else 0.1
    for tag in exp.tags or []:
        row = db.execute(
            select(UserPreference).where(
                UserPreference.user_id == user.id,
                UserPreference.category == "tags",
                UserPreference.value == tag.lower(),
            )
        ).scalar_one_or_none()
        if row is None:
            db.add(UserPreference(user_id=user.id, category="tags", value=tag.lower(), weight=max(0.05, 1.0 + delta)))
        else:
            row.weight = max(0.05, row.weight + delta)

    db.commit()

    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(f"{settings.user_profile_engine_url}/profiles/generate", json={"user_id": user.id})

    return {"status": "ok"}
