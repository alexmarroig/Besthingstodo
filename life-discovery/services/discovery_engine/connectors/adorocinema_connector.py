"""
AdoroCinema connector — scrapes movies currently in theaters in Brazil.

AdoroCinema is the leading Brazilian movie guide. Server-rendered, so
BeautifulSoup works without a headless browser.
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

_GENRE_TAG_MAP = {
    "ação": ["action", "adventure"],
    "acao": ["action", "adventure"],
    "animação": ["animation", "kids", "family"],
    "animacao": ["animation", "kids", "family"],
    "aventura": ["adventure", "action"],
    "biografia": ["biography", "intellectual", "drama"],
    "comédia": ["comedy", "fun", "humor"],
    "comedia": ["comedy", "fun", "humor"],
    "documentário": ["documentary", "intellectual", "educational"],
    "documentario": ["documentary", "intellectual", "educational"],
    "drama": ["drama", "emotional"],
    "fantasia": ["fantasy", "fiction"],
    "ficção": ["sci-fi", "fiction", "intellectual"],
    "ficcao": ["sci-fi", "fiction", "intellectual"],
    "horror": ["horror", "thriller"],
    "mistério": ["mystery", "thriller", "suspense", "intellectual"],
    "misterio": ["mystery", "thriller", "suspense", "intellectual"],
    "musical": ["musical", "music", "performance"],
    "romance": ["romance", "romantic"],
    "suspense": ["thriller", "suspense"],
    "terror": ["horror", "thriller"],
    "thriller": ["thriller", "suspense"],
}


def _genres_to_tags(genre_text: str) -> list[str]:
    tags: set[str] = set()
    for genre, new_tags in _GENRE_TAG_MAP.items():
        if genre in genre_text.lower():
            tags.update(new_tags)
    return sorted(tags)


def fetch_events() -> list[dict]:
    url = "https://www.adorocinema.com/filmes/em-cartaz/"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    events: list[dict] = []
    seen: set[str] = set()

    # Try JSON-LD structured data
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict) or item.get("@type") != "Movie":
                    continue
                title = (item.get("name") or "").strip()
                if not title or title in seen:
                    continue
                seen.add(title)
                href = item.get("url", "")
                if not href.startswith("http"):
                    href = f"https://www.adorocinema.com{href}"
                description = (item.get("description") or f"Filme em cartaz – {title}")[:400]
                genre_text = " ".join(
                    g.get("name", "") if isinstance(g, dict) else str(g)
                    for g in (item.get("genre") or [])
                )
                genre_tags = _genres_to_tags(genre_text)
                base_tags = ["cinema", "movie", "film"] + genre_tags
                tags = enrich_tags_from_title(title, base_tags)
                date_str = item.get("datePublished") or item.get("startDate")
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": "Cinemas de Sao Paulo",
                            "city": "Sao Paulo",
                            "date": date_str,
                            "price": None,
                            "category": "cinema",
                            "tags": tags,
                            "url": href,
                        },
                        source="adorocinema",
                    )
                )
                if len(events) >= 25:
                    return events
        except Exception:
            pass

    # Fallback: parse movie cards from HTML
    # AdoroCinema uses .meta-title-link and .card-entity patterns
    movie_cards = soup.select(".meta-title-link, a[href*='/filmes/filme-']")
    for card in movie_cards[:100]:
        href = card.get("href", "")
        if not href.startswith("http"):
            href = f"https://www.adorocinema.com{href}"
        href = href.split("?")[0]
        if href in seen:
            continue
        seen.add(href)

        title = card.get_text(" ", strip=True).strip()
        if not title and card.get("title"):
            title = card.get("title", "").strip()
        if not title:
            # Extract from URL slug
            slug = href.rstrip("/").split("/")[-1].replace("-", " ")
            title = slug.title()

        if len(title) < 3:
            continue

        # Try to get genre, rating, director from parent card
        parent = card.parent
        genre_text = ""
        if parent:
            genre_el = parent.select_one(".meta-type, .genre, [class*='genre']")
            if genre_el:
                genre_text = genre_el.get_text(" ", strip=True)

        genre_tags = _genres_to_tags(genre_text)
        base_tags = ["cinema", "movie", "film"] + genre_tags
        tags = enrich_tags_from_title(title, base_tags)

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": f"Filme em cartaz nos cinemas de São Paulo – {title}",
                    "venue": "Cinemas de Sao Paulo",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": None,
                    "category": "cinema",
                    "tags": tags,
                    "url": href,
                },
                source="adorocinema",
            )
        )
        if len(events) >= 25:
            break

    return events
