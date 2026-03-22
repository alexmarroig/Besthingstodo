"""
iFood connector — restaurant rankings via iFood's public marketplace API.

iFood exposes a REST API used by their own website/app. No API key is required
for the public listing endpoints. Returns restaurants with ratings, cuisine type,
delivery time, and price range.

Coordinates default to Campo Belo SP (couple's neighborhood).
"""
from __future__ import annotations

import os

import requests

from ..normalize import normalize_event, enrich_tags_from_title

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Referer": "https://www.ifood.com.br/",
    "Origin": "https://www.ifood.com.br",
}

# Campo Belo, São Paulo
_DEFAULT_LAT = float(os.getenv("USER_LAT", "-23.6208"))
_DEFAULT_LNG = float(os.getenv("USER_LNG", "-46.6642"))

# iFood's internal marketplace API (used by their website)
_API_URLS = [
    "https://marketplace.ifood.com.br/v1/merchants",
    "https://marketplace.ifood.com.br/v2/merchants",
]

_PRICE_RANGE_MAP = {
    "CHEAP": 20.0,
    "MODERATE": 50.0,
    "EXPENSIVE": 100.0,
    "VERY_EXPENSIVE": 200.0,
}

_CUISINE_TAG_MAP = {
    "pizza": ["pizza", "italian", "food"],
    "japanese": ["japanese", "sushi", "asian"],
    "burger": ["burger", "fast food", "american"],
    "brazilian": ["brazilian", "traditional", "food"],
    "chinese": ["chinese", "asian", "food"],
    "italian": ["italian", "pasta", "food"],
    "healthy": ["healthy", "salad", "light"],
    "arabic": ["arabic", "middle eastern", "food"],
    "seafood": ["seafood", "fish", "food"],
    "vegetarian": ["vegetarian", "vegan", "healthy"],
    "dessert": ["dessert", "sweets", "bakery"],
    "coffee": ["cafe", "coffee", "cozy", "quiet"],
    "barbecue": ["bbq", "churrasco", "meat", "brazilian"],
    "mexican": ["mexican", "tacos", "food"],
    "peruvian": ["peruvian", "latin", "food"],
}


def _cuisine_to_tags(cuisine_list: list[str]) -> list[str]:
    tags: set[str] = {"delivery", "restaurant"}
    for c in (cuisine_list or []):
        for key, new_tags in _CUISINE_TAG_MAP.items():
            if key in c.lower():
                tags.update(new_tags)
                break
    return sorted(tags)


def fetch_events() -> list[dict]:
    events: list[dict] = []

    params = {
        "latitude": _DEFAULT_LAT,
        "longitude": _DEFAULT_LNG,
        "channel": "IFOOD",
        "size": 50,
        "sort": "distance",
    }

    data = None
    for api_url in _API_URLS:
        try:
            resp = requests.get(api_url, params=params, headers=_HEADERS, timeout=20)
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception:
            continue

    if data is None:
        return []

    # Response can be a list or {"merchants": [...]} depending on version
    merchants = data if isinstance(data, list) else data.get("merchants", data.get("data", []))

    for m in (merchants or [])[:50]:
        if not isinstance(m, dict):
            continue

        name = (m.get("name") or m.get("tradingName") or "").strip()
        if not name:
            continue

        # Rating
        rating_data = m.get("userRating") or m.get("rating") or {}
        rating = None
        if isinstance(rating_data, dict):
            rating = rating_data.get("rating") or rating_data.get("value")
        elif isinstance(rating_data, (int, float)):
            rating = float(rating_data)

        # Skip poorly rated
        if rating is not None and float(rating) < 3.5:
            continue

        # Address / location
        address_data = m.get("address") or m.get("mainAddress") or {}
        venue = name
        if isinstance(address_data, dict):
            street = address_data.get("streetName", "")
            neighborhood = address_data.get("neighborhood") or address_data.get("district", "")
            if neighborhood:
                venue = f"{name} – {neighborhood}"

        # Price range
        price_range_key = m.get("priceRange") or m.get("pricingHints", {})
        if isinstance(price_range_key, dict):
            price_range_key = price_range_key.get("id", "")
        price = _PRICE_RANGE_MAP.get(str(price_range_key).upper())

        # Cuisine / category tags
        cuisine = m.get("mainCategory") or {}
        cuisine_name = cuisine.get("name", "") if isinstance(cuisine, dict) else str(cuisine)
        categories = m.get("categories") or []
        cuisine_list = [cuisine_name] + [
            c.get("name", "") if isinstance(c, dict) else str(c)
            for c in categories
        ]
        tags = _cuisine_to_tags(cuisine_list)
        tags = enrich_tags_from_title(name, list(tags))

        # Description
        min_time = m.get("deliveryTime") or m.get("estimatedDeliveryTime") or {}
        delivery_time = ""
        if isinstance(min_time, dict):
            delivery_time = f"{min_time.get('min', '')}–{min_time.get('max', '')} min"
        elif isinstance(min_time, (int, float)):
            delivery_time = f"~{int(min_time)} min"

        rating_str = f" | ⭐ {rating:.1f}" if rating else ""
        time_str = f" | 🕐 {delivery_time}" if delivery_time else ""
        cuisine_str = f" | {', '.join(c for c in cuisine_list if c)}" if cuisine_list else ""
        description = f"Restaurante no iFood – {name}{rating_str}{cuisine_str}{time_str}"

        # URL
        slug = m.get("slug") or m.get("id") or ""
        url = f"https://www.ifood.com.br/delivery/{slug}" if slug else "https://www.ifood.com.br"

        events.append(
            normalize_event(
                {
                    "title": name[:140],
                    "description": description[:400],
                    "venue": venue,
                    "city": "Sao Paulo",
                    "date": None,
                    "price": price,
                    "category": "restaurant",
                    "tags": tags,
                    "url": url,
                },
                source="ifood",
            )
        )

    return events
