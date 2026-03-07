from datetime import datetime

from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import engine, get_db
from .models import Base, UserPreferenceWeight
from .schemas import FeedbackIn, PreferenceWeight, UserIdentitySnapshot

app = FastAPI(title="User Profile Engine", version="1.0.0")


TOPIC_MAP = {
    "like": [("entertainment", "positive_affinity", 0.08)],
    "dislike": [("entertainment", "negative_affinity", -0.1)],
    "save": [("discovery", "intent_to_try", 0.05)],
}


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "service": "user-profile-engine"}


@app.post("/feedback")
def process_feedback(payload: FeedbackIn, db: Session = Depends(get_db)):
    updates = TOPIC_MAP.get(payload.signal, [("general", "engagement", 0.01)])
    for domain, topic_key, delta in updates:
        stmt = select(UserPreferenceWeight).where(
            UserPreferenceWeight.user_id == payload.user_id,
            UserPreferenceWeight.domain == domain,
            UserPreferenceWeight.topic_key == topic_key,
        )
        row = db.execute(stmt).scalar_one_or_none()
        if row is None:
            row = UserPreferenceWeight(
                user_id=payload.user_id,
                domain=domain,
                topic_key=topic_key,
                weight=max(0.0, min(1.0, 0.5 + delta)),
                confidence=0.6,
            )
            db.add(row)
        else:
            row.weight = max(0.0, min(1.0, row.weight + delta))
            row.confidence = min(1.0, row.confidence + 0.02)
            row.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "updated"}


@app.get("/profiles/{user_id}", response_model=UserIdentitySnapshot)
def get_snapshot(user_id: str, db: Session = Depends(get_db)):
    stmt = select(UserPreferenceWeight).where(UserPreferenceWeight.user_id == user_id)
    rows = db.execute(stmt).scalars().all()
    weights = [
        PreferenceWeight(
            domain=x.domain,
            topic_key=x.topic_key,
            weight=x.weight,
            confidence=x.confidence,
            updated_at=x.updated_at,
        )
        for x in rows
    ]
    return UserIdentitySnapshot(user_id=user_id, generated_at=datetime.utcnow(), weights=weights, restrictions=[])
