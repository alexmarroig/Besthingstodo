from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np


def _cosine(a: list[float] | None, b: list[float] | None) -> float:
    if not a or not b:
        return 0.0
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    den = np.linalg.norm(va) * np.linalg.norm(vb)
    if den == 0:
        return 0.0
    return float(np.dot(va, vb) / den)


def _distance_km(user_lat: float | None, user_lon: float | None, lat: float | None, lon: float | None) -> float | None:
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


def generate_candidates(
    experiences: list[dict[str, Any]],
    user_embedding: list[float] | None,
    city: str,
    user_lat: float | None,
    user_lon: float | None,
    max_items: int = 200,
) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    scored: list[tuple[float, dict[str, Any]]] = []

    for exp in experiences:
        if city and (exp.get("city") or "").lower() != city.lower():
            continue

        semantic = _cosine(user_embedding, exp.get("embedding"))
        recency = 0.0
        st = exp.get("start_time")
        if isinstance(st, datetime):
            ts = st if st.tzinfo else st.replace(tzinfo=timezone.utc)
            delta_hours = (ts - now).total_seconds() / 3600.0
            if -24 <= delta_hours <= 24 * 14:
                recency = max(0.0, 1.0 - abs(delta_hours) / (24 * 14))

        dist = _distance_km(user_lat, user_lon, exp.get("latitude"), exp.get("longitude"))
        dist_score = 1.0 if dist is None else max(0.0, 1.0 - min(dist, 50.0) / 50.0)

        score = 0.6 * semantic + 0.25 * recency + 0.15 * dist_score
        scored.append((score, exp))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [x[1] for x in scored[:max_items]]
