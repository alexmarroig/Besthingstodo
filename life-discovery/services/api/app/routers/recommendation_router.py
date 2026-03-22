import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..life_graph import find_related_experiences
from ..models import CoupleProfile, Experience, UserPreference

# Epsilon-greedy exploration: probability of showing a "discovery" item
# (new event with < 48h of age) regardless of its score.
_EXPLORATION_EPSILON = 0.10  # 10% of slots reserved for new/unseen items
_EXPLORATION_MAX_AGE_HOURS = 72  # events younger than this are "new"

DOMAIN_CATEGORIES = {
    "dining_out": {"restaurant", "cafe"},
    "delivery": {"delivery", "food_delivery"},
    "movies_series": {"movie", "series", "cinema"},
    "events_exhibitions": {"event", "exhibition", "museum"},
}


def _norm_tokens(values: list[str] | None) -> set[str]:
    return {str(v).strip().lower() for v in (values or []) if str(v).strip()}


def _get_domain(exp: Experience) -> str:
    if exp.domain:
        return exp.domain
    cat = (exp.category or "").strip().lower()
    for domain, categories in DOMAIN_CATEGORIES.items():
        if cat in categories:
            return domain
    return "events_exhibitions"


def _safe_list(data: dict, path: list[str]) -> list[str]:
    node = data
    for key in path:
        if not isinstance(node, dict):
            return []
        node = node.get(key)
    if not isinstance(node, list):
        return []
    return [str(x).lower() for x in node]


def recommend_for_user(user_id: str, city: str, limit: int, db: Session, domain: str | None = None, context: dict | None = None):
    context = context or {}

    prefs = db.execute(select(UserPreference).where(UserPreference.user_id == user_id)).scalars().all()
    weights = {}
    for p in prefs:
        key = str(p.value).lower()
        weights[key] = weights.get(key, 0.0) + p.weight

    couple_profile = db.execute(select(CoupleProfile).where(CoupleProfile.user_id == user_id)).scalar_one_or_none()
    profile_json = couple_profile.couple_profile_json if couple_profile else {}

    lifestyle = profile_json.get("lifestyle", {}) if isinstance(profile_json, dict) else {}
    location = profile_json.get("location", {}) if isinstance(profile_json, dict) else {}

    avoid_crowded = bool(lifestyle.get("avoid_crowded_places", True))
    avoid_bar = bool(lifestyle.get("avoid_bar", True))
    avoid_nightclub = bool(lifestyle.get("avoid_nightclub", True))
    avoid_rain = bool(location.get("avoid_going_out_when_rain", True))

    allergies = _norm_tokens(_safe_list(profile_json, ["health", "allergies", "camila"]))
    style_prefs = _norm_tokens(lifestyle.get("preferences", []))

    rows = db.execute(select(Experience).where(Experience.city == city)).scalars().all()
    graph_boost_map = find_related_experiences(db, user_id, rows)

    ranked = []

    weather = str(context.get("weather", "")).lower()
    daypart = str(context.get("daypart", "")).lower()
    hour = int(context.get("hour", datetime.utcnow().hour))

    for exp in rows:
        exp_domain = _get_domain(exp)
        exp_tags = [str(t).lower() for t in (exp.tags or [])]
        tag_set = set(exp_tags)

        if domain and exp_domain != domain:
            continue

        total = sum(weights.values()) or 1.0
        tag_score = sum(weights.get(t, 0.0) for t in tag_set) / total

        score = 0.55 * tag_score

        if exp_domain == (domain or exp_domain):
            score += 0.15

        if daypart == "evening" and exp_domain in {"dining_out", "movies_series", "events_exhibitions"}:
            score += 0.05

        if 10 <= hour <= 14 and exp_domain in {"dining_out", "delivery"}:
            score += 0.03

        if "romantic" in style_prefs and "romantic" in tag_set:
            score += 0.08
        if "small" in style_prefs and ("small" in tag_set or "cozy" in tag_set):
            score += 0.06
        if "instagrammable" in style_prefs and "instagrammable" in tag_set:
            score += 0.04

        if avoid_crowded and ({"crowded", "loud", "busy"}.intersection(tag_set) or (exp.category or "").lower() in {"club", "nightlife"}):
            score -= 0.45

        if (avoid_bar and (exp.category or "").lower() == "bar") or (avoid_nightclub and (exp.category or "").lower() in {"club", "nightlife"}):
            score -= 0.6

        if allergies and allergies.intersection(tag_set):
            score -= 0.9

        if weather == "rain" and avoid_rain:
            if exp_domain in {"dining_out", "events_exhibitions"}:
                score -= 0.2
            if exp_domain in {"delivery", "movies_series"}:
                score += 0.2

        if exp_domain == "delivery":
            score += 0.05

        # Life Graph boost from connected interests.
        graph_boost = float(graph_boost_map.get(exp.id, 0.0))
        if graph_boost > 0:
            score += min(0.45, graph_boost * 0.08)

        reason = "Matches your couple preferences"
        if graph_boost > 0:
            reason = "Boosted by Life Graph connected interests"
        if allergies and allergies.intersection(tag_set):
            reason = "Penalized due to allergy risk"
        elif avoid_crowded and {"crowded", "loud", "busy"}.intersection(tag_set):
            reason = "Penalized for crowded/noisy environment"
        elif weather == "rain" and exp_domain in {"delivery", "movies_series"}:
            reason = "Boosted because it fits rainy weather"

        ranked.append((round(score, 4), reason, exp_domain, exp))

    ranked.sort(key=lambda x: x[0], reverse=True)

    # --- Epsilon-greedy exploration ---
    # Reserve ~10% of slots for "new" events (< 72h old) that might have low
    # scores simply because no one has interacted with them yet.  This prevents
    # the feed from becoming a perpetual loop of the same popular items.
    exploration_slots = max(1, int(limit * _EXPLORATION_EPSILON))
    main_slots = limit - exploration_slots

    now_utc = datetime.now(timezone.utc)
    main_results = []
    exploration_candidates = []

    for item in ranked:
        score, reason, exp_domain, exp = item
        exp_age_hours = (
            (now_utc - exp.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
            if getattr(exp, "created_at", None) else 9999
        )
        if exp_age_hours <= _EXPLORATION_MAX_AGE_HOURS:
            exploration_candidates.append(item)
        else:
            main_results.append(item)

    # Shuffle exploration candidates so discovery isn't always the same new item
    random.shuffle(exploration_candidates)
    final = main_results[:main_slots] + exploration_candidates[:exploration_slots]

    # Re-sort the merged list so UI still shows roughly best-first within each group
    final.sort(key=lambda x: x[0], reverse=True)
    return final[:limit]
