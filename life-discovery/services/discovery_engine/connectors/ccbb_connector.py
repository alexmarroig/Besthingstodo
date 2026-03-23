"""
CCBB SP (Centro Cultural Banco do Brasil – São Paulo) connector.

One of SP's most prestigious cultural centers with free/low-cost exhibitions,
theater, cinema, and events. Excellent for couple's intellectual profile.
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
    "https://culturabancodobrasil.com.br/portal/sao-paulo/",
    "https://culturabancodobrasil.com.br/portal/sao-paulo/programacao/",
]

_BASE_TAGS = ["ccbb", "banco do brasil", "cultural", "exhibition", "art", "free", "gratuito"]


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

    for url in _URLS:
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
                        "Event", "ExhibitionEvent", "TheaterEvent", "ScreeningEvent"
                    }:
                        continue
                    title = (item.get("name") or "").strip()
                    if not title or title in seen:
                        continue
                    seen.add(title)
                    href = item.get("url", url)
                    if not href.startswith("http"):
                        href = f"https://culturabancodobrasil.com.br{href}"
                    date_str = item.get("startDate") or item.get("startTime")
                    description = item.get("description", f"Evento CCBB SP – {title}")[:400]
                    price = _parse_price(description)
                    if price is None:
                        price = 0.0  # CCBB events are predominantly free
                    tags = enrich_tags_from_title(title, _BASE_TAGS)
                    events.append(
                        normalize_event(
                            {
                                "title": title[:140],
                                "description": description,
                                "venue": "CCBB SP – Centro Cultural Banco do Brasil",
                                "city": "Sao Paulo",
                                "date": date_str,
                                "price": price,
                                "category": "exhibition",
                                "tags": tags,
                                "url": href,
                            },
                            source="ccbb_sp",
                        )
                    )
                    if len(events) >= 20:
                        return events
            except Exception:
                pass

        # HTML fallback
        candidates = soup.select(
            "article, .card, .event-card, [class*='programacao'], [class*='exposicao'], "
            "[class*='evento'], [class*='atividade']"
        )
        if not candidates:
            candidates = soup.select("a[href*='/portal/sao-paulo/']")

        for card in candidates[:60]:
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
                    href = f"https://culturabancodobrasil.com.br{href}"

            time_el = card.find("time")
            date_str = time_el.get("datetime") if time_el else None
            full_text = card.get_text(" ", strip=True)
            price = _parse_price(full_text)
            if price is None:
                price = 0.0

            description = full_text[:400] if len(full_text) > len(title) + 5 else f"Evento CCBB SP – {title}"
            tags = enrich_tags_from_title(title, _BASE_TAGS)

            events.append(
                normalize_event(
                    {
                        "title": title[:140],
                        "description": description,
                        "venue": "CCBB SP – Centro Cultural Banco do Brasil",
                        "city": "Sao Paulo",
                        "date": date_str,
                        "price": price,
                        "category": "exhibition",
                        "tags": tags,
                        "url": href or url,
                    },
                    source="ccbb_sp",
                )
            )
            if len(events) >= 20:
                return events

    return events
