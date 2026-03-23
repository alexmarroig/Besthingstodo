"""
Reddit connector — mines community recommendations from São Paulo subreddits.

Uses Reddit's public JSON API (no auth required, 60 req/min limit).
Searches for restaurant recommendations, event tips, and cultural picks.

Sources:
- r/saopaulo — general SP community with restaurant/event tips
- r/gastronomia — Brazilian gastronomy recommendations
- r/brasil — national culture discussions
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

import requests

from ..normalize import normalize_event, enrich_tags_from_title

_REDDIT_HEADERS = {
    # Reddit requires a descriptive User-Agent to avoid 429/403
    "User-Agent": "LifeDiscovery/1.0 (+https://lifediscovery.app; lifestyle recommendations bot)",
    "Accept": "application/json",
}

_BASE = "https://www.reddit.com"

# Queries targeting high-value recommendation posts
_SEARCHES = [
    # (subreddit, query, category, domain_tags)
    ("saopaulo", "restaurante indicação OR recomendação", "restaurant", ["dining", "restaurant"]),
    ("saopaulo", "o que fazer fim de semana", "cultural", ["event", "cultural"]),
    ("saopaulo", "exposição museu galeria", "exhibition", ["exhibition", "museum", "cultural"]),
    ("saopaulo", "bar boteco happy hour", "restaurant", ["bar", "casual", "drinks"]),
    ("gastronomia", "restaurante São Paulo indicação", "restaurant", ["dining", "restaurant", "gastronomy"]),
    ("brasil", "séries filme assistir 2025", "cinema", ["movie", "series", "streaming"]),
]


def _ts_to_isoformat(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def _clean_reddit_title(title: str) -> str:
    """Remove common Reddit title noise."""
    title = re.sub(r"\[.*?\]|\(.*?\)", "", title).strip()
    return " ".join(title.split())


def _parse_price(text: str) -> float | None:
    if re.search(r"gratu[ií]to|gratuita|free", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for subreddit, query, category, domain_tags in _SEARCHES:
        try:
            resp = requests.get(
                f"{_BASE}/r/{subreddit}/search.json",
                params={
                    "q": query,
                    "sort": "top",
                    "t": "month",
                    "limit": 15,
                    "restrict_sr": "1",
                },
                headers=_REDDIT_HEADERS,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            continue

        posts = (data.get("data") or {}).get("children") or []
        for post in posts:
            p = (post.get("data") or {})
            title = _clean_reddit_title(p.get("title", ""))
            if len(title) < 10 or title in seen:
                continue
            seen.add(title)

            # Skip low-engagement or removed posts
            score = p.get("score", 0)
            if score < 5:
                continue

            url = p.get("url", "")
            permalink = f"{_BASE}{p.get('permalink', '')}"
            selftext = (p.get("selftext") or "")[:400]
            created = p.get("created_utc")

            # Prefer the source URL if it's a link post; else use permalink
            href = url if (url and not url.startswith(_BASE) and not url.endswith(".reddit.com")) else permalink

            description = selftext.strip() or f"Recomendação da comunidade r/{subreddit}: {title}"
            price = _parse_price(selftext + " " + title)

            base_tags = ["reddit", "community", f"r/{subreddit}"] + domain_tags
            tags = enrich_tags_from_title(title, base_tags)

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description[:400],
                        "venue": "Sao Paulo",
                        "city": "Sao Paulo",
                        "date": _ts_to_isoformat(created) if created else None,
                        "price": price,
                        "category": category,
                        "tags": tags,
                        "url": href,
                    },
                    source=f"reddit_{subreddit}",
                )
            )

    return events
