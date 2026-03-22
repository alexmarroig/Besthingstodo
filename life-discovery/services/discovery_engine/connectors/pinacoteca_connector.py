"""
Pinacoteca do Estado de SP connector.

One of Brazil's oldest and most important art museums.
Site is server-rendered — plain requests + BeautifulSoup works.
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
    ("https://pinacoteca.org.br/programacao/", "exhibition"),
    ("https://pinacoteca.org.br/visita/exposicoes-em-cartaz/", "exhibition"),
]


def _parse_price(text: str) -> float | None:
    if re.search(r"gratu[ií]to|gratuita|entrada livre|acesso gratuito", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()

    for url, default_category in _URLS:
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=25)
            resp.raise_for_status()
        except Exception:
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        # JSON-LD first
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if not isinstance(item, dict) or item.get("@type") not in {
                        "Event", "ExhibitionEvent", "VisualArtwork"
                    }:
                        continue
                    title = (item.get("name") or "").strip()
                    if not title or title in seen:
                        continue
                    seen.add(title)
                    href = item.get("url", url)
                    if not href.startswith("http"):
                        href = f"https://pinacoteca.org.br{href}"
                    date_str = item.get("startDate") or item.get("startTime")
                    description = item.get("description", f"Exposição na Pinacoteca SP – {title}")[:400]
                    price = _parse_price(description)
                    tags = enrich_tags_from_title(
                        title, ["pinacoteca", "museum", "art", "exhibition", "cultural", "quiet", "intimate"]
                    )
                    events.append(
                        normalize_event(
                            {
                                "title": title[:140],
                                "description": description,
                                "venue": "Pinacoteca do Estado de SP",
                                "city": "Sao Paulo",
                                "date": date_str,
                                "price": price,
                                "category": "exhibition",
                                "tags": tags,
                                "url": href,
                            },
                            source="pinacoteca",
                        )
                    )
                    if len(events) >= 20:
                        return events
            except Exception:
                pass

        # HTML fallback — look for exhibition/event cards
        candidates = soup.select(
            "[class*='exposicao'], [class*='exposição'], [class*='exhibition'], "
            "[class*='event'], article, .card, [class*='programacao']"
        )
        if not candidates:
            candidates = soup.select("a[href*='/programacao'], a[href*='/exposicoes']")

        for card in candidates[:50]:
            heading = card.find(re.compile(r"^h[1-6]$"))
            title = heading.get_text(strip=True) if heading else ""
            if not title:
                img = card.find("img")
                title = img.get("alt", "").strip() if img else ""
            if not title:
                title = card.get_text(" ", strip=True).split("\n")[0].strip()

            if len(title) < 6 or title in seen:
                continue
            seen.add(title)

            href = ""
            link = card.find("a", href=True)
            if link:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://pinacoteca.org.br{href}"

            time_el = card.find("time")
            date_str = time_el.get("datetime") if time_el else None

            full_text = card.get_text(" ", strip=True)
            price = _parse_price(full_text)
            description = full_text[:400] if len(full_text) > len(title) + 5 else f"Exposição na Pinacoteca SP – {title}"

            tags = enrich_tags_from_title(
                title, ["pinacoteca", "museum", "art", "exhibition", "cultural", "quiet", "intimate"]
            )
            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description,
                        "venue": "Pinacoteca do Estado de SP",
                        "city": "Sao Paulo",
                        "date": date_str,
                        "price": price,
                        "category": "exhibition",
                        "tags": tags,
                        "url": href or url,
                    },
                    source="pinacoteca",
                )
            )
            if len(events) >= 20:
                return events

    return events
