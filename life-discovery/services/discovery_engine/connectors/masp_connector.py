import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event


def _slug_to_title(url: str) -> str:
    slug = url.rstrip("/").split("/")[-1]
    return " ".join(x.capitalize() for x in slug.replace("-", " ").split())


def fetch_events() -> list[dict]:
    url = "https://masp.org.br/exposicoes"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select('a[href*="/exposicoes/"]')
    events: list[dict] = []
    seen: set[str] = set()

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

        text = _slug_to_title(href)

        events.append(
            normalize_event(
                {
                    "title": text[:140],
                    "description": "Exposição no MASP",
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
        if len(events) >= 40:
            break

    return events
