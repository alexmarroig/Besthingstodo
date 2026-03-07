from collections import defaultdict

import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    den = np.linalg.norm(va) * np.linalg.norm(vb)
    if den == 0:
        return 0.0
    return float(np.dot(va, vb) / den)


def tag_score(user_pref: dict[str, float], tags: list[str]) -> float:
    if not user_pref:
        return 0.0
    total = sum(user_pref.values()) or 1.0
    return sum(user_pref.get(t.lower(), 0.0) for t in tags) / total


def rank_experiences(user_pref: dict[str, float], user_vec: list[float], experiences: list[dict], limit: int = 10):
    ranked = []
    for exp in experiences:
        ev = exp.get("embedding")
        if not ev:
            continue
        score = 0.7 * cosine_similarity(user_vec, ev) + 0.3 * tag_score(user_pref, exp.get("tags", []))
        ranked.append((round(score, 4), exp))
    ranked.sort(key=lambda x: x[0], reverse=True)
    return ranked[:limit]
