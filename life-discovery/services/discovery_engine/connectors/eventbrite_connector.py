import json
import re

import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event, enrich_tags_from_title


def _title_from_href(href: str) -> str:
    if "/e/" not in href:
        return ""
    try:
        slug = href.split("/e/", 1)[1].split("-tickets-", 1)[0]
        return " ".join(x.capitalize() for x in slug.replace("-", " ").split())
    except Exception:
        return ""


def _extract_json_ld_events(soup: BeautifulSoup) -> list[dict]:
    """Extract events from JSON-LD structured data embedded in the page."""
    results = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                if data.get("@type") == "Event":
                    items = [data]
                elif "@graph" in data:
                    items = data["@graph"]
            for item in items:
                if isinstance(item, dict) and item.get("@type") == "Event":
                    results.append(item)
        except Exception:
            pass
    return results


def _parse_price_from_text(text: str) -> float | None:
    if not text:
        return None
    if re.search(r"gratu[ií]to|free|gratuita", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    url = "https://www.eventbrite.com/d/brazil--s%C3%A3o-paulo/all-events/"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
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

    # --- Try JSON-LD structured data first (most reliable) ---
    ld_events = _extract_json_ld_events(soup)
    for item in ld_events[:40]:
        title = item.get("name", "").strip()
        if len(title) < 8:
            continue
        href = item.get("url", "")
        if href in seen:
            continue
        seen.add(href)

        location = item.get("location", {})
        venue = ""
        if isinstance(location, dict):
            venue = location.get("name", "") or location.get("address", {}).get("streetAddress", "")

        date_str = item.get("startDate") or item.get("startTime")
        offers = item.get("offers", {})
        price_str = offers.get("price") if isinstance(offers, dict) else None
        if price_str is None and isinstance(offers, list) and offers:
            price_str = offers[0].get("price")

        description = item.get("description", f"Evento no Eventbrite – {title}")[:300]
        base_tags = ["eventbrite", "event"]
        tags = enrich_tags_from_title(title, base_tags)

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description,
                    "venue": venue or "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price_str,
                    "category": "event",
                    "tags": tags,
                    "url": href,
                },
                source="eventbrite",
            )
        )
        if len(events) >= 40:
            return events

    # --- Fallback: HTML link extraction with enhanced metadata ---
    cards = soup.select('a[href*="/e/"]')
    for card in cards[:300]:
        title = " ".join(card.get_text(" ", strip=True).split())
        href = card.get("href", "")
        if not href or "/e/" not in href:
            continue
        if "eventbrite" not in href.lower():
            continue
        if "aff=" in href:
            href = href.split("?")[0]
        if href in seen:
            continue
        seen.add(href)
        if len(title) < 8:
            title = _title_from_href(href)
        if len(title) < 8:
            continue
        if "event marketing platform" in title.lower():
            continue

        # Extract date from sibling elements or data attributes
        date_str = None
        time_el = card.find("time")
        if time_el:
            date_str = time_el.get("datetime") or time_el.get_text(strip=True)

        # Extract price from surrounding context
        parent = card.parent
        price = None
        if parent:
            price_text = parent.get_text(" ", strip=True)
            price = _parse_price_from_text(price_text)

        # Extract venue from card subtext
        venue = "Sao Paulo"
        sub = card.select_one(".location, .venue, [class*='location'], [class*='venue']")
        if sub:
            venue_text = sub.get_text(strip=True)
            if venue_text and len(venue_text) > 3:
                venue = venue_text[:80]

        base_tags = ["eventbrite", "event"]
        tags = enrich_tags_from_title(title, base_tags)

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": f"Evento no Eventbrite São Paulo – {title}",
                    "venue": venue,
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": "event",
                    "tags": tags,
                    "url": href,
                },
                source="eventbrite",
            )
        )
        if len(events) >= 40:
            break

    return events
