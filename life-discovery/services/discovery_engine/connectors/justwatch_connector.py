"""
JustWatch connector — streaming availability for movies and series in Brazil.

JustWatch has an unofficial GraphQL API (used by their own website) that
returns streaming providers for content in Brazil (Netflix, Prime, Max,
Globoplay, Disney+, Apple TV+, Paramount+, etc.).

No API key required. Uses their public GraphQL endpoint.

Also scrapes their popular movies/series pages as fallback.
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
    "Accept": "application/json, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://www.justwatch.com",
    "Referer": "https://www.justwatch.com/br/filmes-populares",
}

_GRAPHQL_URL = "https://apis.justwatch.com/graphql"
_PAGES = [
    ("https://www.justwatch.com/br/filmes-populares", "cinema"),
    ("https://www.justwatch.com/br/series-populares", "series"),
    ("https://www.justwatch.com/br/filmes-novidades", "cinema"),
]

# GraphQL query for popular movies in Brazil
_POPULAR_QUERY = """
query GetPopularTitles($country: Country!, $objectType: ObjectType!) {
  popularTitles(
    country: $country
    first: 30
    filter: {objectTypes: [$objectType]}
  ) {
    edges {
      node {
        id
        content(country: $country, language: "pt") {
          title
          shortDescription
          genres { translation }
          externalIds { imdbId }
          posterUrl
        }
        offers(country: $country, platform: WEB) {
          monetizationTypes
          package { clearName shortName }
          deeplinkURL
        }
      }
    }
  }
}
"""

_PROVIDER_TAG_MAP = {
    "netflix": ["netflix", "streaming"],
    "amazon": ["prime video", "streaming", "amazon"],
    "hbo": ["hbo", "max", "streaming"],
    "disney": ["disney+", "streaming"],
    "globoplay": ["globoplay", "streaming", "brazilian"],
    "apple": ["apple tv+", "streaming"],
    "paramount": ["paramount+", "streaming"],
    "mubi": ["mubi", "art-house", "streaming"],
}


def _providers_to_tags(offers: list) -> list[str]:
    tags: set[str] = {"streaming", "watch at home"}
    for offer in (offers or []):
        pkg = offer.get("package", {})
        short = (pkg.get("shortName") or "").lower()
        for key, new_tags in _PROVIDER_TAG_MAP.items():
            if key in short:
                tags.update(new_tags)
    return sorted(tags)


def _fetch_graphql(object_type: str) -> list[dict]:
    try:
        payload = {
            "query": _POPULAR_QUERY,
            "variables": {"country": "BR", "objectType": object_type},
        }
        resp = requests.post(_GRAPHQL_URL, json=payload, headers=_HEADERS, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        edges = (data.get("data") or {}).get("popularTitles", {}).get("edges") or []
        return [e.get("node", {}) for e in edges if e.get("node")]
    except Exception:
        return []


def _fetch_html_page(url: str, category: str) -> list[dict]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=25)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        seen: set[str] = set()

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict) and item.get("@type") in {"Movie", "TVSeries"}:
                        title = (item.get("name") or "").strip()
                        if title and title not in seen:
                            seen.add(title)
                            results.append({
                                "title": title,
                                "description": item.get("description", "")[:400],
                                "url": item.get("url", url),
                                "category": category,
                                "tags": ["justwatch", "streaming"] + (
                                    [item["@type"].lower()] if item.get("@type") else []
                                ),
                            })
            except Exception:
                pass

        # Title links fallback
        links = soup.select("a[class*='title'], a[href*='/br/filme/'], a[href*='/br/serie/']")
        for link in links[:60]:
            href = link.get("href", "")
            if not href.startswith("http"):
                href = f"https://www.justwatch.com{href}"
            title = link.get_text(strip=True) or link.get("title", "")
            if not title or title in seen:
                continue
            seen.add(title)
            results.append({
                "title": title,
                "description": f"Disponível no streaming — {title}",
                "url": href,
                "category": category,
                "tags": ["justwatch", "streaming"],
            })

        return results
    except Exception:
        return []


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    # Try GraphQL API first
    for obj_type, category in [("MOVIE", "cinema"), ("SHOW", "series")]:
        nodes = _fetch_graphql(obj_type)
        for node in nodes:
            content = node.get("content") or {}
            title = (content.get("title") or "").strip()
            if not title or title in seen:
                continue
            seen.add(title)

            description = (content.get("shortDescription") or f"Disponível no streaming – {title}")[:400]
            genres = [g.get("translation", "") for g in (content.get("genres") or [])]
            provider_tags = _providers_to_tags(node.get("offers") or [])
            base_tags = ["justwatch", "streaming"] + provider_tags + [g.lower() for g in genres if g]
            tags = enrich_tags_from_title(title, base_tags)

            # Get deeplink URL if available
            offers = node.get("offers") or []
            url = offers[0].get("deeplinkURL", "https://www.justwatch.com/br") if offers else "https://www.justwatch.com/br"

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description,
                        "venue": "Streaming",
                        "city": "Sao Paulo",
                        "date": None,
                        "price": None,
                        "category": category,
                        "tags": tags,
                        "url": url,
                    },
                    source="justwatch",
                )
            )
            if len(events) >= 40:
                return events

    # Fallback: HTML scraping
    if len(events) < 10:
        for url, category in _PAGES:
            for item in _fetch_html_page(url, category):
                title = item["title"]
                if title in seen:
                    continue
                seen.add(title)
                tags = enrich_tags_from_title(title, item["tags"])
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": item["description"],
                            "venue": "Streaming",
                            "city": "Sao Paulo",
                            "date": None,
                            "price": None,
                            "category": item["category"],
                            "tags": tags,
                            "url": item["url"],
                        },
                        source="justwatch",
                    )
                )
                if len(events) >= 40:
                    return events

    return events
