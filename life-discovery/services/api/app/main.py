from fastapi import FastAPI
from sqlalchemy import text

from .db import engine
from .models import Base
from .routers import (
    auth_router,
    context_router,
    couple_router,
    diary_router,
    experience_router,
    feedback_router,
    gamification_router,
    health_score_router,
    life_graph_router,
    memories_router,
    onboarding_router,
    subscription_router,
    surprise_router,
)

app = FastAPI(title="Life Discovery API", version="3.0.0")


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

        # ── Premium tables (v3.0) ─────────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
                tier TEXT NOT NULL DEFAULT 'free',
                expires_at TIMESTAMP,
                external_subscription_id TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS couple_memories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                experience_id TEXT REFERENCES experiences(id),
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                memory_date DATE,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                venue_name TEXT,
                tags JSONB NOT NULL DEFAULT '[]',
                mood TEXT,
                photo_url TEXT,
                rating INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS love_map_pins (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                memory_id TEXT REFERENCES couple_memories(id),
                latitude DOUBLE PRECISION NOT NULL,
                longitude DOUBLE PRECISION NOT NULL,
                label TEXT NOT NULL DEFAULT '',
                pin_type TEXT NOT NULL DEFAULT 'date',
                visit_date DATE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS health_scores (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
                score DOUBLE PRECISION NOT NULL DEFAULT 0,
                components JSONB NOT NULL DEFAULT '{}',
                trend TEXT NOT NULL DEFAULT 'stable',
                insight TEXT,
                monthly_report JSONB NOT NULL DEFAULT '{}',
                computed_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS couple_streaks (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
                current_streak INTEGER NOT NULL DEFAULT 0,
                longest_streak INTEGER NOT NULL DEFAULT 0,
                last_activity_date DATE,
                total_active_days INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS couple_badges (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                badge_key TEXT NOT NULL,
                badge_name TEXT NOT NULL,
                badge_emoji TEXT NOT NULL DEFAULT '🏆',
                description TEXT NOT NULL DEFAULT '',
                earned_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS couple_challenges (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                challenge_key TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                target_count INTEGER NOT NULL DEFAULT 1,
                current_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                badge_reward TEXT,
                expires_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS surprise_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                member_answers JSONB NOT NULL DEFAULT '{}',
                recommendation JSONB NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'pending_answers',
                post_ratings JSONB NOT NULL DEFAULT '{}',
                experience_id TEXT REFERENCES experiences(id),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                revealed_at TIMESTAMP
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS diary_threads (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                thread_type TEXT NOT NULL DEFAULT 'weekly_reflection',
                title TEXT NOT NULL,
                ai_summary TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                closed_at TIMESTAMP
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS diary_messages (
                id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL REFERENCES diary_threads(id),
                author_type TEXT NOT NULL,
                content TEXT NOT NULL,
                memory_id TEXT REFERENCES couple_memories(id),
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))


@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


app.include_router(auth_router.router)
app.include_router(couple_router.router)
app.include_router(onboarding_router.router)
app.include_router(context_router.router)
app.include_router(feedback_router.router)
app.include_router(experience_router.router)
app.include_router(life_graph_router.router)

# ── Premium feature routers ──────────────────────────────────────────────
app.include_router(memories_router.router)       # POST/GET /memories
app.include_router(memories_router.love_map_router)  # GET /love-map, POST /love-map/pin
app.include_router(health_score_router.router)   # GET /health-score, GET|POST /health-score/report
app.include_router(gamification_router.router)   # GET /gamification/streak, /badges, /challenges
app.include_router(surprise_router.router)       # POST /surprise/start, ...
app.include_router(diary_router.router)          # GET/POST /diary, /diary/{id}/message
app.include_router(subscription_router.router)   # GET /subscription, POST /subscription/upgrade
