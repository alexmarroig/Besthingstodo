"""
TMDB (The Movie Database) connector.

Fetches movies currently in theaters and popular series available in Brazil.
Requires TMDB_API_KEY env var. Returns empty list gracefully if key is absent.

Free API key: https://www.themoviedb.org/settings/api
"""
from __future__ import annotations

import os

import requests

from ..normalize import normalize_event, enrich_tags_from_title

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# Genre ID → human tag mapping (TMDB genre IDs for movies)
_GENRE_TAGS: dict[int, list[str]] = {
    28: ["action", "adventure"],
    12: ["adventure", "outdoor"],
    16: ["animation", "family", "kids"],
    35: ["comedy", "fun", "humor"],
    80: ["crime", "thriller", "suspense"],
    99: ["documentary", "intellectual", "educational"],
    18: ["drama", "emotional"],
    10751: ["family", "kids"],
    14: ["fantasy", "fiction"],
    36: ["history", "intellectual"],
    27: ["horror", "thriller"],
    10402: ["music", "concert"],
    9648: ["mystery", "thriller", "suspense"],
    10749: ["romance", "romantic"],
    878: ["sci-fi", "intellectual", "fiction"],
    10770: ["tv movie"],
    53: ["thriller", "suspense"],
    10752: ["war", "history"],
    37: ["western"],
}


def _genre_ids_to_tags(genre_ids: list[int]) -> list[str]:
    tags: set[str] = set()
    for gid in (genre_ids or []):
        tags.update(_GENRE_TAGS.get(gid, []))
    return sorted(tags)


def _get(path: str, api_key: str, params: dict | None = None) -> dict | None:
    try:
        r = requests.get(
            f"{TMDB_BASE}{path}",
            params={"api_key": api_key, "language": "pt-BR", "region": "BR", **(params or {})},
            timeout=20,
        )
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def fetch_events(api_key: str = "") -> list[dict]:
    api_key = api_key or os.getenv("TMDB_API_KEY", "")
    if not api_key:
        return []

    events: list[dict] = []

    # --- Movies now playing in Brazil ---
    now_playing = _get("/movie/now_playing", api_key, {"page": 1})
    if now_playing:
        for movie in (now_playing.get("results") or [])[:20]:
            title = (movie.get("title") or movie.get("original_title") or "").strip()
            if not title:
                continue
            genre_tags = _genre_ids_to_tags(movie.get("genre_ids", []))
            base_tags = ["cinema", "movie", "film"] + genre_tags
            tags = enrich_tags_from_title(title, base_tags)
            overview = (movie.get("overview") or f"Filme em cartaz – {title}")[:400]
            release = movie.get("release_date", "")
            poster = movie.get("poster_path", "")
            tmdb_id = movie.get("id")
            url = f"https://www.themoviedb.org/movie/{tmdb_id}" if tmdb_id else ""
            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": overview,
                        "venue": "Cinemas de Sao Paulo",
                        "city": "Sao Paulo",
                        "date": release,
                        "price": None,  # varies by cinema
                        "category": "cinema",
                        "tags": tags,
                        "url": url,
                        "image_url": f"{TMDB_IMAGE_BASE}{poster}" if poster else "",
                    },
                    source="tmdb_movies",
                )
            )

    # --- Popular series available in Brazil (streaming) ---
    popular_series = _get("/tv/popular", api_key, {"page": 1})
    if popular_series:
        for show in (popular_series.get("results") or [])[:20]:
            title = (show.get("name") or show.get("original_name") or "").strip()
            if not title:
                continue
            genre_tags = _genre_ids_to_tags(show.get("genre_ids", []))
            base_tags = ["series", "tv", "streaming"] + genre_tags
            tags = enrich_tags_from_title(title, base_tags)
            overview = (show.get("overview") or f"Série – {title}")[:400]
            first_air = show.get("first_air_date", "")
            tmdb_id = show.get("id")
            url = f"https://www.themoviedb.org/tv/{tmdb_id}" if tmdb_id else ""
            poster = show.get("poster_path", "")
            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": overview,
                        "venue": "Streaming",
                        "city": "Sao Paulo",
                        "date": first_air,
                        "price": None,
                        "category": "series",
                        "tags": tags,
                        "url": url,
                        "image_url": f"{TMDB_IMAGE_BASE}{poster}" if poster else "",
                    },
                    source="tmdb_series",
                )
            )

    return events
