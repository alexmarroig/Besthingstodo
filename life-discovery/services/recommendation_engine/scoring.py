from __future__ import annotations

from typing import Any

import numpy as np


def cosine_similarity(user_vec: list[float] | None, item_vec: list[float] | None) -> float:
    if not user_vec or not item_vec:
        return 0.0
    a = np.array(user_vec, dtype=np.float32)
    b = np.array(item_vec, dtype=np.float32)
    den = np.linalg.norm(a) * np.linalg.norm(b)
    if den == 0:
        return 0.0
    return float(np.dot(a, b) / den)


def tag_overlap(user_tag_weights: dict[str, float], item_tags: list[str]) -> float:
    if not user_tag_weights or not item_tags:
        return 0.0
    total = sum(user_tag_weights.values()) or 1.0
    return sum(user_tag_weights.get(t.lower(), 0.0) for t in item_tags) / total


def distance_score(distance_km: float | None, limit_km: float) -> float:
    if distance_km is None:
        return 0.7
    if limit_km <= 0:
        return 0.0
    return max(0.0, 1.0 - (distance_km / limit_km))


def price_compatibility(price: float | None, budget_range: str) -> float:
    if price is None:
        return 0.5
    br = (budget_range or "medium").lower()
    if br in {"low", "economy"}:
        return 1.0 if price <= 60 else 0.2
    if br in {"high", "premium"}:
        return 0.6 if price <= 60 else 1.0
    return 1.0 if 40 <= price <= 160 else 0.6


def popularity_score(interactions: dict[str, float]) -> float:
    likes = interactions.get("like", 0.0)
    saves = interactions.get("save", 0.0)
    views = interactions.get("view", 0.0)
    dislikes = interactions.get("dislike", 0.0)
    raw = (1.5 * likes + 1.0 * saves + 0.2 * views - 1.2 * dislikes)
    return float(max(0.0, min(1.0, raw / 20.0 + 0.5)))


def rating_score(interactions: dict[str, float]) -> float:
    likes = interactions.get("like", 0.0)
    dislikes = interactions.get("dislike", 0.0)
    total = likes + dislikes
    if total <= 0:
        return 0.5
    return likes / total


def novelty_score(seen_experience_ids: set[str], experience_id: str) -> float:
    return 0.1 if experience_id in seen_experience_ids else 1.0


def couple_compatibility(tags: list[str], profile: dict) -> float:
    style = profile.get("experience_style", {}) if isinstance(profile, dict) else {}
    target = str(style.get("romantic_vs_group", "romantic")).lower()
    tags_low = [t.lower() for t in (tags or [])]
    if target == "romantic":
        return 1.0 if any(t in tags_low for t in ["romantic", "quiet", "restaurant", "cafe"]) else 0.5
    return 1.0 if any(t in tags_low for t in ["group", "event", "show"]) else 0.5


def context_match(item: dict, context: dict) -> float:
    score = 0.5
    weather = str(context.get("weather", "unknown")).lower()
    daypart = str(context.get("daypart", "evening")).lower()
    tags = [t.lower() for t in (item.get("tags") or [])]
    cat = str(item.get("category", "")).lower()

    if weather in {"rain", "storm"} and cat in {"movie", "cinema", "exhibition"}:
        score += 0.25
    if daypart in {"night", "evening"} and cat in {"restaurant", "event", "movie"}:
        score += 0.2
    if "quiet" in tags and context.get("noise_tolerance", "quiet") == "quiet":
        score += 0.15

    return float(min(1.0, score))


def penalty_score(item: dict, distance_km: float | None, max_distance_km: float) -> float:
    tags = [t.lower() for t in (item.get("tags") or [])]
    penalty = 0.0

    noise_tags = {"loud", "nightclub", "bar", "party"}
    explicit_tags = {"adult", "explicit", "nudity", "vulgar"}

    if any(t in noise_tags for t in tags):
        penalty += 0.25
    if any(t in explicit_tags for t in tags):
        penalty += 0.35
    if distance_km is not None and distance_km > max_distance_km:
        penalty += min(0.4, (distance_km - max_distance_km) / max_distance_km)

    return penalty


def final_score(
    semantic_similarity: float,
    tag_match: float,
    context_match_score: float,
    popularity: float,
    novelty: float,
    couple_compat: float,
    penalty: float,
) -> float:
    score = (
        0.35 * semantic_similarity
        + 0.20 * tag_match
        + 0.15 * context_match_score
        + 0.10 * popularity
        + 0.10 * novelty
        + 0.10 * couple_compat
    )
    return float(max(0.0, min(1.0, score - penalty)))
