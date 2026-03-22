"""
Veja SP connector — Veja's curated São Paulo guide.

Veja SP (veja.abril.com.br/guia) is one of Brazil's most respected sources
for restaurant and cinema guides in São Paulo. The "Comer & Beber" section
lists the best restaurants with editorial ratings.

Sources:
- Veja SP Comer & Beber (restaurants)
- Veja SP Cinema (movies in theaters)
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
    "Referer": "https://veja.abril.com.br/",
}

_PAGES = [
    ("https://veja.abril.com.br/guia/restaurantes/", "restaurant"),
    ("https://veja.abril.com.br/guia/bares/", "restaurant"),
    ("https://veja.abril.com.br/guia/cinema/", "cinema"),
    ("https://veja.abril.com.br/guia/teatro/", "cultural"),
    ("https://veja.abril.com.br/guia/exposicoes/", "exhibition"),
]

_CUISINE_TAG_MAP = {
    "italiana": ["italian", "pasta"],
    "japonesa": ["japanese", "sushi", "asian"],
    "brasileira": ["brazilian", "traditional"],
    "francesa": ["french"],
    "contemporânea": ["contemporary", "upscale"],
    "hambúrguer": ["burger", "casual"],
    "pizza": ["pizza", "italian"],
    "frutos do mar": ["seafood", "fish"],
    "churrasco": ["bbq", "churrasco", "meat"],
    "vegetariana": ["vegetarian", "vegan", "healthy"],
    "peruana": ["peruvian", "latin"],
    "americana": ["american"],
    "árabe": ["arabic", "middle eastern"],
    "bistrô": ["bistro", "french", "cozy"],
    "sushi": ["sushi", "japanese", "asian"],
}


def _parse_price(text: str) -> float | None:
    if re.search(r"gratu[ií]to|gratuita|entrada livre", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def _cuisine_to_tags(text: str) -> list[str]:
    tags: set[str] = set()
    lower = text.lower()
    for cuisine, new_tags in _CUISINE_TAG_MAP.items():
        if cuisine in lower:
            tags.update(new_tags)
    return sorted(tags)


def _fetch_page(url: str, default_category: str, seen: set) -> list[dict]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=25)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict] = []

    # JSON-LD first
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("@type", "")
                if item_type not in {"Restaurant", "Movie", "Event", "LocalBusiness", "FoodEstablishment"}:
                    continue
                title = (item.get("name") or "").strip()
                if not title or title in seen:
                    continue
                seen.add(title)

                href = item.get("url", url)
                if not href.startswith("http"):
                    href = f"https://veja.abril.com.br{href}"

                description = item.get("description", f"Guia Veja SP – {title}")[:400]
                price = _parse_price(description)

                # Rating
                rating = item.get("aggregateRating", {})
                rating_val = rating.get("ratingValue") if isinstance(rating, dict) else None

                # Cuisine
                cuisine = item.get("servesCuisine") or ""
                if isinstance(cuisine, list):
                    cuisine = " ".join(cuisine)
                cuisine_tags = _cuisine_to_tags(cuisine)

                base_tags = ["veja sp", "curated", "editorial"] + cuisine_tags
                if rating_val and float(rating_val) >= 4.0:
                    base_tags.append("top rated")
                tags = enrich_tags_from_title(title, base_tags)

                # Venue address
                address = item.get("address") or {}
                venue = ""
                if isinstance(address, dict):
                    venue = address.get("streetAddress") or address.get("addressLocality") or ""

                results.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": venue or "Sao Paulo",
                            "city": "Sao Paulo",
                            "date": item.get("startDate"),
                            "price": price,
                            "category": "restaurant" if item_type in {"Restaurant", "FoodEstablishment", "LocalBusiness"} else default_category,
                            "tags": tags,
                            "url": href,
                        },
                        source="veja_sp",
                    )
                )
        except Exception:
            pass

    if results:
        return results

    # HTML fallback — Veja SP uses structured article cards
    candidates = soup.select(
        "article, .card, [class*='restaurante'], [class*='listing'], "
        "[class*='item'], h2 a, h3 a, .titulo a"
    )
    for card in candidates[:60]:
        if card.name == "a":
            href = card.get("href", "")
            title = card.get_text(strip=True)
        else:
            link = card.find("a", href=True)
            href = link.get("href", "") if link else ""
            heading = card.find(re.compile(r"^h[1-6]$"))
            title = heading.get_text(strip=True) if heading else ""
            if not title and link:
                title = link.get_text(strip=True)

        if not href.startswith("http"):
            href = f"https://veja.abril.com.br{href}"
        if not title or len(title) < 5 or title in seen:
            continue
        seen.add(title)

        full_text = card.get_text(" ", strip=True) if card.name != "a" else ""
        price = _parse_price(full_text)
        cuisine_tags = _cuisine_to_tags(full_text)
        description = full_text[:400] if len(full_text) > len(title) + 5 else f"Guia Veja SP – {title}"

        tags = enrich_tags_from_title(title, ["veja sp", "curated", "editorial"] + cuisine_tags)
        results.append(
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
                source="veja_sp",
            )
        )

    return results


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for url, category in _PAGES:
        page_events = _fetch_page(url, category, seen)
        events.extend(page_events)
        if len(events) >= 60:
            break

    return events[:60]
