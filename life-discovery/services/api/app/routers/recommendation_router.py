import random
from datetime import datetime, timezone
import re

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

NEGATIVE_KEYWORDS = {
    "conference",
    "conferência",
    "summit",
    "curso",
    "workshop",
    "imersão",
    "bootcamp",
    "certification",
    "training",
    "cadaver",
    "lab",
}

QUIET_POSITIVE = {"cozy", "quiet", "calm", "intimista", "romantic", "romântico", "café", "cafe", "livraria", "museum", "museu", "cinema"}
BAR_WORDS = {"bar", "wine", "vinho", "drinks", "beer", "cerveja", "cocktail"}
QUALITY_KEYWORDS = {
    "michelin",
    "art house",
    "cultural icon",
    "special occasion",
    "favorite",
    "film lovers",
    "museum",
    "theatre",
    "planetarium",
}


def _norm_tokens(values: list[str] | None) -> set[str]:
    return {str(v).strip().lower() for v in (values or []) if str(v).strip()}


def _normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", (value or "").lower())).strip()


def _tokenize_experience(exp: Experience) -> set[str]:
    joined = " ".join(
        [
            exp.title or "",
            exp.description or "",
            exp.category or "",
            exp.location or "",
            " ".join(str(t) for t in (exp.tags or [])),
        ]
    )
    return set(_normalize_text(joined).split())


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


def _safe_strings(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(x).strip().lower() for x in value if str(x).strip()]


def _extract_profile_signals(profile_json: dict) -> set[str]:
    if not isinstance(profile_json, dict):
        return set()

    dining = profile_json.get("dining", {}) if isinstance(profile_json.get("dining"), dict) else {}
    interests = profile_json.get("interests", {}) if isinstance(profile_json.get("interests"), dict) else {}
    culture = profile_json.get("culture", {}) if isinstance(profile_json.get("culture"), dict) else {}
    lifestyle = profile_json.get("lifestyle", {}) if isinstance(profile_json.get("lifestyle"), dict) else {}

    dining_out = dining.get("dining_out", []) if isinstance(dining.get("dining_out"), list) else []
    dining_names = [str(item.get("name", "")).strip().lower() for item in dining_out if isinstance(item, dict)]
    dining_dishes = [str(dish).strip().lower() for item in dining_out if isinstance(item, dict) for dish in (item.get("dishes") or [])]

    cinema = interests.get("cinema", {}) if isinstance(interests.get("cinema"), dict) else {}
    cinema_titles = _safe_strings(cinema.get("favorite_titles"))
    cinema_style = _safe_strings(cinema.get("favorite_style"))
    series = _safe_strings(interests.get("series"))
    topics = _safe_strings(interests.get("topics"))
    likes = _safe_strings(dining.get("likes"))
    delivery = _safe_strings(dining.get("delivery"))
    wishlist = _safe_strings(culture.get("wishlist"))
    liked_exhibitions = _safe_strings(culture.get("liked_exhibitions"))
    lifestyle_prefs = _safe_strings(lifestyle.get("preferences"))
    bookstore = str(dining.get("favorite_bookstore", "")).strip().lower()

    combined = set(
        dining_names
        + dining_dishes
        + cinema_titles
        + cinema_style
        + series
        + topics
        + likes
        + delivery
        + wishlist
        + liked_exhibitions
        + lifestyle_prefs
    )
    if bookstore:
        combined.add(bookstore)
    return combined


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
    max_drive_minutes = int(location.get("max_drive_minutes", 40) or 40)

    allergies = _norm_tokens(_safe_list(profile_json, ["health", "allergies", "camila"]))
    style_prefs = _norm_tokens(lifestyle.get("preferences", []))
    profile_signals = _extract_profile_signals(profile_json)

    rows = db.execute(select(Experience).where(Experience.city == city)).scalars().all()
    graph_boost_map = find_related_experiences(db, user_id, rows)

    ranked = []

    weather = str(context.get("weather", "")).lower()
    daypart = str(context.get("daypart", "")).lower()
    hour = int(context.get("hour", datetime.utcnow().hour))

    for exp in rows:
        exp_domain = _get_domain(exp)
        exp_tags = [str(t).lower() for t in (exp.tags or [])]
        token_set = _tokenize_experience(exp)
        tag_set = set(exp_tags).union(token_set)

        if domain and exp_domain != domain:
            continue

        if NEGATIVE_KEYWORDS.intersection(tag_set):
            continue

        category = (exp.category or "").lower()

        if avoid_bar and (category == "bar" or BAR_WORDS.intersection(tag_set)):
            continue

        if avoid_nightclub and category in {"club", "nightlife"}:
            continue

        if avoid_crowded and ({"crowded", "loud", "busy", "lotado"}.intersection(tag_set) or category in {"club", "nightlife"}):
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

        matched_signals = {signal for signal in profile_signals if signal and _normalize_text(signal) in " ".join(sorted(tag_set))}
        if matched_signals:
            score += min(0.32, 0.08 + len(matched_signals) * 0.04)

        if (exp.source or "").startswith("curated_"):
            score += 0.18

        if exp.content_tier == "signature":
            score += 0.12
        elif exp.content_tier == "curated":
            score += 0.08

        if exp.quality_score:
            score += min(0.18, max(0.0, float(exp.quality_score) / 500.0))

        if QUALITY_KEYWORDS.intersection(tag_set):
            score += 0.08

        if QUIET_POSITIVE.intersection(tag_set):
            score += 0.08

        if exp_domain == "dining_out" and {"restaurant", "jantar", "massa", "pizza", "japanese", "japonês"}.intersection(tag_set):
            score += 0.08

        if exp_domain == "movies_series" and {"cinema", "series", "filme", "movie", "plot", "twist", "suspense"}.intersection(tag_set):
            score += 0.1

        if exp_domain == "events_exhibitions" and {"museum", "museu", "exposição", "ims", "masp", "theatro", "planetario", "planetário"}.intersection(tag_set):
            score += 0.1

        if avoid_crowded and ({"crowded", "loud", "busy"}.intersection(tag_set) or category in {"club", "nightlife"}):
            score -= 0.45

        if avoid_bar and category == "bar":
            score -= 0.6

        if avoid_bar and BAR_WORDS.intersection(tag_set):
            score -= 0.35

        if avoid_nightclub and category in {"club", "nightlife"}:
            score -= 0.6

        if allergies and allergies.intersection(tag_set):
            score -= 0.9

        if weather == "rain" and avoid_rain:
            if exp_domain in {"dining_out", "events_exhibitions"}:
                score -= 0.2
            if exp_domain in {"delivery", "movies_series"}:
                score += 0.2

        if weather == "rain" and (exp.indoor_outdoor or "") == "indoor":
            score += 0.08

        if exp_domain == "delivery" and exp.availability_kind == "delivery":
            score += 0.05

        if exp_domain == "delivery":
            score += 0.05

        if max_drive_minutes <= 30 and {"centro", "luz"}.intersection(tag_set):
            score -= 0.08

        # Life Graph boost from connected interests.
        graph_boost = float(graph_boost_map.get(exp.id, 0.0))
        if graph_boost > 0:
            score += min(0.45, graph_boost * 0.08)

        reason = "Matches your couple preferences"
        if matched_signals:
            sample = sorted(matched_signals)[0]
            reason = f"Matches a real couple preference signal like {sample}"
        elif graph_boost > 0:
            reason = "Boosted by Life Graph connected interests"
        if allergies and allergies.intersection(tag_set):
            reason = "Penalized due to allergy risk"
        elif avoid_crowded and {"crowded", "loud", "busy"}.intersection(tag_set):
            reason = "Penalized for crowded/noisy environment"
        elif weather == "rain" and exp_domain in {"delivery", "movies_series"}:
            reason = "Boosted because it fits rainy weather"

        ranked.append((round(score, 4), reason, exp_domain, exp))

    ranked.sort(key=lambda x: x[0], reverse=True)

    # Reserve a small slice of the feed for recent discoveries so the app
    # does not become a loop of the exact same popular items.
    exploration_slots = max(1, int(limit * _EXPLORATION_EPSILON))
    main_slots = max(0, limit - exploration_slots)

    now_utc = datetime.now(timezone.utc)
    main_results = []
    exploration_candidates = []

    for item in ranked:
        _, _, _, exp = item
        exp_age_hours = (
            (now_utc - exp.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
            if getattr(exp, "created_at", None)
            else 9999
        )
        if exp_age_hours <= _EXPLORATION_MAX_AGE_HOURS:
            exploration_candidates.append(item)
        else:
            main_results.append(item)

    random.shuffle(exploration_candidates)
    merged = main_results[:main_slots] + exploration_candidates[:exploration_slots]

    deduped = []
    seen_keys: set[str] = set()
    for item in merged:
        _, _, _, exp = item
        dedupe_key = _normalize_text(f"{exp.title or ''} {exp.location or ''}")
        if not dedupe_key or dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        deduped.append(item)
        if len(deduped) >= limit:
            break

    if len(deduped) < limit:
        for item in ranked:
            _, _, _, exp = item
            dedupe_key = _normalize_text(f"{exp.title or ''} {exp.location or ''}")
            if not dedupe_key or dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)
            deduped.append(item)
            if len(deduped) >= limit:
                break

    deduped.sort(key=lambda x: x[0], reverse=True)
    return deduped[:limit]
