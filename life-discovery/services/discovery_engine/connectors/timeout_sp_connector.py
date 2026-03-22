"""
Time Out São Paulo connector.

Time Out is a global curated guide to the best things to do in cities.
Their SP edition covers restaurants, events, museums, nightlife, and weekend tips.

Scrapes:
- Restaurants: curated lists with ratings
- O que fazer: events and activities
- Cinema: movies guide
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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.timeout.com.br/",
}

_PAGES = [
    ("https://www.timeout.com.br/sao-paulo/restaurantes/melhores-restaurantes-sao-paulo", "restaurant"),
    ("https://www.timeout.com.br/sao-paulo/coisas-para-fazer/o-que-fazer-em-sao-paulo-este-fim-de-semana", "cultural"),
    ("https://www.timeout.com.br/sao-paulo/museus/melhores-museus-sao-paulo", "exhibition"),
    ("https://www.timeout.com.br/sao-paulo/filmes/filmes-em-cartaz-sao-paulo", "cinema"),
]


def _parse_price(text: str) -> float | None:
    if re.search(r"gratu[ií]to|free|gratuita|entrada livre", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def _extract_events_from_page(url: str, default_category: str) -> list[dict]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=25)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    page_events: list[dict] = []
    seen: set[str] = set()

    # JSON-LD first
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("@type", "")
                if item_type not in {"Event", "Restaurant", "Movie", "Museum", "TouristAttraction", "LocalBusiness"}:
                    continue
                title = (item.get("name") or "").strip()
                if not title or title in seen:
                    continue
                seen.add(title)
                href = item.get("url", url)
                if not href.startswith("http"):
                    href = f"https://www.timeout.com.br{href}"
                description = item.get("description", f"Recomendação Time Out SP – {title}")[:400]
                price = _parse_price(description)
                category = default_category
                if item_type == "Restaurant":
                    category = "restaurant"
                elif item_type == "Movie":
                    category = "cinema"

                # Location
                loc = item.get("address") or item.get("location") or {}
                venue = ""
                if isinstance(loc, dict):
                    venue = loc.get("streetAddress") or loc.get("name") or ""

                tags = enrich_tags_from_title(title, ["timeout", "curated", "recommended", category])
                page_events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": venue or "Sao Paulo",
                            "city": "Sao Paulo",
                            "date": item.get("startDate") or item.get("datePublished"),
                            "price": price,
                            "category": category,
                            "tags": tags,
                            "url": href,
                        },
                        source="timeout_sp",
                    )
                )
        except Exception:
            pass

    if page_events:
        return page_events

    # HTML fallback — Time Out uses structured article cards
    # Look for list items, numbered picks, card titles
    candidates = soup.select(
        "h3 a, h2 a, [class*='title'] a, [class*='card'] a, "
        "article a, .card-title, [itemprop='name']"
    )

    for link in candidates[:60]:
        if link.name != "a":
            link = link.find("a") or link
        if not hasattr(link, "get"):
            continue

        href = link.get("href", "")
        if not href.startswith("http"):
            href = f"https://www.timeout.com.br{href}"
        if "timeout.com" not in href:
            continue

        title = link.get_text(strip=True)
        if not title or len(title) < 5 or title in seen:
            continue
        seen.add(title)

        # Try to get description from surrounding context
        parent = link.parent
        description = ""
        if parent:
            p_tag = parent.find("p")
            if p_tag:
                description = p_tag.get_text(strip=True)[:400]
        description = description or f"Recomendação Time Out SP – {title}"

        price = _parse_price(description)
        tags = enrich_tags_from_title(title, ["timeout", "curated", "recommended", default_category])
        page_events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description,
                    "venue": "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": price,
                    "category": default_category,
                    "tags": tags,
                    "url": href,
                },
                source="timeout_sp",
            )
        )

    return page_events


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen_titles: set[str] = set()

    for url, category in _PAGES:
        page_events = _extract_events_from_page(url, category)
        for ev in page_events:
            title = ev.get("title", "")
            if title not in seen_titles:
                seen_titles.add(title)
                events.append(ev)
        if len(events) >= 60:
            break

    return events[:60]
