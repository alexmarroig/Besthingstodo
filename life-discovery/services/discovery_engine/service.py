import os
from datetime import date

# ── Core sources (always active) ───────────────────────────────────────────
from .connectors.eventbrite_connector import fetch_events as fetch_eventbrite
from .connectors.ims_connector import fetch_events as fetch_ims
from .connectors.masp_connector import fetch_events as fetch_masp
from .connectors.sympla_connector import fetch_events as fetch_sympla

# ── Cinema & Series ─────────────────────────────────────────────────────────
from .connectors.adorocinema_connector import fetch_events as fetch_adorocinema
from .connectors.mubi_connector import fetch_events as fetch_mubi
from .connectors.filmow_connector import fetch_events as fetch_filmow
from .connectors.imdb_rss_connector import fetch_events as fetch_imdb
from .connectors.rottentomatoes_connector import fetch_events as fetch_rottentomatoes
from .connectors.pipocando_connector import fetch_events as fetch_pipocando
from .connectors.justwatch_connector import fetch_events as fetch_justwatch

# ── Cultural venues ──────────────────────────────────────────────────────────
from .connectors.pinacoteca_connector import fetch_events as fetch_pinacoteca
from .connectors.mam_connector import fetch_events as fetch_mam
from .connectors.ccbb_connector import fetch_events as fetch_ccbb
from .connectors.sesc_connector import fetch_events as fetch_sesc

# ── City guides & community ──────────────────────────────────────────────────
from .connectors.catraca_livre_connector import fetch_events as fetch_catraca
from .connectors.guia_da_semana_connector import fetch_events as fetch_guia
from .connectors.timeout_sp_connector import fetch_events as fetch_timeout
from .connectors.reddit_connector import fetch_events as fetch_reddit
from .connectors.veja_sp_connector import fetch_events as fetch_veja_sp

# ── Delivery & Restaurants ───────────────────────────────────────────────────
from .connectors.ifood_connector import fetch_events as fetch_ifood

# ── Optional: requires OMDB_API_KEY ──────────────────────────────────────────
try:
    from .connectors.omdb_connector import fetch_events as fetch_omdb
except Exception:
    fetch_omdb = None  # type: ignore[assignment]

# ── Optional: requires Playwright ───────────────────────────────────────────
try:
    from .connectors.fever_connector import fetch_events as fetch_fever
except Exception:
    fetch_fever = None

# ── Optional: requires TMDB_API_KEY env var ──────────────────────────────────
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
    """
    Fetch events from all registered sources.
    Sources are grouped by category for clarity.
    Each source is wrapped in try/except so one failure doesn't kill the crawl.
    """
    events: list[dict] = []

    # Ordered by reliability and data quality
    always_on = [
        # ── Events & exhibitions ────────────────────────────────────────
        fetch_masp,          # MASP museum
        fetch_ims,           # IMS Paulista
        fetch_ccbb,          # CCBB SP (free cultural events)
        fetch_pinacoteca,    # Pinacoteca do Estado SP
        fetch_mam,           # MAM SP (Ibirapuera)
        fetch_sesc,          # SESC SP (20+ units, huge calendar)
        fetch_sympla,        # Sympla SP
        fetch_eventbrite,    # Eventbrite BR
        fetch_catraca,       # Catraca Livre (free events)
        fetch_guia,          # Guia da Semana SP
        fetch_timeout,       # Time Out SP
        fetch_reddit,        # Reddit r/saopaulo community tips
        fetch_veja_sp,       # Veja SP (restaurants + cinema + exhibitions)
        # ── Cinema & Series ─────────────────────────────────────────────
        fetch_adorocinema,   # AdoroCinema (movies in theaters)
        fetch_mubi,          # MUBI art-house
        fetch_filmow,        # Filmow (Brazilian movie community)
        fetch_imdb,          # IMDb RSS (movie meter + top 250)
        fetch_rottentomatoes,# Rotten Tomatoes (critic scores)
        fetch_pipocando,     # Pipocando (BR cinema news + reviews)
        fetch_justwatch,     # JustWatch (streaming availability BR)
        # ── Delivery & Restaurants ──────────────────────────────────────
        fetch_ifood,         # iFood restaurant rankings
    ]

    optional = []
    if fetch_fever is not None:
        optional.append(fetch_fever)    # Fever SP (Playwright)
    if fetch_tmdb is not None:
        optional.append(fetch_tmdb)     # TMDB API (needs key)
    if fetch_omdb is not None:
        optional.append(fetch_omdb)     # OMDb API (needs key)

    for fn in always_on + optional:
        try:
            result = fn()
            if result:
                events.extend(result)
        except Exception:
            continue

    return deduplicate_events(events)
