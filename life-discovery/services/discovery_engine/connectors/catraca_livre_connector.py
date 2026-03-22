"""
Catraca Livre connector — SP free and low-cost cultural events.

Catraca Livre is Brazil's leading platform for free events and activities.
It publishes a standard RSS/Atom feed and has server-rendered HTML pages.
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
    "Referer": "https://catracalivre.com.br/",
}

_RSS_URL = "https://catracalivre.com.br/feed/"
_AGENDA_URL = "https://catracalivre.com.br/sp/agenda/"


def _parse_rss(url: str) -> list[dict]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "xml")
        return soup.find_all("item")
    except Exception:
        return []


def _parse_price(text: str) -> float | None:
    if not text:
        return None
    if re.search(r"gratu[ií]to|free|gratuita|entrada livre|sem cobran", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    # --- Try RSS feed first ---
    rss_items = _parse_rss(_RSS_URL)
    for item in rss_items[:30]:
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description") or item.find("content:encoded")
        pub_el = item.find("pubDate") or item.find("dc:date")

        title = title_el.get_text(strip=True) if title_el else ""
        if not title or title in seen:
            continue
        # Skip non-SP or non-event items
        skip_kw = ["brasil", "nacional", "internacional", "politica", "política"]
        if any(k in title.lower() for k in skip_kw):
            continue
        seen.add(title)

        href = link_el.get_text(strip=True) if link_el else ""
        if not href and link_el:
            href = link_el.get("href", "")

        raw_desc = desc_el.get_text(" ", strip=True) if desc_el else ""
        description = re.sub(r"\s+", " ", raw_desc)[:400]
        date_str = pub_el.get_text(strip=True) if pub_el else None
        price = _parse_price(description + " " + title)
        if price is None and ("gratu" in title.lower() or "livre" in title.lower()):
            price = 0.0

        tags = enrich_tags_from_title(title, ["catraca livre", "free", "cultural", "sao paulo"])
        if price == 0.0:
            tags = sorted(set(tags) | {"gratis", "free", "gratuito"})

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description,
                    "venue": "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": "cultural",
                    "tags": tags,
                    "url": href,
                },
                source="catraca_livre",
            )
        )
        if len(events) >= 30:
            return events

    # --- Fallback: scrape agenda page ---
    if len(events) < 10:
        try:
            resp = requests.get(_AGENDA_URL, headers=_HEADERS, timeout=25)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Try JSON-LD
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if not isinstance(item, dict) or item.get("@type") != "Event":
                            continue
                        title = (item.get("name") or "").strip()
                        if not title or title in seen:
                            continue
                        seen.add(title)
                        href = item.get("url", _AGENDA_URL)
                        date_str = item.get("startDate")
                        loc = item.get("location", {})
                        venue = (loc.get("name") or "Sao Paulo") if isinstance(loc, dict) else "Sao Paulo"
                        description = (item.get("description") or f"Evento gratuito – {title}")[:400]
                        price = _parse_price(description)
                        tags = enrich_tags_from_title(title, ["catraca livre", "free", "cultural"])
                        events.append(
                            normalize_event(
                                {
                                    "title": title[:140],
                                    "description": description,
                                    "venue": venue,
                                    "city": "Sao Paulo",
                                    "date": date_str,
                                    "price": price if price is not None else 0.0,
                                    "category": "cultural",
                                    "tags": tags,
                                    "url": href,
                                },
                                source="catraca_livre",
                            )
                        )
                        if len(events) >= 30:
                            return events
                except Exception:
                    pass

            # HTML fallback
            cards = soup.select("article, .event-card, [class*='agenda-item'], h2 a, h3 a")
            for card in cards[:50]:
                if card.name == "a":
                    title = card.get_text(strip=True)
                    href = card.get("href", "")
                else:
                    link = card.find("a", href=True)
                    title = card.find(re.compile(r"^h[1-6]$"))
                    title = title.get_text(strip=True) if title else card.get_text(" ", strip=True).split("\n")[0]
                    href = link.get("href", "") if link else ""

                if not href.startswith("http"):
                    href = f"https://catracalivre.com.br{href}"
                if not title or len(title) < 8 or title in seen:
                    continue
                seen.add(title)

                description = card.get_text(" ", strip=True)[:300] if card.name != "a" else f"Evento – {title}"
                price = _parse_price(description + " " + title)
                if price is None:
                    price = 0.0  # Catraca Livre specializes in free events

                tags = enrich_tags_from_title(title, ["catraca livre", "free", "gratis", "cultural"])
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": "Sao Paulo",
                            "city": "Sao Paulo",
                            "date": None,
                            "price": price,
                            "category": "cultural",
                            "tags": tags,
                            "url": href,
                        },
                        source="catraca_livre",
                    )
                )
                if len(events) >= 30:
                    break
        except Exception:
            pass

    return events
