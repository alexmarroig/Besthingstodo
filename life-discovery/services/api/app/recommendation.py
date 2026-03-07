from collections import defaultdict

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from .embeddings import embed_text
from .models import Experience, Preference, User


def cosine(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def tag_similarity(user_weights: dict[str, float], tags: list[str]) -> float:
    t = [x.lower() for x in tags]
    if not t or not user_weights:
        return 0.0
    total = sum(user_weights.values()) or 1.0
    return sum(user_weights.get(x, 0.0) for x in t) / total


def get_user_weights(user_id: str, db: Session) -> dict[str, float]:
    rows = db.execute(select(Preference).where(Preference.user_id == user_id)).scalars().all()
    agg: dict[str, float] = defaultdict(float)
    for row in rows:
        agg[row.tag.lower()] += row.weight
    return agg


def get_user_embedding(user: User, weights: dict[str, float]) -> list[float]:
    if user.interest_embedding is not None:
        return user.interest_embedding
    keys = " ".join(weights.keys()) if weights else user.interests_text
    return embed_text(keys)


def rank(user: User, city: str, limit: int, db: Session):
    weights = get_user_weights(user.id, db)
    user_vec = get_user_embedding(user, weights)

    query = select(Experience)
    if city:
        query = query.where(Experience.city == city)
    rows = db.execute(query).scalars().all()

    scored = []
    for exp in rows:
        if exp.embedding is None:
            exp.embedding = embed_text(f"{exp.title}. {exp.description}. {' '.join(exp.tags or [])}")
        sem = cosine(user_vec, exp.embedding)
        tag = tag_similarity(weights, exp.tags or [])
        score = round(0.7 * sem + 0.3 * tag, 4)
        scored.append((score, exp))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:limit]
