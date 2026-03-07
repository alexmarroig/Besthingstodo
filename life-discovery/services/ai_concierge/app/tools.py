import httpx
from sqlalchemy import JSON, String, Text, cast, select
from sqlalchemy.orm import Session

from .config import settings


class ExperienceLite:
    def __init__(self, id: str, title: str, description: str, category: str, city: str, location: str, tags: list[str], start_time, price, source: str):
        self.id = id
        self.title = title
        self.description = description
        self.category = category
        self.city = city
        self.location = location
        self.tags = tags
        self.start_time = start_time
        self.price = price
        self.source = source


def parse_intent(message: str) -> dict:
    text = message.lower()
    intent = "general"
    if "tonight" in text or "hoje" in text:
        intent = "tonight"
    if "restaurant" in text or "restaurante" in text:
        intent = "restaurant"
    if "cultural" in text or "evento" in text or "exhibition" in text:
        intent = "cultural"
    if "romantic" in text or "romant" in text:
        intent = "romantic"
    if "quiet" in text or "silenc" in text:
        intent = "quiet"
    return {"intent": intent, "text": text}


def get_user_profile(user_id: str) -> dict:
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(f"{settings.user_profile_engine_url}/profiles/{user_id}")
            if r.status_code < 400:
                data = r.json()
                return data.get("profile_json", {}) if isinstance(data, dict) else {}
    except Exception:
        pass
    return {}


def get_context(city: str = "Sao Paulo") -> dict:
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(f"{settings.context_engine_url}/context", params={"city": city})
            if r.status_code < 400:
                return r.json()
    except Exception:
        pass
    return {
        "city": city,
        "temperature": None,
        "weather": "unknown",
        "local_time": "",
        "day_of_week": "",
    }


def _score(exp: dict, query_text: str, profile: dict) -> float:
    q = query_text.lower()
    tags = [x.lower() for x in (exp.get("tags") or [])]
    title = (exp.get("title") or "").lower()
    desc = (exp.get("description") or "").lower()

    score = 0.0
    for w in q.split():
        if w in title or w in desc or w in tags:
            score += 0.12

    for t in profile.get("cultural_interests", []):
        if t.lower() in tags or t.lower() in title:
            score += 0.08

    style = profile.get("experience_style", {})
    quiet_pref = str(style.get("quiet_vs_social", "quiet")).lower()
    if quiet_pref == "quiet" and any(x in tags for x in ["quiet", "museum", "exhibition", "cultural"]):
        score += 0.18

    if "romantic" in q and any(x in tags for x in ["romantic", "restaurant", "cafe"]):
        score += 0.2

    return score


def get_recommendations(query: str, city: str, db: Session, profile: dict | None = None, exclude_titles: set[str] | None = None) -> list[dict]:
    profile = profile or {}
    exclude_titles = exclude_titles or set()

    from .app_api_models import Experience

    rows = db.execute(select(Experience).where(Experience.city == city).limit(500)).scalars().all()
    scored = []
    for r in rows:
        title_low = (r.title or "").strip().lower()
        if title_low in exclude_titles:
            continue
        item = {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "city": r.city,
            "location": r.location,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "price": r.price,
            "tags": r.tags or [],
            "source": r.source,
        }
        scored.append((_score(item, query, profile), item))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [x[1] for x in scored[:10]]


def get_experience_details(exp_id: str, db: Session) -> dict | None:
    from .app_api_models import Experience

    row = db.get(Experience, exp_id)
    if not row:
        return None
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "category": row.category,
        "city": row.city,
        "location": row.location,
        "start_time": row.start_time.isoformat() if row.start_time else None,
        "price": row.price,
        "tags": row.tags or [],
        "source": row.source,
        "url": row.url,
    }
