import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event


def _title_from_href(href: str) -> str:
    if "/e/" not in href:
        return ""
    try:
        slug = href.split("/e/", 1)[1].split("-tickets-", 1)[0]
        return " ".join(x.capitalize() for x in slug.replace("-", " ").split())
    except Exception:
        return ""


def fetch_events() -> list[dict]:
    url = "https://www.eventbrite.com/d/brazil--s%C3%A3o-paulo/all-events/"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select('a[href*="/e/"]')
    events: list[dict] = []
    seen: set[str] = set()

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

        events.append(
            normalize_event(
                {
                    "title": title[:140],
                    "description": "Evento encontrado no Eventbrite Sao Paulo",
                    "venue": "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": None,
                    "category": "event",
                    "tags": ["eventbrite", "event", "cultural"],
                    "url": href,
                },
                source="eventbrite",
            )
        )
        if len(events) >= 40:
            break

    return events
