"""
Pipocando connector — Brazil's largest movie/series community.

Pipocando (pipocando.net) is a major Brazilian entertainment news and
reviews site covering movies in theaters, streaming launches, and series.

Has an RSS feed at /feed and structured HTML for movie listings.

Sources:
- RSS feed (news, reviews, release dates)
- Movies in theaters page
- Streaming premieres
"""
from __future__ import annotations

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

_RSS_URL = "https://pipocando.net/feed/"
_PAGES = [
    ("https://pipocando.net/filmes-em-cartaz/", "cinema"),
    ("https://pipocando.net/lancamentos/", "cinema"),
    ("https://pipocando.net/series/", "series"),
]

_GENRE_PT_MAP = {
    "ação": ["action"], "aventura": ["adventure"], "animação": ["animation", "kids"],
    "comédia": ["comedy", "fun"], "drama": ["drama"], "terror": ["horror"],
    "suspense": ["thriller", "suspense"], "romance": ["romance", "romantic"],
    "ficção": ["sci-fi", "intellectual"], "documentário": ["documentary", "intellectual"],
    "musical": ["musical", "music"], "mistério": ["mystery", "thriller"],
    "família": ["family", "kids"], "fantasia": ["fantasy"],
}


def _genre_to_tags(text: str) -> list[str]:
    tags: set[str] = set()
    lower = text.lower()
    for genre, new_tags in _GENRE_PT_MAP.items():
        if genre in lower:
            tags.update(new_tags)
    return sorted(tags)


def _parse_rss(url: str) -> list[dict]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "xml")
        return soup.find_all("item")
    except Exception:
        return []


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    # RSS feed
    rss_items = _parse_rss(_RSS_URL)
    for item in rss_items[:25]:
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description") or item.find("content:encoded")
        pub_el = item.find("pubDate")

        title = title_el.get_text(strip=True) if title_el else ""
        # Filter out non-movie/series items (news about awards, etc.)
        skip_patterns = [r"^\d+ melhores", r"^como assistir", r"quem é", r"vai ter"]
        if any(re.search(p, title, re.IGNORECASE) for p in skip_patterns):
            continue
        if not title or title in seen:
            continue
        seen.add(title)

        href = link_el.get_text(strip=True) if link_el else ""
        raw_desc = desc_el.get_text(" ", strip=True) if desc_el else ""
        description = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw_desc))[:400]
        date_str = pub_el.get_text(strip=True) if pub_el else None

        # Determine category from title/description
        category = "cinema"
        if any(k in title.lower() for k in ["série", "series", "temporada", "season"]):
            category = "series"

        genre_tags = _genre_to_tags(description + " " + title)
        tags = enrich_tags_from_title(title, ["pipocando", "cinema", "brazil"] + genre_tags)

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description,
                    "venue": "Cinemas / Streaming",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": None,
                    "category": category,
                    "tags": tags,
                    "url": href,
                },
                source="pipocando",
            )
        )
        if len(events) >= 30:
            return events

    # HTML pages fallback
    for url, default_category in _PAGES:
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=25)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            candidates = soup.select(
                "article, .movie-card, [class*='filme'], [class*='post'], "
                "a[href*='/filme/'], a[href*='/series/'], h2 a, h3 a"
            )
            for card in candidates[:60]:
                if card.name == "a":
                    href = card.get("href", "")
                    title = card.get("title") or card.get_text(strip=True)
                else:
                    link = card.find("a", href=True)
                    href = link.get("href", "") if link else ""
                    heading = card.find(re.compile(r"^h[1-6]$"))
                    title = heading.get_text(strip=True) if heading else ""
                    if not title and link:
                        title = link.get_text(strip=True)

                if not href.startswith("http"):
                    href = f"https://pipocando.net{href}"
                if not title or len(title) < 4 or title in seen:
                    continue
                seen.add(title)

                full_text = card.get_text(" ", strip=True) if card.name != "a" else ""
                genre_tags = _genre_to_tags(full_text)
                category = default_category
                if any(k in title.lower() for k in ["série", "series", "temporada"]):
                    category = "series"

                tags = enrich_tags_from_title(title, ["pipocando", "cinema", "brazil"] + genre_tags)
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": full_text[:400] if len(full_text) > len(title) + 5 else f"Filme/Série – {title}",
                            "venue": "Cinemas / Streaming",
                            "city": "Sao Paulo",
                            "date": None,
                            "price": None,
                            "category": category,
                            "tags": tags,
                            "url": href,
                        },
                        source="pipocando",
                    )
                )
                if len(events) >= 30:
                    return events
        except Exception:
            continue

    return events
