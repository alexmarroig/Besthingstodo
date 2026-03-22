import json
import re

import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event, enrich_tags_from_title


def _slug_to_title(url: str) -> str:
    slug = url.rstrip("/").split("/")[-1]
    return " ".join(x.capitalize() for x in slug.replace("-", " ").split())


def _parse_price(text: str) -> float | None:
    if not text:
        return None
    if re.search(r"gratu[ií]to|free|gratuita|entrada livre|acesso gratuito", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    url = "https://masp.org.br/exposicoes"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "pt-BR,pt;q=0.9",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    events: list[dict] = []
    seen: set[str] = set()

    # Try JSON-LD structured data
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                if item.get("@type") not in {"Event", "ExhibitionEvent", "VisualArtwork"}:
                    continue
                title = (item.get("name") or "").strip()
                if len(title) < 8 or title in seen:
                    continue
                seen.add(title)
                href = item.get("url", "")
                if href and not href.startswith("http"):
                    href = f"https://masp.org.br{href}"
                date_str = item.get("startDate") or item.get("startTime")
                description = item.get("description", f"Exposição no MASP – {title}")[:300]
                offers = item.get("offers", {})
                price = None
                if isinstance(offers, dict):
                    price = _parse_price(str(offers.get("price", "")))
                elif isinstance(offers, list) and offers:
                    price = _parse_price(str(offers[0].get("price", "")))
                if price is None:
                    price = _parse_price(description)
                tags = enrich_tags_from_title(title, ["masp", "museum", "exhibition", "cultural", "art"])
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": "MASP",
                            "city": "Sao Paulo",
                            "date": date_str,
                            "price": price,
                            "category": "exhibition",
                            "tags": tags,
                            "url": href,
                        },
                        source="masp",
                    )
                )
                if len(events) >= 40:
                    return events
        except Exception:
            pass

    # Fallback: extract from exposition cards with metadata
    cards = soup.select('a[href*="/exposicoes/"]')
    for card in cards[:200]:
        href = card.get("href", "")
        if not href or "/exposicoes/" not in href:
            continue
        if href.startswith("/"):
            href = f"https://masp.org.br{href}"
        href = href.split("#")[0].rstrip("/")
        if href in seen:
            continue
        seen.add(href)
        if href.endswith("/exposicoes"):
            continue

        # Try to get title from card content, fallback to slug
        card_text = card.get_text(" ", strip=True)
        title = " ".join(card_text.split())[:140] if len(card_text) > 8 else _slug_to_title(href)
        if not title or len(title) < 5:
            title = _slug_to_title(href)

        # Extract date from time element
        date_str = None
        time_el = card.find("time")
        if time_el:
            date_str = time_el.get("datetime") or time_el.get_text(strip=True)

        # Check for price in surrounding text
        full_text = card.get_text(" ", strip=True)
        price = _parse_price(full_text)
        # MASP generally charges admission
        if price is None:
            price = None  # leave as None; will be shown as "check site"

        # Build description
        img = card.find("img")
        img_alt = img.get("alt", "") if img else ""
        description = img_alt or f"Exposição no MASP – {title}"

        tags = enrich_tags_from_title(title, ["masp", "museum", "exhibition", "cultural", "art"])

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description[:300],
                    "venue": "MASP",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": "exhibition",
                    "tags": tags,
                    "url": href,
                },
                source="masp",
            )
        )
        if len(events) >= 40:
            break

    return events
