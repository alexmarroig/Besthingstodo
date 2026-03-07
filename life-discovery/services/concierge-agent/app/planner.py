def infer_context(message: str) -> dict:
    text = message.lower()
    context = {"daypart": "evening"}
    if "hoje" in text or "tonight" in text:
        context["time_window"] = "today"
    if "chov" in text:
        context["weather"] = "rain"
    return context


def group_type(category: str) -> str:
    if category in {"cinema", "movie"}:
        return "movie"
    if category in {"exhibition", "museum", "event"}:
        return "cultural"
    if category in {"restaurant", "cafe"}:
        return "restaurant"
    return "experience"
