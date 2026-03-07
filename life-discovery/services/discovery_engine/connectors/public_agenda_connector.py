import requests
from bs4 import BeautifulSoup

from .normalize import normalize_event


def fetch_events() -> list[dict]:
    url = "https://www.prefeitura.sp.gov.br/cidade/secretarias/cultura"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    links = soup.select("a")
    events = []
    for a in links[:50]:
        txt = a.get_text(" ", strip=True)
        href = a.get("href", "")
        if len(txt) < 12:
            continue
        events.append(
            normalize_event(
                {
                    "title": txt[:120],
                    "description": "Public cultural agenda item",
                    "category": "cultural",
                    "city": "Sao Paulo",
                    "location": "Sao Paulo",
                    "tags": ["cultural", "agenda"],
                    "url": href,
                },
                source="public_agenda",
            )
        )
        if len(events) >= 10:
            break

    return events
