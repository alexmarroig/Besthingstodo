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
    url = "https://ims.com.br/programacao/sao-paulo/"
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
                if not isinstance(item, dict):
                    continue
                if item.get("@type") not in {"Event", "ExhibitionEvent"}:
                    continue
                title = (item.get("name") or "").strip()
                if len(title) < 8 or title in seen:
                    continue
                seen.add(title)
                href = item.get("url", "")
                date_str = item.get("startDate") or item.get("startTime")
                description = item.get("description", f"Programação IMS Paulista – {title}")[:300]
                tags = enrich_tags_from_title(title, ["ims", "cultural", "exhibition", "intimate", "quiet"])
                events.append(
                    normalize_event(
                        {
                            "title": title[:140],
                            "description": description,
                            "venue": "IMS Paulista",
                            "city": "Sao Paulo",
                            "date": date_str,
                            "price": _parse_price(description),
                            "category": "exhibition",
                            "tags": tags,
                            "url": href,
                        },
                        source="ims_paulista",
                    )
                )
                if len(events) >= 20:
                    return events
        except Exception:
            pass

    # Fallback: parse articles/cards
    candidates = soup.select(
        "article, .programacao-item, [class*='evento'], [class*='event'], [class*='programacao']"
    )
    if not candidates:
        candidates = soup.select("a[href*='ims.com.br'], a[href*='/programacao/']")

    for card in candidates[:100]:
        # Extract title - prefer heading elements
        heading = card.find(re.compile(r"^h[1-6]$"))
        title_text = ""
        if heading:
            title_text = heading.get_text(" ", strip=True)
        if not title_text:
            title_text = " ".join(card.get_text(" ", strip=True).split())

        if len(title_text) < 10:
            continue

        # Truncate to just the title portion (first 140 chars, first sentence)
        title = title_text.split(".")[0].split("\n")[0].strip()[:140]
        if title in seen:
            continue
        seen.add(title)

        # Extract URL
        href = card.get("href", "")
        link_el = card.find("a", href=True)
        if not href and link_el:
            href = link_el.get("href", "")
        if href and not href.startswith("http"):
            href = f"https://ims.com.br{href}"

        # Extract date from <time> element
        date_str = None
        time_el = card.find("time")
        if time_el:
            date_str = time_el.get("datetime") or time_el.get_text(strip=True)

        # Extract price from full text
        full_text = card.get_text(" ", strip=True)
        price = _parse_price(full_text)

        # Build description from card text (excluding the title)
        desc_text = full_text.replace(title, "").strip()[:300]
        description = desc_text or f"Programação IMS Paulista – {title}"

        tags = enrich_tags_from_title(title, ["ims", "cultural", "exhibition", "intimate", "quiet"])

        events.append(
            normalize_event(
                {
                    "title": title,
                    "description": description,
                    "venue": "IMS Paulista",
                    "city": "Sao Paulo",
                    "date": date_str,
                    "price": price,
                    "category": "exhibition",
                    "tags": tags,
                    "url": href,
                },
                source="ims_paulista",
            )
        )
        if len(events) >= 20:
            break

    return events
