"""
Rotten Tomatoes connector — movies in theaters with critic & audience scores.

RT exposes a private JSON API at /api/private/v2.0/browse that their website
calls without authentication. This gives us tomatometer + audience score for
movies currently in theaters.

Also scrapes the movie browsing page as fallback.
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
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
    "Referer": "https://www.rottentomatoes.com/",
}

_API_URL = "https://www.rottentomatoes.com/api/private/v2.0/browse"
_BROWSE_URL = "https://www.rottentomatoes.com/browse/movies_in_theaters/"

_GENRE_TAG_MAP = {
    "Action": ["action", "adventure"],
    "Adventure": ["adventure", "outdoor"],
    "Animation": ["animation", "kids", "family"],
    "Comedy": ["comedy", "fun", "humor"],
    "Crime": ["crime", "thriller", "suspense"],
    "Documentary": ["documentary", "intellectual", "educational"],
    "Drama": ["drama", "emotional"],
    "Horror": ["horror", "thriller"],
    "Musical": ["musical", "music", "performance"],
    "Mystery": ["mystery", "thriller", "suspense", "intellectual"],
    "Romance": ["romance", "romantic"],
    "Sci-fi": ["sci-fi", "fiction", "intellectual"],
    "Thriller": ["thriller", "suspense"],
    "Western": ["western"],
    "Fantasy": ["fantasy", "fiction"],
}


def _genres_to_tags(genres: list) -> list[str]:
    tags: set[str] = set()
    for g in (genres or []):
        name = g if isinstance(g, str) else (g.get("name") or g.get("id") or "")
        for gname, new_tags in _GENRE_TAG_MAP.items():
            if gname.lower() in name.lower():
                tags.update(new_tags)
    return sorted(tags)


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    # --- Try private JSON API ---
    try:
        resp = requests.get(
            _API_URL,
            params={"limit": 30, "type": "in-theaters", "page": 1},
            headers=_HEADERS,
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        movies = data.get("results") or data.get("items") or []

        for movie in movies:
            title = (movie.get("title") or movie.get("name") or "").strip()
            if not title or title in seen:
                continue
            seen.add(title)

            url = movie.get("url", "")
            if url and not url.startswith("http"):
                url = f"https://www.rottentomatoes.com{url}"

            # Scores
            tomatometer = movie.get("tomatoScore") or movie.get("criticsScore") or {}
            audience = movie.get("audienceScore") or {}
            t_score = tomatometer.get("score") if isinstance(tomatometer, dict) else tomatometer
            a_score = audience.get("score") if isinstance(audience, dict) else audience

            score_str = ""
            if t_score is not None:
                score_str += f"🍅 {t_score}%"
            if a_score is not None:
                score_str += f" 🍿 {a_score}%"

            genres = movie.get("genres") or []
            genre_tags = _genres_to_tags(genres)
            base_tags = ["cinema", "movie", "film", "rotten tomatoes"] + genre_tags
            tags = enrich_tags_from_title(title, base_tags)

            synopsis = (movie.get("synopsis") or movie.get("description") or "")[:400]
            description = f"{score_str} – {synopsis}".strip() if synopsis else (
                f"{score_str} – Filme em cartaz nos cinemas".strip() if score_str
                else f"Filme em cartaz – {title}"
            )

            release = movie.get("releaseDate") or movie.get("releaseDateTheaters")

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description[:400],
                        "venue": "Cinemas de Sao Paulo",
                        "city": "Sao Paulo",
                        "date": release,
                        "price": None,
                        "category": "cinema",
                        "tags": tags,
                        "url": url,
                    },
                    source="rottentomatoes",
                )
            )
            if len(events) >= 25:
                return events

    except Exception:
        pass

    # --- Fallback: scrape browse page ---
    if len(events) < 5:
        try:
            resp = requests.get(_BROWSE_URL, headers=_HEADERS, timeout=25)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Try JSON-LD
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
                        href = item.get("url", _BROWSE_URL)
                        if not href.startswith("http"):
                            href = f"https://www.rottentomatoes.com{href}"
                        description = (item.get("description") or f"Filme em cartaz – {title}")[:400]
                        genres = item.get("genre") or []
                        genre_tags = _genres_to_tags(genres if isinstance(genres, list) else [genres])
                        tags = enrich_tags_from_title(title, ["cinema", "movie", "film"] + genre_tags)
                        events.append(
                            normalize_event(
                                {
                                    "title": title[:140],
                                    "description": description,
                                    "venue": "Cinemas de Sao Paulo",
                                    "city": "Sao Paulo",
                                    "date": None,
                                    "price": None,
                                    "category": "cinema",
                                    "tags": tags,
                                    "url": href,
                                },
                                source="rottentomatoes",
                            )
                        )
                        if len(events) >= 25:
                            return events
                except Exception:
                    pass

            # Link extraction fallback
            links = soup.select('a[href*="/m/"]')
            for link in links[:60]:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://www.rottentomatoes.com{href}"
                title = link.get_text(strip=True)
                if not title or len(title) < 3 or title in seen:
                    continue
                seen.add(title)
                tags = enrich_tags_from_title(title, ["cinema", "movie", "film", "rotten tomatoes"])
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": f"Filme em cartaz – {title}",
                            "venue": "Cinemas de Sao Paulo",
                            "city": "Sao Paulo",
                            "date": None,
                            "price": None,
                            "category": "cinema",
                            "tags": tags,
                            "url": href,
                        },
                        source="rottentomatoes",
                    )
                )
                if len(events) >= 25:
                    break
        except Exception:
            pass

    return events
