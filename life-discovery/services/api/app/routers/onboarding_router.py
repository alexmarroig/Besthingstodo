import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import OnboardingQuestion, User, UserPreference
from ..schemas import OnboardingStartIn

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
