"""
SESC SP connector — São Paulo's largest cultural events network.

SESC (Serviço Social do Comércio) runs ~20 units in SP with thousands of
events/month: theater, cinema, music, dance, workshops, sports. Many are free.

Uses Playwright because the programming page is JS-rendered.
Fallback to requests + BeautifulSoup for lighter pages.
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

_URLS = [
    "https://www.sesc.com.br/programacao/",
    "https://www.sesc.com.br/servicos/agendas/",
]


def _parse_price(text: str) -> float | None:
    if re.search(r"gratu[ií]to|gratuita|entrada livre|acesso livre|sem cobran", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def _fetch_with_playwright(url: str) -> list[dict]:
    try:
        from playwright.sync_api import sync_playwright
        events = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(extra_http_headers=_HEADERS)
            page.goto(url, wait_until="networkidle", timeout=60000)

            # Try JSON-LD from rendered page
            ld_texts = page.evaluate("""
                () => Array.from(
                    document.querySelectorAll('script[type="application/ld+json"]')
                ).map(s => s.textContent)
            """)
            for raw in (ld_texts or []):
                try:
                    data = json.loads(raw)
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if isinstance(item, dict) and item.get("@type") in {"Event", "TheaterEvent", "MusicEvent"}:
                            events.append(item)
                except Exception:
                    pass

            if not events:
                # Extract event cards from DOM
                html = page.content()
                browser.close()
                return _parse_html(html)

            browser.close()
        return events  # JSON-LD dicts, handled by caller
    except Exception:
        return []


def _parse_html(html: str) -> list[dict]:
    """Parse SESC event cards from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    results = []
    seen: set[str] = set()

    candidates = soup.select(
        "article, .card, [class*='evento'], [class*='programacao'], "
        "[class*='activity'], [class*='atividade']"
    )
    if not candidates:
        candidates = soup.select("a[href*='/programacao/'], a[href*='/evento/']")

    for card in candidates[:60]:
        heading = card.find(re.compile(r"^h[1-6]$"))
        title = heading.get_text(strip=True) if heading else ""
        if not title:
            link = card.find("a", href=True)
            if link:
                title = link.get_text(strip=True)
        if not title:
            title = card.get_text(" ", strip=True).split("\n")[0].strip()

        if len(title) < 8 or title in seen:
            continue
        seen.add(title)

        href = ""
        link = card.find("a", href=True)
        if link:
            href = link.get("href", "")
            if not href.startswith("http"):
                href = f"https://www.sesc.com.br{href}"

        time_el = card.find("time")
        date_str = time_el.get("datetime", "") if time_el else ""

        full_text = card.get_text(" ", strip=True)
        price = _parse_price(full_text)
        description = full_text[:400] if len(full_text) > len(title) else f"Evento SESC SP – {title}"

        category = "cultural"
        if any(k in title.lower() for k in ["cinema", "filme", "movie"]):
            category = "cinema"
        elif any(k in title.lower() for k in ["restaurante", "gastronomia", "jantar"]):
            category = "restaurant"

        tags = enrich_tags_from_title(title, ["sesc", "cultural", "sao paulo"])

        results.append({
            "title": title[:140],
            "description": description,
            "venue": "SESC SP",
            "date": date_str or None,
            "price": price,
            "category": category,
            "tags": tags,
            "href": href,
        })

    return results


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for url in _URLS:
        raw_items: list[dict] = []

        # Try plain requests first (faster)
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=25)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # JSON-LD pass
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if isinstance(item, dict) and item.get("@type") in {"Event", "TheaterEvent", "MusicEvent", "ExhibitionEvent"}:
                            raw_items.append(item)
                except Exception:
                    pass

            if not raw_items:
                # HTML parse
                html_events = _parse_html(resp.text)
                for he in html_events:
                    title = he["title"]
                    if title in seen:
                        continue
                    seen.add(title)
                    events.append(
                        normalize_event(
                            {
                                "title": title,
                                "description": he["description"],
                                "venue": he["venue"],
                                "city": "Sao Paulo",
                                "date": he["date"],
                                "price": he["price"],
                                "category": he["category"],
                                "tags": he["tags"],
                                "url": he["href"],
                            },
                            source="sesc_sp",
                        )
                    )
        except Exception:
            # Fallback to Playwright
            raw_items_or_html = _fetch_with_playwright(url)
            if raw_items_or_html and isinstance(raw_items_or_html[0], dict) and "title" in raw_items_or_html[0]:
                # Got parsed HTML dicts
                for he in raw_items_or_html:
                    title = he.get("title", "")
                    if title in seen:
                        continue
                    seen.add(title)
                    events.append(
                        normalize_event(
                            {
                                "title": title,
                                "description": he.get("description", ""),
                                "venue": he.get("venue", "SESC SP"),
                                "city": "Sao Paulo",
                                "date": he.get("date"),
                                "price": he.get("price"),
                                "category": he.get("category", "cultural"),
                                "tags": he.get("tags", []),
                                "url": he.get("href", ""),
                            },
                            source="sesc_sp",
                        )
                    )
            else:
                raw_items = raw_items_or_html  # type: ignore[assignment]

        # Process JSON-LD items
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            title = (item.get("name") or "").strip()
            if not title or title in seen:
                continue
            seen.add(title)
            href = item.get("url", "https://www.sesc.com.br")
            date_str = item.get("startDate") or item.get("startTime")
            description = item.get("description", f"Evento SESC SP – {title}")[:400]
            loc = item.get("location", {})
            venue = (loc.get("name") or "SESC SP") if isinstance(loc, dict) else "SESC SP"
            price = _parse_price(description)
            tags = enrich_tags_from_title(title, ["sesc", "cultural", "sao paulo"])
            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description,
                        "venue": venue,
                        "city": "Sao Paulo",
                        "date": date_str,
                        "price": price,
                        "category": "cultural",
                        "tags": tags,
                        "url": href,
                    },
                    source="sesc_sp",
                )
            )

        if len(events) >= 40:
            break

    return events[:40]
