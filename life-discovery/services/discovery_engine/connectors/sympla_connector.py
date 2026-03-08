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
    links = soup.select('a[href*="/evento/"]')
    events: list[dict] = []
    seen: set[str] = set()

    for link in links:
        href = link.get("href", "")
        text = " ".join(link.get_text(" ", strip=True).split())
        if "/evento/" not in href:
            continue
        if href in seen:
            continue
        seen.add(href)

        if len(text) < 8:
            continue

        if "Local a definir" in text:
            venue = "Sao Paulo"
        else:
            venue = "Sao Paulo"

        events.append(
            normalize_event(
                {
                    "title": text[:140],
                    "description": "Evento encontrado no Sympla Sao Paulo",
                    "venue": venue,
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
        if len(events) >= 40:
            break

    return events
