import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event


def fetch_events() -> list[dict]:
    url = "https://ims.com.br/programacao/sao-paulo/"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("article, .programacao-item, a")
    events: list[dict] = []

    for card in cards[:100]:
        text = card.get_text(" ", strip=True)
        if len(text) < 16:
            continue
        href = card.get("href", "")
        events.append(
            normalize_event(
                {
                    "title": text[:140],
                    "description": "Programacao IMS Paulista",
                    "venue": "IMS Paulista",
                    "city": "Sao Paulo",
                    "date": None,
                    "price": None,
                    "category": "cultural",
                    "tags": ["ims", "cultural", "talk", "exhibition"],
                    "url": href,
                },
                source="ims_paulista",
            )
        )
        if len(events) >= 20:
            break

    return events
