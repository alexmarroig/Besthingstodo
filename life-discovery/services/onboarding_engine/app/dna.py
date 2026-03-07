from __future__ import annotations

from datetime import datetime

from .questions import QUESTIONS


def _answer_score(value: str) -> float:
    text = (value or "").lower()
    positive = ["quiet", "intimate", "intellectual", "reflection", "museum", "exhibition", "romantic", "nature", "mystery", "thriller"]
    negative = ["crowded", "nightlife", "loud", "bar", "club", "vulgar"]
    score = 0.5
    if any(x in text for x in positive):
        score += 0.25
    if any(x in text for x in negative):
        score -= 0.25
    return max(0.0, min(1.0, score))


def generate_dna(answer_rows: list[dict]) -> dict:
    acc = {
        "intellectual_depth": 0.5,
        "symbolic_interest": 0.5,
        "psychological_curiosity": 0.5,
        "quiet_environment_preference": 0.5,
        "romantic_experience_preference": 0.5,
        "crowd_tolerance": 0.5,
        "museum_interest": 0.5,
        "cinema_interest": 0.5,
        "exhibition_interest": 0.5,
        "restaurant_style_score": 0.5,
        "travel_style_score": 0.5,
    }
    wsum = {k: 1.0 for k in acc.keys()}

    for row in answer_rows:
        qid = row["question_id"]
        a = row["answer"]
        w = float(row.get("weight", 1.0))
        s = _answer_score(a)

        if qid in {4, 7, 8, 10, 12}:
            acc["intellectual_depth"] += s * w
            wsum["intellectual_depth"] += w
        if qid in {8, 9, 10, 25}:
            acc["symbolic_interest"] += s * w
            wsum["symbolic_interest"] += w
        if qid in {10, 11, 13}:
            acc["psychological_curiosity"] += s * w
            wsum["psychological_curiosity"] += w
        if qid in {1, 2, 3, 17}:
            acc["quiet_environment_preference"] += s * w
            wsum["quiet_environment_preference"] += w
            acc["crowd_tolerance"] += (1.0 - s) * w
            wsum["crowd_tolerance"] += w
        if qid in {22, 16, 17}:
            acc["romantic_experience_preference"] += s * w
            wsum["romantic_experience_preference"] += w
            acc["restaurant_style_score"] += s * w
            wsum["restaurant_style_score"] += w
        if qid in {6, 8, 9}:
            acc["museum_interest"] += s * w
            wsum["museum_interest"] += w
        if qid in {11, 12, 13, 15}:
            acc["cinema_interest"] += s * w
            wsum["cinema_interest"] += w
        if qid in {6, 8, 9, 25}:
            acc["exhibition_interest"] += s * w
            wsum["exhibition_interest"] += w
        if qid in {21, 23, 24, 25}:
            acc["travel_style_score"] += s * w
            wsum["travel_style_score"] += w

    out = {}
    for k in acc:
        out[k] = round(max(0.0, min(1.0, acc[k] / wsum[k])), 4)
    out["updated_at"] = datetime.utcnow()
    return out
