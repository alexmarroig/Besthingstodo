from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import engine, get_db
from .dna import generate_dna
from .models import Base, UserCulturalDNA, UserPsychAnswer
from .questions import get_questions
from .schemas import SubmitAnswersIn

app = FastAPI(title="Onboarding Engine", version="1.0.0")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "service": "onboarding-engine"}


@app.get("/onboarding/questions")
def questions():
    return {"questions": get_questions()}


@app.post("/onboarding/submit")
def submit(payload: SubmitAnswersIn, db: Session = Depends(get_db)):
    for a in payload.answers:
        db.add(
            UserPsychAnswer(
                user_id=payload.user_id,
                question_id=a.question_id,
                answer=a.answer,
                weight=a.weight,
            )
        )
    db.commit()

    rows = db.execute(select(UserPsychAnswer).where(UserPsychAnswer.user_id == payload.user_id)).scalars().all()
    dna = generate_dna(
        [
            {
                "question_id": r.question_id,
                "answer": r.answer,
                "weight": r.weight,
            }
            for r in rows
        ]
    )

    existing = db.get(UserCulturalDNA, payload.user_id)
    if existing is None:
        db.add(UserCulturalDNA(user_id=payload.user_id, **dna))
    else:
        for k, v in dna.items():
            setattr(existing, k, v)
    db.commit()

    return {"status": "ok", "user_id": payload.user_id, "cultural_dna": {k: v for k, v in dna.items() if k != "updated_at"}}


@app.get("/onboarding/dna/{user_id}")
def get_dna(user_id: str, db: Session = Depends(get_db)):
    row = db.get(UserCulturalDNA, user_id)
    if row is None:
        return {"user_id": user_id, "cultural_dna": None}
    return {
        "user_id": user_id,
        "cultural_dna": {
            "intellectual_depth": row.intellectual_depth,
            "symbolic_interest": row.symbolic_interest,
            "psychological_curiosity": row.psychological_curiosity,
            "quiet_environment_preference": row.quiet_environment_preference,
            "romantic_experience_preference": row.romantic_experience_preference,
            "crowd_tolerance": row.crowd_tolerance,
            "museum_interest": row.museum_interest,
            "cinema_interest": row.cinema_interest,
            "exhibition_interest": row.exhibition_interest,
            "restaurant_style_score": row.restaurant_style_score,
            "travel_style_score": row.travel_style_score,
        },
    }
