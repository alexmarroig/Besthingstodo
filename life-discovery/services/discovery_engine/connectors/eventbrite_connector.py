import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event


def fetch_events() -> list[dict]:
    url = "https://www.eventbrite.com/d/brazil--sao-paulo/events/"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("a.event-card-link, a")
    events: list[dict] = []

    for card in cards[:120]:
        title = card.get_text(" ", strip=True)
        href = card.get("href", "")
        if len(title) < 16:
            continue
        if "eventbrite" not in href:
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
        if len(events) >= 30:
            break

    return events
