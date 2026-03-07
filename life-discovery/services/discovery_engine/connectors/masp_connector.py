import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event


def fetch_events() -> list[dict]:
    url = "https://masp.org.br/exposicoes"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("article, .card, .exhibition-item, a")
    events: list[dict] = []

    for card in cards[:80]:
        text = card.get_text(" ", strip=True)
        if len(text) < 16:
            continue
        href = card.get("href", "")
        events.append(
            normalize_event(
                {
                    "title": text[:140],
                    "description": "Programacao cultural MASP",
                    "venue": "MASP",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": None,
                    "category": "exhibition",
                    "tags": ["masp", "museum", "exhibition", "cultural"],
                    "url": href,
                },
                source="masp",
            )
        )
        if len(events) >= 20:
            break

    return events
