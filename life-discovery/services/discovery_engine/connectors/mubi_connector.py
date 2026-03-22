"""
MUBI connector — scrapes films currently showing on MUBI Brasil.

MUBI is a curated streaming platform focused on art-house, international, and
classic cinema. Perfect for the couple's intellectual and cinematic profile.
"""
from __future__ import annotations

import json
import re

import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event, enrich_tags_from_title

_MUBI_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _extract_json_ld_films(soup: BeautifulSoup) -> list[dict]:
    results = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict) and item.get("@type") in {"Movie", "TVSeries", "CreativeWork"}:
                    results.append(item)
        except Exception:
            pass
    return results


def fetch_events() -> list[dict]:
    urls_to_try = [
        "https://mubi.com/pt/br/films",
        "https://mubi.com/pt/br/showing",
    ]

    soup: BeautifulSoup | None = None
    for url in urls_to_try:
        try:
            resp = requests.get(url, headers=_MUBI_HEADERS, timeout=30)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                break
        except Exception:
            continue

    if soup is None:
        return []

    events: list[dict] = []
    seen: set[str] = set()

    # Try JSON-LD first
    ld_films = _extract_json_ld_films(soup)
    for item in ld_films[:25]:
        title = (item.get("name") or "").strip()
        if len(title) < 3 or title in seen:
            continue
        seen.add(title)
        href = item.get("url", "https://mubi.com/pt/br/films")
        if not href.startswith("http"):
            href = f"https://mubi.com{href}"
        description = (item.get("description") or f"Filme no MUBI – {title}")[:400]
        director = item.get("director", {})
        director_name = ""
        if isinstance(director, dict):
            director_name = director.get("name", "")
        elif isinstance(director, list) and director:
            director_name = director[0].get("name", "")
        if director_name:
            description = f"Dir. {director_name}. {description}"
        date_str = item.get("datePublished") or item.get("dateCreated")
        tags = enrich_tags_from_title(title, ["mubi", "cinema", "film", "art-house", "intellectual", "streaming"])
        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description[:400],
                    "venue": "MUBI (Streaming)",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": None,
                    "category": "cinema",
                    "tags": tags,
                    "url": href,
                },
                source="mubi",
            )
        )
        if len(events) >= 25:
            return events

    # Fallback: parse film card links
    film_links = soup.select('a[href*="/films/"]')
    for link in film_links[:200]:
        href = link.get("href", "")
        if "/films/" not in href:
            continue
        if not href.startswith("http"):
            href = f"https://mubi.com{href}"
        href = href.split("?")[0]
        if href in seen:
            continue
        seen.add(href)

        # Title from img alt, heading, or link text
        img = link.find("img")
        title = ""
        if img:
            title = (img.get("alt") or "").strip()
        if not title:
            heading = link.find(re.compile(r"^h[1-6]$"))
            if heading:
                title = heading.get_text(strip=True)
        if not title:
            title = link.get_text(" ", strip=True).split("\n")[0].strip()

        if len(title) < 3:
            # Extract from URL slug
            slug = href.rstrip("/").split("/")[-1]
            title = " ".join(x.capitalize() for x in slug.replace("-", " ").split())

        if len(title) < 3 or title in seen:
            continue
        seen.add(title)

        tags = enrich_tags_from_title(title, ["mubi", "cinema", "film", "art-house", "intellectual", "streaming"])
        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": f"Filme disponível no MUBI – {title}",
                    "venue": "MUBI (Streaming)",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": None,
                    "category": "cinema",
                    "tags": tags,
                    "url": href,
                },
                source="mubi",
            )
        )
        if len(events) >= 25:
            break

    return events
