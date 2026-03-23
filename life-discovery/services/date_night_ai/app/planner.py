from __future__ import annotations

from typing import Any


def _item_key(item: dict[str, Any]) -> str:
    return str(item.get("title") or item.get("id") or "").strip().lower()


def score_item(item: dict[str, Any], profile: dict, weather: str, time_pref: str, kind: str) -> float:
    tags = [str(t).lower() for t in (item.get("tags") or [])]
    cat = str(item.get("category") or "").lower()
    score = 0.0

    if kind == "cultural":
        if cat in {"event", "exhibition", "movie", "cinema"}:
            score += 0.4
        if any(t in tags for t in ["museum", "exhibition", "cultural", "thriller"]):
            score += 0.3
    elif kind == "restaurant":
        if cat == "restaurant":
            score += 0.45
        if any(t in tags for t in ["quiet", "romantic", "italian", "japanese"]):
            score += 0.3
    elif kind == "after":
        if any(t in tags for t in ["cafe", "walk", "quiet", "romantic"]):
            score += 0.35
        if cat in {"cafe", "event", "exhibition"}:
            score += 0.2

    style = profile.get("experience_style", {}) if isinstance(profile, dict) else {}
    if style.get("quiet_environments") and any(t in tags for t in ["quiet", "museum", "exhibition"]):
        score += 0.15
    if style.get("romantic") and any(t in tags for t in ["romantic", "restaurant", "cafe"]):
        score += 0.15

    if (weather or "").lower() in {"rain", "storm"} and cat in {"movie", "cinema", "exhibition", "restaurant"}:
        score += 0.1
    if (time_pref or "").lower() in {"night", "evening"} and cat in {"movie", "restaurant", "event"}:
        score += 0.1

    return score


def pick_best(
    items: list[dict],
    profile: dict,
    weather: str,
    time_pref: str,
    kind: str,
    exclude_keys: set[str] | None = None,
) -> dict | None:
    if not items:
        return None
    exclude_keys = exclude_keys or set()
    scored = [(score_item(i, profile, weather, time_pref, kind), i) for i in items if _item_key(i) not in exclude_keys]
    if not scored:
        return None
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]
