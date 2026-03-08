import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..couple_defaults import default_couple_profile
from ..db import get_db
from ..deps import get_current_user
from ..models import CoupleProfile, OnboardingQuestion, User, UserPreference
from ..schemas import CoupleBootstrapIn, CoupleStepPatchIn, OnboardingStartIn

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
DEFAULT_QUESTIONS = [
    {"key": "preferred_experiences", "question": "Which experiences do you prefer?", "category": "preferred_experiences", "weight": 1.0},
    {"key": "favorite_movie_genres", "question": "What type of movies do you enjoy?", "category": "favorite_movie_genres", "weight": 1.0},
    {"key": "preferred_restaurants", "question": "What restaurant styles do you prefer?", "category": "preferred_restaurants", "weight": 1.0},
    {"key": "budget_range", "question": "What is your budget range?", "category": "budget_range", "weight": 1.0},
    {"key": "distance_willing", "question": "How far are you willing to travel for an event?", "category": "distance_willing", "weight": 1.0},
    {"key": "quiet_social", "question": "Do you prefer quiet or lively places?", "category": "quiet_social", "weight": 1.0},
    {"key": "indoor_outdoor", "question": "Do you prefer indoor or outdoor activities?", "category": "indoor_outdoor", "weight": 1.0},
    {"key": "romantic_group", "question": "Do you prefer romantic or group experiences?", "category": "romantic_group", "weight": 1.0},
]


def _deep_merge(base: dict, patch: dict) -> dict:
    merged = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


@router.post("/start")
def onboarding_start(
    payload: OnboardingStartIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    questions = db.execute(select(OnboardingQuestion).order_by(OnboardingQuestion.id.asc())).scalars().all()

    if payload.answers:
        for ans in payload.answers:
            db.add(
                UserPreference(
                    user_id=user.id,
                    category=ans.category,
                    value=ans.value,
                    weight=ans.weight,
                )
            )
        db.commit()
        try:
            with httpx.Client(timeout=20) as client:
                client.post(f"{settings.user_profile_engine_url}/profiles/generate", json={"user_id": user.id})
        except Exception:
            pass

    output_questions = [
        {
            "key": q.question_key,
            "question": q.question_text,
            "category": q.category,
            "weight": q.weight,
        }
        for q in questions
    ]
    if not output_questions:
        output_questions = DEFAULT_QUESTIONS

    return {"questions": output_questions, "saved_answers": len(payload.answers)}


@router.post("/couple/bootstrap")
def couple_bootstrap(
    payload: CoupleBootstrapIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.execute(select(CoupleProfile).where(CoupleProfile.user_id == user.id)).scalar_one_or_none()

    if existing is None:
        profile_json = default_couple_profile()
        existing = CoupleProfile(user_id=user.id, schema_version="v1", couple_profile_json=profile_json)
        db.add(existing)
    elif payload.use_defaults_if_empty and not existing.couple_profile_json:
        existing.couple_profile_json = default_couple_profile()

    db.commit()

    return {
        "status": "ok",
        "schema_version": existing.schema_version,
        "couple_profile_json": existing.couple_profile_json,
    }


@router.patch("/couple/step")
def patch_couple_step(
    payload: CoupleStepPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.execute(select(CoupleProfile).where(CoupleProfile.user_id == user.id)).scalar_one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Couple profile not found")

    base = existing.couple_profile_json or {}
    next_json = _deep_merge(base, {payload.step_key: payload.data})
    existing.couple_profile_json = next_json

    if payload.step_key == "location":
        user.city = str(payload.data.get("city", user.city))
        user.neighborhood = payload.data.get("neighborhood", user.neighborhood)
        if "country" in payload.data:
            user.country = str(payload.data["country"])

    db.commit()

    return {"status": "ok", "step_key": payload.step_key, "couple_profile_json": next_json}
