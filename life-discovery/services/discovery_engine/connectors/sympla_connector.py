import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event


def fetch_events() -> list[dict]:
    url = "https://www.sympla.com.br/eventos/sao-paulo-sp"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    links = soup.select("a")
    events: list[dict] = []

    for link in links:
        href = link.get("href", "")
        text = link.get_text(" ", strip=True)
        if "sympla.com.br/evento" not in href:
            continue
        if len(text) < 12:
            continue
        events.append(
            normalize_event(
                {
                    "title": text[:140],
                    "description": "Evento encontrado no Sympla Sao Paulo",
                    "venue": "Sao Paulo",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": None,
                    "category": "event",
                    "tags": ["sympla", "event", "cultural"],
                    "url": href,
                },
                source="sympla",
            )
        )
        if len(events) >= 30:
            break

    return events
