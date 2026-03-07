import re
from datetime import datetime
from typing import Any

import requests
from dateutil import parser

VENUE_COORDS: dict[str, tuple[float, float]] = {
    "masp": (-23.561399, -46.655881),
    "ims paulista": (-23.561700, -46.656600),
    "instituto moreira salles": (-23.561700, -46.656600),
}
GEO_CACHE: dict[str, tuple[float | None, float | None]] = {}


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return parser.parse(value)
    except Exception:
        return None


def parse_price(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value)
    if "grat" in text.lower() or "free" in text.lower():
        return 0.0
    m = re.search(r"(\d+[\.,]?\d*)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def geolocate_venue(venue: str, city: str) -> tuple[float | None, float | None]:
    if not venue:
        return None, None

    low = venue.lower().strip()
    cache_key = f"{low}|{city.lower().strip()}"
    if cache_key in GEO_CACHE:
        return GEO_CACHE[cache_key]

    for key, coords in VENUE_COORDS.items():
        if key in low:
            GEO_CACHE[cache_key] = coords
            return coords

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": f"{venue}, {city}, Brazil", "format": "json", "limit": 1},
            headers={"User-Agent": "life-discovery-crawler/1.0"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data:
            coords = float(data[0]["lat"]), float(data[0]["lon"])
            GEO_CACHE[cache_key] = coords
            return coords
    except Exception:
        return None, None

    GEO_CACHE[cache_key] = (None, None)
    return None, None


def normalize_event(raw: dict[str, Any], source: str) -> dict[str, Any]:
    tags = raw.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(",") if t.strip()]

    title = (raw.get("title") or "Untitled").strip()
    description = (raw.get("description") or "").strip()
    venue = (raw.get("venue") or raw.get("location") or "Sao Paulo").strip()
    city = raw.get("city") or "Sao Paulo"
    lat, lng = geolocate_venue(venue, city)

    return {
        "title": title,
        "description": description,
        "venue": venue,
        "city": city,
        "start_time": parse_date(raw.get("date") or raw.get("start_time")),
        "price": parse_price(raw.get("price")),
        "tags": tags,
        "source": source,
        "category": (raw.get("category") or "event").lower(),
        "url": raw.get("url") or "",
        "latitude": lat,
        "longitude": lng,
    }
