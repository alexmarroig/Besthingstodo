def token_overlap_score(user_tokens: set[str], item_tokens: set[str]) -> float:
    if not user_tokens or not item_tokens:
        return 0.0
    return len(user_tokens.intersection(item_tokens)) / len(user_tokens.union(item_tokens))


def context_score(context: dict, category: str) -> float:
    daypart = context.get("daypart", "evening")
    boost = 0.0
    if daypart == "evening" and category in {"cinema", "restaurant", "event"}:
        boost += 0.1
    if context.get("weather") == "rain" and category in {"museum", "cinema", "exhibition"}:
        boost += 0.1
    return boost
