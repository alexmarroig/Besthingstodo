from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Experience, UserPreference
from ..utils import cosine_similarity


def recommend_for_user(user_id: str, city: str, limit: int, db: Session):
    prefs = db.execute(select(UserPreference).where(UserPreference.user_id == user_id)).scalars().all()
    weights = {}
    for p in prefs:
        weights[p.value.lower()] = weights.get(p.value.lower(), 0.0) + p.weight

    rows = db.execute(select(Experience).where(Experience.city == city)).scalars().all()
    ranked = []
    for exp in rows:
        tag_score = 0.0
        if weights and exp.tags:
            total = sum(weights.values()) or 1.0
            tag_score = sum(weights.get(t.lower(), 0.0) for t in exp.tags) / total

        emb_score = 0.0
        if exp.embedding is not None:
            # No user vector in API layer; keep semantic component lightweight by self-signal.
            emb_score = cosine_similarity(exp.embedding, exp.embedding)

        score = round(0.8 * tag_score + 0.2 * emb_score, 4)
        ranked.append((score, exp))

    ranked.sort(key=lambda x: x[0], reverse=True)
    return ranked[:limit]
