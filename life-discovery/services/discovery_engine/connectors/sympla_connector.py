import json
import re

import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event, enrich_tags_from_title


def _extract_json_ld_events(soup: BeautifulSoup) -> list[dict]:
    results = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict) and item.get("@type") == "Event":
                    results.append(item)
                elif isinstance(item, dict) and "@graph" in item:
                    results.extend(
                        x for x in item["@graph"]
                        if isinstance(x, dict) and x.get("@type") == "Event"
                    )
        except Exception:
            pass
    return results


def _parse_price(text: str) -> float | None:
    if not text:
        return None
    if re.search(r"gratu[ií]to|free|gratuita", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    url = "https://www.sympla.com.br/eventos/sao-paulo-sp"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Linux; Android 11; Pixel 5) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Mobile Safari/537.36"
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

    # --- Try JSON-LD first ---
    ld_events = _extract_json_ld_events(soup)
    for item in ld_events[:40]:
        title = (item.get("name") or "").strip()
        if len(title) < 8:
            continue
        href = item.get("url", "")
        if not href.startswith("http"):
            href = f"https://www.sympla.com.br{href}"
        if href in seen:
            continue
        seen.add(href)

        location = item.get("location", {})
        venue = ""
        if isinstance(location, dict):
            venue = (
                location.get("name")
                or (location.get("address") or {}).get("streetAddress", "")
            )

        date_str = item.get("startDate")
        offers = item.get("offers", {})
        price = None
        if isinstance(offers, dict):
            price = offers.get("price")
        elif isinstance(offers, list) and offers:
            price = offers[0].get("price")

        description = item.get("description", f"Evento no Sympla – {title}")[:300]
        tags = enrich_tags_from_title(title, ["sympla", "event"])

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": description,
                    "venue": venue or "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": "event",
                    "tags": tags,
                    "url": href,
                },
                source="sympla",
            )
        )
        if len(events) >= 40:
            return events

    # --- Fallback: HTML link extraction with metadata ---
    links = soup.select('a[href*="/evento/"]')
    for link in links:
        href = link.get("href", "")
        if "/evento/" not in href:
            continue
        if not href.startswith("http"):
            href = f"https://www.sympla.com.br{href}"
        if href in seen:
            continue
        seen.add(href)

        text = " ".join(link.get_text(" ", strip=True).split())
        if len(text) < 8:
            continue

        # Try to extract date from sibling time element
        date_str = None
        time_el = link.find("time") or (link.parent and link.parent.find("time"))
        if time_el:
            date_str = time_el.get("datetime") or time_el.get_text(strip=True)

        # Try to extract venue
        venue = "Sao Paulo"
        venue_el = link.select_one("[class*='local'], [class*='location'], [class*='venue']")
        if not venue_el and link.parent:
            venue_el = link.parent.select_one("[class*='local'], [class*='location']")
        if venue_el:
            v = venue_el.get_text(strip=True)
            if v and len(v) > 3 and "local a definir" not in v.lower():
                venue = v[:80]

        # Price from surrounding text
        price_text = link.parent.get_text(" ", strip=True) if link.parent else ""
        price = _parse_price(price_text)

        tags = enrich_tags_from_title(text, ["sympla", "event"])

        events.append(
            normalize_event(
                {
                    "title": text[:140],
                    "description": f"Evento no Sympla São Paulo – {text}",
                    "venue": venue,
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": "event",
                    "tags": tags,
                    "url": href,
                },
                source="sympla",
            )
        )
        if len(events) >= 40:
            break

    return events
