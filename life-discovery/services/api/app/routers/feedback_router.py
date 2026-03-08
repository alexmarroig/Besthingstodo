import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..life_graph import learn_from_feedback
from ..models import Experience, Interaction, User, UserPreference
from ..schemas import FeedbackDetailedIn

router = APIRouter(tags=["feedback"])

ALLOWED_DECISIONS = {"accepted", "rejected", "saved", "done", "like", "dislike", "skip"}


def _decision_delta(decision: str, rating: int | None) -> float:
    base = {
        "accepted": 0.25,
        "done": 0.35,
        "saved": 0.1,
        "like": 0.2,
        "rejected": -0.25,
        "dislike": -0.2,
        "skip": -0.05,
    }.get(decision, 0.0)

    if rating is None:
        return base
    return base + ((rating - 3) * 0.06)


@router.post("/feedback")
async def feedback(
    payload: FeedbackDetailedIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.user_id != user.id:
        raise HTTPException(status_code=403, detail="user_id does not match token")

    decision = (payload.decision or payload.feedback_type or "skip").strip().lower()
    if decision not in ALLOWED_DECISIONS:
        raise HTTPException(status_code=400, detail="Invalid decision")

    exp = db.get(Experience, payload.experience_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")

    feedback_type = (payload.feedback_type or decision).lower()

    db.add(
        Interaction(
            user_id=user.id,
            experience_id=payload.experience_id,
            feedback_type=feedback_type,
            decision=decision,
            post_experience_rating=payload.post_experience_rating,
            reason_tags=[r.lower() for r in payload.reason_tags],
            context_json=payload.context,
        )
    )

    delta = _decision_delta(decision, payload.post_experience_rating)
    for tag in exp.tags or []:
        t = str(tag).lower().strip()
        if not t:
            continue

        row = db.execute(
            select(UserPreference).where(
                UserPreference.user_id == user.id,
                UserPreference.category == "tags",
                UserPreference.value == t,
            )
        ).scalar_one_or_none()

        if row is None:
            db.add(UserPreference(user_id=user.id, category="tags", value=t, weight=max(0.05, 1.0 + delta)))
        else:
            row.weight = max(0.05, row.weight + delta)

    domain_value = exp.domain or "events_exhibitions"
    domain_pref = db.execute(
        select(UserPreference).where(
            UserPreference.user_id == user.id,
            UserPreference.category == "domain",
            UserPreference.value == domain_value,
        )
    ).scalar_one_or_none()
    if domain_pref is None:
        db.add(UserPreference(user_id=user.id, category="domain", value=domain_value, weight=max(0.05, 1.0 + delta)))
    else:
        domain_pref.weight = max(0.05, domain_pref.weight + delta)

    for reason in payload.reason_tags:
        rv = reason.lower().strip()
        if not rv:
            continue
        reason_pref = db.execute(
            select(UserPreference).where(
                UserPreference.user_id == user.id,
                UserPreference.category == "feedback_reason",
                UserPreference.value == rv,
            )
        ).scalar_one_or_none()

        reason_delta = -0.2 if decision in {"rejected", "dislike"} else 0.08
        if reason_pref is None:
            db.add(UserPreference(user_id=user.id, category="feedback_reason", value=rv, weight=max(0.05, 1.0 + reason_delta)))
        else:
            reason_pref.weight = max(0.05, reason_pref.weight + reason_delta)

    learn_from_feedback(
        db=db,
        user_id=user.id,
        exp=exp,
        decision=decision,
        reason_tags=[r.lower() for r in payload.reason_tags],
        delta=abs(delta),
    )

    db.commit()

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            await client.post(f"{settings.user_profile_engine_url}/profiles/generate", json={"user_id": user.id})
        except Exception:
            pass

    return {"status": "ok"}
