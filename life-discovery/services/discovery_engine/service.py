from datetime import date

from .connectors.eventbrite_connector import fetch_events as fetch_eventbrite
from .connectors.ims_connector import fetch_events as fetch_ims
from .connectors.masp_connector import fetch_events as fetch_masp
from .connectors.sympla_connector import fetch_events as fetch_sympla
try:
    from .connectors.fever_connector import fetch_events as fetch_fever
except Exception:  # optional dependency (playwright)
    fetch_fever = None


def _norm(value: str) -> str:
    return " ".join((value or "").lower().strip().split())


def _fingerprint(event: dict) -> str:
    title = _norm(event.get("title", ""))
    venue = _norm(event.get("venue", ""))
    day = ""
    start = event.get("start_time")
    if start is not None:
        try:
            day = str(start.date())
        except Exception:
            day = str(date.today())
    url = _norm(event.get("url", ""))
    return f"{title}|{venue}|{day}|{url}"


def deduplicate_events(events: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for event in events:
        key = _fingerprint(event)
        if key not in seen:
            seen[key] = event
            continue

        # Keep richer payload when duplicate appears.
        current = seen[key]
        if len(event.get("description", "")) > len(current.get("description", "")):
            seen[key] = event
    return list(seen.values())


def fetch_all_events() -> list[dict]:
    events = []
    sources = [fetch_masp, fetch_ims, fetch_sympla, fetch_eventbrite]
    if fetch_fever is not None:
        sources.append(fetch_fever)

    for fn in sources:
        try:
            events.extend(fn())
        except Exception:
            continue

    return deduplicate_events(events)
