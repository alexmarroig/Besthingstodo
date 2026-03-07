from __future__ import annotations

from typing import Any

from scoring import (
    context_match,
    cosine_similarity,
    couple_compatibility,
    distance_score,
    final_score,
    novelty_score,
    penalty_score,
    popularity_score,
    price_compatibility,
    rating_score,
    tag_overlap,
)


def _distance_km(user_lat: float | None, user_lon: float | None, lat: float | None, lon: float | None) -> float | None:
    import numpy as np

    if user_lat is None or user_lon is None or lat is None or lon is None:
        return None
    r = 6371.0
    p1 = np.radians(user_lat)
    p2 = np.radians(lat)
    dp = np.radians(lat - user_lat)
    dl = np.radians(lon - user_lon)
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return float(r * c)


def _reason(item: dict, tag_m: float, sem: float, ctx: float, psych_profile: dict) -> str:
    tags = [str(t).lower() for t in (item.get("tags") or [])]
    title = str(item.get("title", "experience"))

    rel_dynamic = psych_profile.get("relationship_dynamic", {}) if isinstance(psych_profile, dict) else {}
    shared_interests = [x.lower() for x in rel_dynamic.get("shared_interests", [])]

    if any(k in tags for k in ["psychology", "symbolism", "philosophy"]) or any(k in title.lower() for k in ["psychology", "symbol", "philosophy"]):
        return "recommended because it aligns with your interest in psychology and symbolic depth"
    if any(k in shared_interests for k in ["psychology", "symbolism", "philosophy"]) and tag_m > 0.25:
        return "recommended because it matches your shared intellectual interests as a couple"
    if any(k in tags for k in ["quiet", "romantic", "museum", "exhibition"]):
        return "recommended because it fits your preference for quiet, meaningful and romantic environments"
    if sem > 0.4:
        return "recommended because it is similar to experiences you liked before"
    if ctx > 0.6:
        return "recommended because it fits your current context (time, weather and location)"
    return "recommended because it matches your couple profile and current moment"


def rank_candidates(candidates: list[dict[str, Any]], state: dict[str, Any]) -> list[dict[str, Any]]:
    user_embedding = state.get("user_embedding")
    user_tag_weights = state.get("user_tag_weights", {})
    profile = state.get("profile", {})
    psych_profile = state.get("psychological_profile", {})
    context = state.get("context", {})
    user_lat = state.get("user_lat")
    user_lon = state.get("user_lon")
    budget = state.get("budget_range", "medium")
    max_distance_km = float(state.get("distance_limit_km", 20.0))
    seen_ids = set(state.get("seen_experience_ids", []))
    interaction_stats = state.get("interaction_stats", {})
    allergy_avoid = {x.lower() for x in state.get("allergy_avoid", [])}

    ranked = []
    for item in candidates:
        exp_id = item["id"]
        tags_low = [t.lower() for t in (item.get("tags") or [])]

        if item.get("category", "").lower() == "restaurant" and allergy_avoid.intersection(tags_low):
            continue

        dist_km = _distance_km(user_lat, user_lon, item.get("latitude"), item.get("longitude"))

        sem = cosine_similarity(user_embedding, item.get("embedding"))
        tag_m = tag_overlap(user_tag_weights, item.get("tags") or [])
        ctx_m = context_match(item, context)
        pop = popularity_score(interaction_stats.get(exp_id, {}))
        nov = novelty_score(seen_ids, exp_id)
        couple = couple_compatibility(item.get("tags") or [], profile)

        # extra features computed for auditing/extension
        dist_s = distance_score(dist_km, max_distance_km)
        price_s = price_compatibility(item.get("price"), budget)
        rating_s = rating_score(interaction_stats.get(exp_id, {}))

        # blend additional features into context signal
        ctx_m = min(1.0, (ctx_m * 0.55 + dist_s * 0.25 + price_s * 0.1 + rating_s * 0.1))

        # psychological alignment bonus
        psych_bonus = 0.0
        if isinstance(psych_profile, dict):
            exp_pref = psych_profile.get("experience_preferences", {})
            if exp_pref.get("quiet_places") and any(t in tags_low for t in ["quiet", "museum", "exhibition", "cultural"]):
                psych_bonus += 0.06
            if exp_pref.get("romantic_environments") and any(t in tags_low for t in ["romantic", "restaurant", "cafe"]):
                psych_bonus += 0.05
            if exp_pref.get("cultural_depth") and any(t in tags_low for t in ["museum", "philosophy", "symbolism", "art"]):
                psych_bonus += 0.05
        ctx_m = min(1.0, ctx_m + psych_bonus)

        penalty = penalty_score(item, dist_km, max_distance_km)

        score = final_score(
            semantic_similarity=sem,
            tag_match=tag_m,
            context_match_score=ctx_m,
            popularity=pop,
            novelty=nov,
            couple_compat=couple,
            penalty=penalty,
        )

        ranked.append(
            {
                **item,
                "score": round(score, 4),
                "reason": _reason(item, tag_m, sem, ctx_m, psych_profile),
                "features": {
                    "semantic_similarity": round(sem, 4),
                    "tag_match": round(tag_m, 4),
                    "context_match": round(ctx_m, 4),
                    "popularity": round(pop, 4),
                    "novelty": round(nov, 4),
                    "couple_compatibility": round(couple, 4),
                    "distance_score": round(dist_s, 4),
                    "price_compatibility": round(price_s, 4),
                    "rating": round(rating_s, 4),
                    "penalty": round(penalty, 4),
                },
            }
        )

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked
