from fastapi import FastAPI
import os

from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from .db import engine
from .models import Base
from .routers import (
    auth_router,
    concierge,
    context_router,
    couple_router,
    experience_router,
    feedback_router,
    life_graph_router,
    onboarding_router,
)

app = FastAPI(title="Life Discovery API", version="2.2.0")


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


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF to_regclass('public.experiences') IS NOT NULL THEN
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'events_exhibitions';
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS slug TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS neighborhood TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS booking_url TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS editorial_source TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS content_tier TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS availability_kind TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS price_band TEXT;
                        ALTER TABLE experiences ADD COLUMN IF NOT EXISTS indoor_outdoor TEXT;
                    END IF;
                END$$;
                """
            )
        )

        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF to_regclass('public.interactions') IS NOT NULL THEN
                        ALTER TABLE interactions ADD COLUMN IF NOT EXISTS decision TEXT;
                        ALTER TABLE interactions ADD COLUMN IF NOT EXISTS post_experience_rating INTEGER;
                        ALTER TABLE interactions ADD COLUMN IF NOT EXISTS reason_tags JSONB NOT NULL DEFAULT '[]'::jsonb;
                        ALTER TABLE interactions ADD COLUMN IF NOT EXISTS context_json JSONB NOT NULL DEFAULT '{}'::jsonb;
                    END IF;
                END$$;
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS couple_members (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT,
                    birth_date DATE,
                    drinks_alcohol BOOLEAN NOT NULL DEFAULT FALSE,
                    smokes BOOLEAN NOT NULL DEFAULT FALSE,
                    occupation TEXT,
                    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
                    dislikes JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS couple_profiles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT UNIQUE NOT NULL,
                    schema_version TEXT NOT NULL DEFAULT 'v1',
                    couple_profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS graph_nodes (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS graph_edges (
                    id TEXT PRIMARY KEY,
                    source_node_id TEXT NOT NULL,
                    target_node_id TEXT NOT NULL,
                    relationship_type TEXT NOT NULL,
                    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0
                )
                """
            )
        )


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router.router)
app.include_router(couple_router.router)
app.include_router(onboarding_router.router)
app.include_router(context_router.router)
app.include_router(feedback_router.router)
app.include_router(experience_router.router)
app.include_router(life_graph_router.router)
app.include_router(concierge.router)
