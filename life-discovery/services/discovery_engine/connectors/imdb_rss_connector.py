"""
IMDb RSS connector — pulls most-watched movies (Movie Meter) and Top 250.

IMDb publishes valid RSS feeds that work with a proper User-Agent.
No API key required. feedparser handles the XML parsing.
"""
from __future__ import annotations

import re

try:
    import feedparser
    _FP_OK = True
except ImportError:
    _FP_OK = False

import requests

from ..normalize import normalize_event, enrich_tags_from_title

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
}

_FEEDS = [
    # IMDb Movie Meter: most-watched movies right now
    ("https://rss.imdb.com/chart/moviemeter", "imdb_movie_meter", "cinema"),
    # IMDb Top 250 (timeless classics + recent greats)
    ("https://rss.imdb.com/chart/top", "imdb_top250", "cinema"),
]


def _parse_with_feedparser(url: str) -> list[dict]:
    feed = feedparser.parse(url, request_headers=_HEADERS)
    return feed.entries or []


def _parse_with_requests(url: str) -> list[dict]:
    """Fallback if feedparser isn't installed: fetch XML and parse manually."""
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=20)
        resp.raise_for_status()
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "xml")
        items = soup.find_all("item")
        entries = []
        for item in items:
            title = (item.find("title") or {}).get_text(strip=True) if hasattr(item.find("title"), "get_text") else ""
            link = (item.find("link") or {}).get_text(strip=True) if hasattr(item.find("link"), "get_text") else ""
            desc = (item.find("description") or {}).get_text(strip=True) if hasattr(item.find("description"), "get_text") else ""
            pub = (item.find("pubDate") or {}).get_text(strip=True) if hasattr(item.find("pubDate"), "get_text") else ""
            entries.append({"title": title, "link": link, "summary": desc, "published": pub})
        return entries
    except Exception:
        return []


def _clean_imdb_title(raw: str) -> tuple[str, str | None]:
    """
    IMDb RSS titles look like: '1. The Shawshank Redemption (1994) - 9.3'
    Returns (title, year).
    """
    raw = re.sub(r"^\d+\.\s*", "", raw).strip()        # remove ranking prefix
    year_m = re.search(r"\((\d{4})\)", raw)
    year = year_m.group(1) if year_m else None
    title = re.sub(r"\s*\(\d{4}\).*$", "", raw).strip()  # remove (year) and trailing score
    return title, year


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for feed_url, source_name, category in _FEEDS:
        if _FP_OK:
            entries = _parse_with_feedparser(feed_url)
        else:
            entries = _parse_with_requests(feed_url)

        for entry in entries[:20]:
            raw_title = getattr(entry, "title", "") or entry.get("title", "")
            link = getattr(entry, "link", "") or entry.get("link", "")
            summary = getattr(entry, "summary", "") or entry.get("summary", "")

            title, year = _clean_imdb_title(raw_title)
            if not title or title in seen:
                continue
            seen.add(title)

            # Build description from summary (often has rating + cast)
            description = re.sub(r"<[^>]+>", " ", summary).strip()[:400]
            if not description:
                description = f"Filme no IMDb – {title}" + (f" ({year})" if year else "")

            tags = enrich_tags_from_title(title, ["imdb", "cinema", "movie", "film"])
            if "top250" in source_name:
                tags = sorted(set(tags) | {"classic", "acclaimed", "intellectual"})

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description,
                        "venue": "Streaming / Cinemas",
                        "city": "Sao Paulo",
                        "date": None,
                        "price": None,
                        "category": category,
                        "tags": tags,
                        "url": link,
                    },
                    source=source_name,
                )
            )
            if len(events) >= 40:
                return events

    return events
