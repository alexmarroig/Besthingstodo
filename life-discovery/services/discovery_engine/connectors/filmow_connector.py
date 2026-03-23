"""
Filmow connector — Brazil's largest movie tracking and rating community.

Filmow (filmow.com) is Brazil's Letterboxd/IMDb equivalent. It shows movies
currently in theaters with Brazilian user ratings and reviews.
Server-rendered — requests + BeautifulSoup works.
"""
from __future__ import annotations

import json
import re

import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event, enrich_tags_from_title

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
}

_URLS = [
    ("https://filmow.com/filmes-em-cartaz/", "cinema"),
    ("https://filmow.com/series/", "series"),
]

_GENRE_PT_MAP = {
    "ação": ["action"], "aventura": ["adventure"], "animação": ["animation", "kids"],
    "comédia": ["comedy", "fun"], "drama": ["drama"], "terror": ["horror", "thriller"],
    "suspense": ["thriller", "suspense"], "romance": ["romance", "romantic"],
    "ficção científica": ["sci-fi", "intellectual"], "documentário": ["documentary", "intellectual"],
    "musical": ["musical", "music"], "mistério": ["mystery", "thriller", "intellectual"],
}


def _genre_text_to_tags(text: str) -> list[str]:
    tags: set[str] = set()
    lower = text.lower()
    for genre, new_tags in _GENRE_PT_MAP.items():
        if genre in lower:
            tags.update(new_tags)
    return sorted(tags)


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for url, default_category in _URLS:
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=25)
            resp.raise_for_status()
        except Exception:
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if not isinstance(item, dict) or item.get("@type") not in {"Movie", "TVSeries"}:
                        continue
                    title = (item.get("name") or "").strip()
                    if not title or title in seen:
                        continue
                    seen.add(title)
                    href = item.get("url", url)
                    if not href.startswith("http"):
                        href = f"https://filmow.com{href}"
                    description = (item.get("description") or f"Filme no Filmow – {title}")[:400]
                    genres = item.get("genre") or []
                    genre_text = " ".join(genres if isinstance(genres, list) else [genres])
                    genre_tags = _genre_text_to_tags(genre_text)
                    base_tags = ["filmow", "cinema", "brazilian community"] + genre_tags
                    tags = enrich_tags_from_title(title, base_tags)
                    rating = item.get("aggregateRating", {})
                    rating_val = rating.get("ratingValue") if isinstance(rating, dict) else None
                    if rating_val:
                        description = f"⭐ {rating_val}/10 – {description}"
                    events.append(
                        normalize_event(
                            {
                                "title": title[:140],
                                "description": description[:400],
                                "venue": "Cinemas de Sao Paulo",
                                "city": "Sao Paulo",
                                "date": item.get("datePublished"),
                                "price": None,
                                "category": default_category,
                                "tags": tags,
                                "url": href,
                            },
                            source="filmow",
                        )
                    )
                    if len(events) >= 30:
                        return events
            except Exception:
                pass

        # HTML fallback — Filmow uses li.movie-item or figure.movie
        candidates = soup.select(
            "li.movie-item, figure.movie, .movie-list li, "
            "a[href*='/filme/'], a[href*='/serie/']"
        )
        if not candidates:
            candidates = soup.select("article, .card, [class*='movie']")

        for card in candidates[:80]:
            if card.name == "a":
                href = card.get("href", "")
                title = card.get("title") or card.get_text(strip=True)
            else:
                link = card.find("a", href=True)
                href = link.get("href", "") if link else ""
                img = card.find("img")
                title = ""
                if img:
                    title = img.get("title") or img.get("alt") or ""
                if not title and link:
                    title = link.get("title") or link.get_text(strip=True)
                if not title:
                    heading = card.find(re.compile(r"^h[1-6]$"))
                    title = heading.get_text(strip=True) if heading else ""

            if not href.startswith("http"):
                href = f"https://filmow.com{href}"
            if not title or len(title) < 2 or title in seen:
                continue
            seen.add(title)

            genre_text = ""
            genre_el = card.select_one(".genres, [class*='genre'], [class*='tipo']")
            if genre_el:
                genre_text = genre_el.get_text(strip=True)

            genre_tags = _genre_text_to_tags(genre_text)
            base_tags = ["filmow", "cinema", "movie", "film"] + genre_tags
            tags = enrich_tags_from_title(title, base_tags)

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": f"Filme no Filmow – {title}",
                        "venue": "Cinemas de Sao Paulo",
                        "city": "Sao Paulo",
                        "date": None,
                        "price": None,
                        "category": default_category,
                        "tags": tags,
                        "url": href,
                    },
                    source="filmow",
                )
            )
            if len(events) >= 30:
                return events

    return events
