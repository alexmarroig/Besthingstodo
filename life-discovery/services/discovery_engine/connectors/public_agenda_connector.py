import json
import re

import requests
from bs4 import BeautifulSoup

from ..normalize import normalize_event, enrich_tags_from_title


def _parse_price(text: str) -> float | None:
    if not text:
        return None
    if re.search(r"gratu[ií]to|free|gratuita|entrada livre", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    url = "https://www.prefeitura.sp.gov.br/cidade/secretarias/cultura"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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

    # Try JSON-LD structured data
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict) or item.get("@type") != "Event":
                    continue
                title = (item.get("name") or "").strip()
                if len(title) < 8 or title in seen:
                    continue
                seen.add(title)
                href = item.get("url", "")
                date_str = item.get("startDate") or item.get("startTime")
                description = item.get("description", f"Agenda cultural da Prefeitura SP – {title}")[:300]
                location = item.get("location", {})
                venue = ""
                if isinstance(location, dict):
                    venue = location.get("name", "")
                tags = enrich_tags_from_title(title, ["cultural", "agenda", "prefeitura", "gratuito"])
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": venue or "Sao Paulo",
                            "city": "Sao Paulo",
                            "date": date_str,
                            "price": _parse_price(description),
                            "category": "cultural",
                            "tags": tags,
                            "url": href,
                        },
                        source="public_agenda",
                    )
                )
                if len(events) >= 10:
                    return events
        except Exception:
            pass

    # Fallback: parse articles and links with event-related content
    candidates = soup.select("article, .evento, [class*='event'], [class*='agenda']")
    if not candidates:
        candidates = soup.select("a")

    for el in candidates[:60]:
        txt = " ".join(el.get_text(" ", strip=True).split())
        href = el.get("href", "")
        if not href and el.name != "a":
            link = el.find("a", href=True)
            if link:
                href = link.get("href", "")
                txt = txt or " ".join(link.get_text(" ", strip=True).split())
        if len(txt) < 12:
            continue
        if txt in seen:
            continue
        seen.add(txt)

        if not href.startswith("http"):
            href = f"https://www.prefeitura.sp.gov.br{href}" if href else ""

        # Extract date from time element
        date_str = None
        time_el = el.find("time")
        if time_el:
            date_str = time_el.get("datetime") or time_el.get_text(strip=True)

        price = _parse_price(txt)
        title = txt.split(".")[0].strip()[:140]
        tags = enrich_tags_from_title(title, ["cultural", "agenda", "prefeitura"])

        events.append(
            normalize_event(
                {
                    "title": title,
                    "description": f"Agenda cultural da Prefeitura de São Paulo – {title}",
                    "category": "cultural",
                    "city": "Sao Paulo",
                    "venue": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "tags": tags,
                    "url": href,
                },
                source="public_agenda",
            )
        )
        if len(events) >= 10:
            break

    return events
