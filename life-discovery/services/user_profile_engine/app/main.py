from collections import defaultdict
from datetime import datetime
from uuid import uuid4

from fastapi import Depends, FastAPI
from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from .db import get_db
from .embeddings import embed_profile
from .models import Interaction, UserPreference, UserProfile
from .schemas import ProfileGenerateIn

app = FastAPI(title="User Profile Engine", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


def build_profile(user_id: str, db: Session) -> dict:
    prefs = db.execute(select(UserPreference).where(UserPreference.user_id == user_id)).scalars().all()
    recent = (
        db.execute(
            select(Interaction)
            .where(Interaction.user_id == user_id)
            .order_by(desc(Interaction.created_at))
            .limit(30)
        )
        .scalars()
        .all()
    )

    grouped: dict[str, list[str]] = defaultdict(list)
    for p in prefs:
        grouped[p.category].append(p.value)

    profile = {
        "cultural_interests": grouped.get("preferred_experiences", []) + grouped.get("tags", []),
        "food_preferences": grouped.get("preferred_restaurants", []),
        "movie_preferences": grouped.get("favorite_movie_genres", []),
        "experience_style": {
            "quiet_vs_social": (grouped.get("quiet_social", ["quiet"])[0] if grouped.get("quiet_social") else "quiet"),
            "indoor_vs_outdoor": (grouped.get("indoor_outdoor", ["indoor"])[0] if grouped.get("indoor_outdoor") else "indoor"),
            "romantic_vs_group": (grouped.get("romantic_group", ["romantic"])[0] if grouped.get("romantic_group") else "romantic"),
        },
        "budget_range": (grouped.get("budget_range", ["medium"])[0] if grouped.get("budget_range") else "medium"),
        "distance_limit": (grouped.get("distance_willing", ["10km"])[0] if grouped.get("distance_willing") else "10km"),
        "noise_tolerance": (grouped.get("quiet_social", ["quiet"])[0] if grouped.get("quiet_social") else "quiet"),
        "recent_feedback": [x.feedback_type for x in recent],
    }
    return profile


@app.post("/profiles/generate")
def generate(payload: ProfileGenerateIn, db: Session = Depends(get_db)):
    profile_json = build_profile(payload.user_id, db)
    vec = embed_profile(profile_json)

    existing = db.execute(select(UserProfile).where(UserProfile.user_id == payload.user_id)).scalar_one_or_none()
    if existing is None:
        db.add(
            UserProfile(
                id=str(uuid4()),
                user_id=payload.user_id,
                profile_json=profile_json,
                embedding_vector=vec,
                updated_at=datetime.utcnow(),
            )
        )
    else:
        existing.profile_json = profile_json
        existing.embedding_vector = vec
        existing.updated_at = datetime.utcnow()

    db.commit()
    return {"status": "ok", "user_id": payload.user_id, "profile": profile_json}


@app.get("/profiles/{user_id}")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.execute(select(UserProfile).where(UserProfile.user_id == user_id)).scalar_one_or_none()
    if profile is None:
        return {"user_id": user_id, "profile_json": {}, "embedding_vector": None}
    return {
        "user_id": profile.user_id,
        "profile_json": profile.profile_json,
        "embedding_vector": profile.embedding_vector,
        "updated_at": profile.updated_at.isoformat(),
    }
