import re
from datetime import datetime
from typing import Any

import requests
from dateutil import parser

# ---------------------------------------------------------------------------
# Title-based tag enrichment — maps keywords in event titles to semantic tags
# ---------------------------------------------------------------------------
_TITLE_TAG_MAP: dict[str, list[str]] = {
    "jazz": ["jazz", "music", "live music"],
    "rock": ["rock", "music", "concert"],
    "samba": ["samba", "music", "cultural", "brazilian"],
    "mpb": ["mpb", "music", "cultural", "brazilian"],
    "bossa nova": ["bossa nova", "music", "cultural", "romantic"],
    "teatro": ["theater", "performance", "art"],
    "peça": ["theater", "performance", "art"],
    "espetáculo": ["performance", "art", "show"],
    "espetaculo": ["performance", "art", "show"],
    "exposição": ["exhibition", "art", "museum", "cultural"],
    "exposicao": ["exhibition", "art", "museum", "cultural"],
    "galeria": ["gallery", "art", "cultural"],
    "cinema": ["cinema", "movie", "film"],
    "filme": ["cinema", "movie", "film"],
    "ballet": ["ballet", "dance", "performance", "art"],
    "balé": ["ballet", "dance", "performance", "art"],
    "bale": ["ballet", "dance", "performance", "art"],
    "dança": ["dance", "performance", "art"],
    "danca": ["dance", "performance", "art"],
    "workshop": ["workshop", "education", "interactive"],
    "curso": ["course", "education", "learning"],
    "aula": ["course", "education", "learning"],
    "show": ["show", "concert", "live music"],
    "festival": ["festival", "cultural", "outdoor"],
    "feira": ["fair", "market", "outdoor"],
    "mercado": ["market", "outdoor", "food"],
    "palestra": ["talk", "lecture", "intellectual"],
    "debate": ["debate", "intellectual", "talk"],
    "gastronomia": ["gastronomy", "food", "dining"],
    "culinária": ["food", "cooking", "gastronomy"],
    "culinaria": ["food", "cooking", "gastronomy"],
    "arte": ["art", "cultural", "creative"],
    "música": ["music", "concert"],
    "musica": ["music", "concert"],
    "museu": ["museum", "cultural", "educational"],
    "clássico": ["classical", "music", "cultural", "intellectual"],
    "classico": ["classical", "music", "cultural", "intellectual"],
    "orquestra": ["orchestra", "classical", "music", "cultural", "intellectual"],
    "ópera": ["opera", "classical", "music", "cultural"],
    "opera": ["opera", "classical", "music", "cultural"],
    "yoga": ["yoga", "wellness", "health", "quiet"],
    "meditação": ["meditation", "wellness", "quiet"],
    "meditacao": ["meditation", "wellness", "quiet"],
    "stand-up": ["comedy", "stand-up", "fun", "humor"],
    "comédia": ["comedy", "fun", "humor"],
    "comedia": ["comedy", "fun", "humor"],
    "humor": ["comedy", "fun", "humor"],
    "infantil": ["kids", "family", "children"],
    "família": ["family", "kids"],
    "familia": ["family", "kids"],
    "fotografia": ["photography", "art", "cultural"],
    "literatura": ["literature", "intellectual", "cultural"],
    "poesia": ["poetry", "literature", "intellectual"],
    "livraria": ["bookstore", "literature", "quiet"],
    "noite": ["night", "evening"],
    "gratuito": ["free", "gratis"],
    "gratuita": ["free", "gratis"],
    "grátis": ["free", "gratis"],
    "gratis": ["free", "gratis"],
    "romântico": ["romantic"],
    "romantico": ["romantic"],
    "íntimo": ["intimate", "quiet", "small"],
    "intimo": ["intimate", "quiet", "small"],
    "ao ar livre": ["outdoor", "nature"],
    "parque": ["park", "outdoor", "nature"],
    "thriller": ["thriller", "suspense", "intellectual"],
    "terror": ["horror", "thriller"],
    "ficção": ["sci-fi", "fiction", "intellectual"],
    "ficcao": ["sci-fi", "fiction", "intellectual"],
    "ciência": ["science", "intellectual", "educational"],
    "ciencia": ["science", "intellectual", "educational"],
    "tecnologia": ["technology", "science", "intellectual"],
    "psicologia": ["psychology", "intellectual"],
    "filosofia": ["philosophy", "intellectual"],
    "astronomia": ["astronomy", "science", "intellectual"],
    "vinho": ["wine", "gastronomy", "romantic"],
    "cerveja": ["beer", "casual"],
    "jantar": ["dinner", "dining", "romantic"],
    "almoço": ["lunch", "dining"],
    "almoco": ["lunch", "dining"],
    "café": ["cafe", "cozy", "quiet"],
    "cafe": ["cafe", "cozy", "quiet"],
    "degustação": ["tasting", "food", "gastronomy"],
    "degustacao": ["tasting", "food", "gastronomy"],
    "imersivo": ["immersive", "experience", "interactive"],
    "imersão": ["immersive", "experience", "interactive"],
    "imersao": ["immersive", "experience", "interactive"],
    "experiência": ["experience", "interactive"],
    "experiencia": ["experience", "interactive"],
}


def enrich_tags_from_title(title: str, base_tags: list[str]) -> list[str]:
    """Enrich tags by detecting keywords in the event title."""
    tags: set[str] = {t.lower() for t in base_tags}
    title_lower = title.lower()
    for keyword, new_tags in _TITLE_TAG_MAP.items():
        if keyword in title_lower:
            tags.update(new_tags)
    return sorted(tags)


# ---------------------------------------------------------------------------

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
