import os
from datetime import date

from .connectors.eventbrite_connector import fetch_events as fetch_eventbrite
from .connectors.ims_connector import fetch_events as fetch_ims
from .connectors.masp_connector import fetch_events as fetch_masp
from .connectors.sympla_connector import fetch_events as fetch_sympla
from .connectors.adorocinema_connector import fetch_events as fetch_adorocinema
from .connectors.mubi_connector import fetch_events as fetch_mubi

try:
    from .connectors.fever_connector import fetch_events as fetch_fever
except Exception:  # optional dependency (playwright)
    fetch_fever = None

try:
    from .connectors.tmdb_connector import fetch_events as _fetch_tmdb
    def fetch_tmdb() -> list[dict]:
        return _fetch_tmdb(api_key=os.getenv("TMDB_API_KEY", ""))
except Exception:
    fetch_tmdb = None  # type: ignore[assignment]

try:
    from rapidfuzz import fuzz as _fuzz
    _FUZZY_AVAILABLE = True
except ImportError:
    _FUZZY_AVAILABLE = False


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


def _richer(a: dict, b: dict) -> dict:
    """Return the event with richer (longer) description."""
    return a if len(a.get("description", "")) >= len(b.get("description", "")) else b


def deduplicate_events(events: list[dict]) -> list[dict]:
    """Deduplicate using exact fingerprint match + fuzzy title similarity (if rapidfuzz available)."""
    # Phase 1: exact fingerprint dedup
    seen: dict[str, dict] = {}
    for event in events:
        key = _fingerprint(event)
        if key not in seen:
            seen[key] = event
        else:
            seen[key] = _richer(seen[key], event)

    unique = list(seen.values())

    # Phase 2: fuzzy title dedup (catches "Exposição: Monet" vs "Exposicao Monet")
    if not _FUZZY_AVAILABLE or len(unique) < 2:
        return unique

    final: list[dict] = []
    skipped: set[int] = set()
    for i, ev in enumerate(unique):
        if i in skipped:
            continue
        title_i = _norm(ev.get("title", ""))
        merged = ev
        for j in range(i + 1, len(unique)):
            if j in skipped:
                continue
            title_j = _norm(unique[j].get("title", ""))
            # Only compare within same source to avoid cross-source false positives
            same_source = ev.get("source") == unique[j].get("source")
            if same_source and _fuzz.token_sort_ratio(title_i, title_j) >= 88:
                merged = _richer(merged, unique[j])
                skipped.add(j)
        final.append(merged)

    return final


def fetch_all_events() -> list[dict]:
    events: list[dict] = []
    sources = [
        fetch_masp,
        fetch_ims,
        fetch_sympla,
        fetch_eventbrite,
        fetch_adorocinema,
        fetch_mubi,
    ]
    if fetch_fever is not None:
        sources.append(fetch_fever)
    if fetch_tmdb is not None:
        sources.append(fetch_tmdb)

    for fn in sources:
        try:
            events.extend(fn())
        except Exception:
            continue

    return deduplicate_events(events)
