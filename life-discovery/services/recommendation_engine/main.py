from __future__ import annotations

from datetime import datetime

from fastapi import FastAPI, Query
from pgvector.sqlalchemy import Vector
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text, create_engine, desc, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from candidate_generator import generate_candidates
from ranker import rank_candidates
from reranker import rerank_with_diversity


class Settings(BaseSettings):
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "life"
    postgres_password: str = "life"
    postgres_db: str = "life_discovery"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    location: Mapped[str] = mapped_column(String)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    value: Mapped[str] = mapped_column(String)
    weight: Mapped[float] = mapped_column(Float)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    profile_json: Mapped[dict] = mapped_column(JSON, default=dict)
    psychological_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    embedding_vector: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    experience_id: Mapped[str] = mapped_column(String, ForeignKey("experiences.id"))
    feedback_type: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime)


app = FastAPI(title="Recommendation Ranking Engine", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "recommendation-engine"}


@app.get("/recommendations")
def recommendations(
    user_id: str,
    city: str = "Sao Paulo",
    limit: int = Query(default=20, ge=1, le=100),
    user_lat: float | None = None,
    user_lon: float | None = None,
    daypart: str = "evening",
    weather: str = "unknown",
):
    db = SessionLocal()
    try:
        profile = db.execute(select(UserProfile).where(UserProfile.user_id == user_id)).scalar_one_or_none()
        prefs = db.execute(select(UserPreference).where(UserPreference.user_id == user_id)).scalars().all()
        rows = db.execute(select(Experience).where(Experience.city == city)).scalars().all()

        recent_feedback = (
            db.execute(
                select(Interaction)
                .where(Interaction.user_id == user_id)
                .order_by(desc(Interaction.created_at))
                .limit(200)
            )
            .scalars()
            .all()
        )

        user_tag_weights = {}
        for p in prefs:
            key = (p.value or "").lower()
            user_tag_weights[key] = user_tag_weights.get(key, 0.0) + float(p.weight or 0.0)

        seen_ids = {x.experience_id for x in recent_feedback}
        stats = {}
        for it in db.execute(select(Interaction)).scalars().all():
            stats.setdefault(it.experience_id, {"like": 0.0, "dislike": 0.0, "save": 0.0, "view": 0.0, "click": 0.0})
            if it.feedback_type in stats[it.experience_id]:
                stats[it.experience_id][it.feedback_type] += 1.0

        profile_json = profile.profile_json if profile else {}
        psych_profile = profile.psychological_profile if profile and isinstance(profile.psychological_profile, dict) else {}
        budget_range = profile_json.get("budget_range", "medium") if isinstance(profile_json, dict) else "medium"
        allergy_avoid = profile_json.get("allergy_avoid", []) if isinstance(profile_json, dict) else []
        distance_limit_km = 20.0
        if isinstance(profile_json, dict):
            raw = str(profile_json.get("distance_limit", "20km")).replace("km", "").strip()
            try:
                distance_limit_km = float(raw)
            except Exception:
                distance_limit_km = 20.0

        state = {
            "user_embedding": profile.embedding_vector if profile else None,
            "user_tag_weights": user_tag_weights,
            "profile": profile_json if isinstance(profile_json, dict) else {},
            "psychological_profile": psych_profile,
            "context": {
                "daypart": daypart,
                "weather": weather,
                "noise_tolerance": (profile_json.get("noise_tolerance", "quiet") if isinstance(profile_json, dict) else "quiet"),
            },
            "user_lat": user_lat,
            "user_lon": user_lon,
            "budget_range": budget_range,
            "distance_limit_km": distance_limit_km,
            "seen_experience_ids": list(seen_ids),
            "interaction_stats": stats,
            "allergy_avoid": allergy_avoid,
        }

        exps = [
            {
                "id": x.id,
                "title": x.title,
                "description": x.description,
                "category": x.category,
                "city": x.city,
                "location": x.location,
                "latitude": x.latitude,
                "longitude": x.longitude,
                "start_time": x.start_time,
                "price": x.price,
                "tags": x.tags or [],
                "source": x.source,
                "embedding": x.embedding,
            }
            for x in rows
        ]

        candidates = generate_candidates(
            experiences=exps,
            user_embedding=state["user_embedding"],
            city=city,
            user_lat=user_lat,
            user_lon=user_lon,
            max_items=200,
        )

        ranked = rank_candidates(candidates, state)
        reranked = rerank_with_diversity(ranked, limit=limit)

        return [
            {
                "title": item["title"],
                "score": item["score"],
                "reason": item["reason"],
                "category": item.get("category"),
            }
            for item in reranked
        ]
    finally:
        db.close()
