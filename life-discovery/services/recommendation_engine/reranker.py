from __future__ import annotations

from collections import Counter

TARGET_MIX = ["event", "restaurant", "movie", "exhibition"]


def rerank_with_diversity(items: list[dict], limit: int = 20) -> list[dict]:
    if not items:
        return []

    by_cat: dict[str, list[dict]] = {}
    for it in items:
        cat = (it.get("category") or "event").lower()
        by_cat.setdefault(cat, []).append(it)

    for cat_items in by_cat.values():
        cat_items.sort(key=lambda x: x.get("score", 0.0), reverse=True)

    result: list[dict] = []
    cat_counts = Counter()

    # first pass: ensure category mix
    while len(result) < limit:
        progressed = False
        for cat in TARGET_MIX:
            pool = by_cat.get(cat, [])
            if not pool:
                continue
            pick = pool.pop(0)
            if cat_counts[cat] >= max(1, limit // 3):
                continue
            result.append(pick)
            cat_counts[cat] += 1
            progressed = True
            if len(result) >= limit:
                break
        if not progressed:
            break

    # second pass: fill by remaining highest
    if len(result) < limit:
        leftovers = []
        for pool in by_cat.values():
            leftovers.extend(pool)
        leftovers.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        for it in leftovers:
            if len(result) >= limit:
                break
            result.append(it)

    return result[:limit]
