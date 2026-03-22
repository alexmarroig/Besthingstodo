"""
OMDb API connector — Open Movie Database.

Free tier: 1,000 requests/day.
Requires OMDB_API_KEY environment variable (free at omdbapi.com).

Used for enriching movie data with:
- Full plot, ratings (IMDb, RT, Metacritic)
- Cast, director, genre
- Awards info
- Poster URL

If no API key, we can still use the free search endpoint up to the limit
(100/day without key for basic search).

Fetches:
- Currently popular movies (search by year + high rating)
- Award-winning movies suitable for couples
"""
from __future__ import annotations

import os
import re

import requests

from ..normalize import normalize_event, enrich_tags_from_title

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}

_BASE_URL = "https://www.omdbapi.com/"
_API_KEY = os.getenv("OMDB_API_KEY", "")

# Curated search terms for couple-friendly movies
_SEARCHES = [
    # High-quality drama/romance for couples
    {"s": "romance", "type": "movie", "y": "2025"},
    {"s": "drama", "type": "movie", "y": "2025"},
    {"s": "documentary", "type": "movie", "y": "2024"},
    {"s": "comedy", "type": "movie", "y": "2025"},
    # Award-winning recent films
    {"s": "oscar", "type": "movie", "y": "2025"},
]

_GENRE_TAG_MAP = {
    "Romance": ["romance", "romantic"],
    "Drama": ["drama", "emotional"],
    "Comedy": ["comedy", "fun"],
    "Documentary": ["documentary", "intellectual"],
    "Thriller": ["thriller", "suspense"],
    "Mystery": ["mystery", "intellectual"],
    "Animation": ["animation", "family"],
    "Adventure": ["adventure"],
    "Sci-Fi": ["sci-fi", "intellectual"],
    "Crime": ["crime", "thriller"],
    "Biography": ["biography", "intellectual", "documentary"],
    "History": ["history", "intellectual"],
    "Music": ["music", "musical"],
}


def _genres_to_tags(genre_str: str) -> list[str]:
    tags: set[str] = set()
    for genre in genre_str.split(","):
        genre = genre.strip()
        for key, new_tags in _GENRE_TAG_MAP.items():
            if key.lower() in genre.lower():
                tags.update(new_tags)
    return sorted(tags)


def _safe_float(s: str) -> float | None:
    try:
        return float(re.sub(r"[^\d.]", "", s))
    except Exception:
        return None


def _format_ratings(ratings: list[dict]) -> str:
    parts = []
    for r in ratings:
        source = r.get("Source", "")
        value = r.get("Value", "")
        if "imdb" in source.lower() or "Internet" in source:
            parts.append(f"IMDb {value}")
        elif "rotten" in source.lower():
            parts.append(f"🍅 {value}")
        elif "metacritic" in source.lower():
            parts.append(f"Metacritic {value}")
    return " | ".join(parts)


def _fetch_detail(imdb_id: str) -> dict | None:
    """Fetch full movie details by IMDb ID."""
    params = {"i": imdb_id, "plot": "short", "r": "json"}
    if _API_KEY:
        params["apikey"] = _API_KEY
    try:
        resp = requests.get(_BASE_URL, params=params, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("Response") == "True":
            return data
    except Exception:
        pass
    return None


def _search_movies(query: str, year: str | None, movie_type: str = "movie") -> list[dict]:
    params: dict = {"s": query, "type": movie_type, "r": "json"}
    if year:
        params["y"] = year
    if _API_KEY:
        params["apikey"] = _API_KEY
    try:
        resp = requests.get(_BASE_URL, params=params, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("Response") == "True":
            return data.get("Search", [])
    except Exception:
        pass
    return []


def fetch_events() -> list[dict]:
    if not _API_KEY:
        return []  # OMDb requires API key for reliable access

    events: list[dict] = []
    seen: set[str] = set()

    for search_params in _SEARCHES:
        query = search_params.pop("s")
        year = search_params.pop("y", None)
        movie_type = search_params.pop("type", "movie")

        results = _search_movies(query, year, movie_type)

        for item in results[:5]:  # limit detail fetches per search
            imdb_id = item.get("imdbID", "")
            if not imdb_id:
                continue

            detail = _fetch_detail(imdb_id)
            if not detail:
                continue

            title = detail.get("Title", "").strip()
            if not title or title in seen:
                continue
            seen.add(title)

            # Skip low-rated
            imdb_rating = _safe_float(detail.get("imdbRating", "N/A"))
            if imdb_rating is not None and imdb_rating < 6.0:
                continue

            genre_str = detail.get("Genre", "")
            plot = detail.get("Plot", "")[:400]
            ratings_str = _format_ratings(detail.get("Ratings") or [])
            year_str = detail.get("Year", "")
            director = detail.get("Director", "")

            parts = [f"{year_str}", ratings_str, f"Dir: {director}" if director else ""]
            header = " | ".join(p for p in parts if p)
            description = f"{header}\n{plot}".strip()[:400]

            genre_tags = _genres_to_tags(genre_str)
            base_tags = ["omdb", "movie", "film", "cinema"] + genre_tags
            tags = enrich_tags_from_title(title, base_tags)

            url = f"https://www.imdb.com/title/{imdb_id}/"

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description,
                        "venue": "Cinemas / Streaming",
                        "city": "Sao Paulo",
                        "date": None,
                        "price": None,
                        "category": "cinema" if "Series" not in detail.get("Type", "") else "series",
                        "tags": tags,
                        "url": url,
                    },
                    source="omdb",
                )
            )
            if len(events) >= 25:
                return events

    return events
