import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import Experience, UserProfile
from .planner import pick_best
from .schemas import DateNightIn, DateNightPlan

app = FastAPI(title="Date Night AI", version="1.0.0")


def get_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "date-night-ai"}


@app.post("/date-night-plan", response_model=DateNightPlan)
def date_night_plan(payload: DateNightIn, db: Session = Depends(get_db)):
    profile_row = db.execute(select(UserProfile).where(UserProfile.user_id == payload.user_id)).scalar_one_or_none()
    if profile_row is None:
        raise HTTPException(status_code=404, detail="user profile not found")

    profile = profile_row.profile_json if isinstance(profile_row.profile_json, dict) else {}

    rows = db.execute(select(Experience).where(Experience.city == payload.location)).scalars().all()
    items = [
        {
            "id": x.id,
            "title": x.title,
            "description": x.description,
            "category": x.category,
            "location": x.location,
            "price": x.price,
            "tags": x.tags or [],
            "start_time": x.start_time.isoformat() if x.start_time else None,
        }
        for x in rows
    ]

    cultural_pool = [x for x in items if x["category"] in {"event", "movie", "cinema", "exhibition"}]
    restaurant_pool = [x for x in items if x["category"] == "restaurant"]
    after_pool = [x for x in items if x["category"] in {"cafe", "event", "exhibition", "restaurant"}]

    weather = payload.weather or "unknown"
    time_pref = payload.time or "evening"

    used_keys: set[str] = set()

    a1 = pick_best(cultural_pool or items, profile, weather, time_pref, "cultural", exclude_keys=used_keys)
    if a1:
        used_keys.add(str(a1.get("title") or a1.get("id") or "").strip().lower())

    a2 = pick_best(restaurant_pool or items, profile, weather, time_pref, "restaurant", exclude_keys=used_keys)
    if a2:
        used_keys.add(str(a2.get("title") or a2.get("id") or "").strip().lower())

    a3 = pick_best(after_pool or items, profile, weather, time_pref, "after", exclude_keys=used_keys)

    if not a1 or not a2 or not a3:
        raise HTTPException(status_code=404, detail="insufficient experiences for planning")

    return DateNightPlan(
        activity_1={
            "title": a1["title"],
            "type": a1["category"],
            "reason": "combina com interesse por experiencias culturais e profundas",
        },
        activity_2={
            "title": a2["title"],
            "type": a2["category"],
            "reason": "alinhado com preferencia por ambientes silenciosos e romanticos",
        },
        activity_3={
            "title": a3["title"],
            "type": a3["category"],
            "reason": "boa atividade complementar para fechar a noite",
        },
        reasoning="Plano gerado com base em perfil, contexto, horario e opcoes locais.",
    )
