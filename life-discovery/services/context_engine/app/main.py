import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(title="Context Engine", version="1.0.0")


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


def get_geo(ip: str | None, fallback_city: str) -> dict:
    try:
        if ip and ip not in {"127.0.0.1", "::1", "localhost"}:
            r = requests.get(f"https://ipapi.co/{ip}/json/", timeout=10)
        else:
            r = requests.get("https://ipapi.co/json/", timeout=10)
        data = r.json()
        return {
            "city": data.get("city") or fallback_city,
            "lat": data.get("latitude"),
            "lon": data.get("longitude"),
            "timezone": data.get("timezone") or "America/Sao_Paulo",
        }
    except Exception:
        return {"city": fallback_city, "lat": None, "lon": None, "timezone": "America/Sao_Paulo"}


def get_weather(city: str, lat: float | None, lon: float | None) -> tuple[float | None, str]:
    if not settings.openweather_api_key:
        return None, "unknown"
    try:
        params = {"appid": settings.openweather_api_key, "units": "metric", "lang": "en"}
        if lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon
        else:
            params["q"] = city
        r = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params, timeout=12)
        data = r.json()
        temp = data.get("main", {}).get("temp")
        weather = (data.get("weather") or [{}])[0].get("main", "unknown")
        return temp, weather
    except Exception:
        return None, "unknown"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/context")
def context(ip: str | None = Query(default=None), city: str = Query(default="Sao Paulo")):
    geo = get_geo(ip, city)
    temp, weather = get_weather(geo["city"], geo["lat"], geo["lon"])

    tz = ZoneInfo(geo["timezone"])
    now = datetime.now(tz)

    return {
        "city": geo["city"],
        "temperature": temp,
        "weather": weather,
        "local_time": now.isoformat(),
        "day_of_week": now.strftime("%A"),
    }
