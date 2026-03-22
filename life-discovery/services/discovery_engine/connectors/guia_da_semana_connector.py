"""
Guia da Semana SP connector.

Guia da Semana (guiadasemana.com.br) is one of Brazil's oldest event guides
covering São Paulo. It lists concerts, exhibitions, theater, cinema, gastronomy,
and weekend activities with dates and prices.

Server-rendered — requests + BeautifulSoup.
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

_PAGES = [
    ("https://www.guiadasemana.com.br/sao-paulo/cultura-e-lazer/", "cultural"),
    ("https://www.guiadasemana.com.br/sao-paulo/restaurantes/", "restaurant"),
    ("https://www.guiadasemana.com.br/sao-paulo/shows-e-eventos/", "cultural"),
    ("https://www.guiadasemana.com.br/sao-paulo/exposicoes/", "exhibition"),
]


def _parse_price(text: str) -> float | None:
    if re.search(r"gratu[ií]to|gratuita|entrada livre|acesso livre", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def _fetch_page(url: str, default_category: str, seen: set) -> list[dict]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=25)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict] = []

    # JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict) or item.get("@type") not in {
                    "Event", "Restaurant", "ExhibitionEvent", "LocalBusiness"
                }:
                    continue
                title = (item.get("name") or "").strip()
                if not title or title in seen:
                    continue
                seen.add(title)
                href = item.get("url", url)
                if not href.startswith("http"):
                    href = f"https://www.guiadasemana.com.br{href}"
                description = item.get("description", f"Guia da Semana SP – {title}")[:400]
                date_str = item.get("startDate") or item.get("startTime")
                price = _parse_price(description)
                loc = item.get("address") or item.get("location") or {}
                venue = (loc.get("streetAddress") or loc.get("name") or "Sao Paulo") if isinstance(loc, dict) else "Sao Paulo"
                category = default_category
                if item.get("@type") == "Restaurant":
                    category = "restaurant"
                tags = enrich_tags_from_title(title, ["guia da semana", "sao paulo", category])
                results.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": venue,
                            "city": "Sao Paulo",
                            "date": date_str,
                            "price": price,
                            "category": category,
                            "tags": tags,
                            "url": href,
                        },
                        source="guia_da_semana",
                    )
                )
        except Exception:
            pass

    if results:
        return results

    # HTML fallback
    candidates = soup.select(
        "article, .card, [class*='event'], [class*='evento'], "
        "[class*='listing'], [class*='item'] a, h2 a, h3 a"
    )
    for card in candidates[:60]:
        if card.name == "a":
            href = card.get("href", "")
            title = card.get_text(strip=True)
        else:
            link = card.find("a", href=True)
            href = link.get("href", "") if link else ""
            heading = card.find(re.compile(r"^h[1-6]$"))
            title = heading.get_text(strip=True) if heading else card.get_text(" ", strip=True).split("\n")[0].strip()

        if not href.startswith("http"):
            href = f"https://www.guiadasemana.com.br{href}"
        if not title or len(title) < 5 or title in seen:
            continue
        seen.add(title)

        full_text = card.get_text(" ", strip=True) if card.name != "a" else title
        price = _parse_price(full_text)
        date_str = None
        time_el = card.find("time") if card.name != "a" else None
        if time_el:
            date_str = time_el.get("datetime")

        description = full_text[:400] if len(full_text) > len(title) + 5 else f"Guia da Semana SP – {title}"
        tags = enrich_tags_from_title(title, ["guia da semana", "sao paulo", default_category])
        results.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description,
                    "venue": "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": default_category,
                    "tags": tags,
                    "url": href,
                },
                source="guia_da_semana",
            )
        )
    return results


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for url, category in _PAGES:
        page_events = _fetch_page(url, category, seen)
        events.extend(page_events)
        if len(events) >= 50:
            break

    return events[:50]
