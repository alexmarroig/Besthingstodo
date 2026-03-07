import json
import uuid
from datetime import datetime

import requests
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://life:life@localhost:5432/life_discovery"
DEFAULT_EMAIL = "alex.camila@lifediscovery.app"
DEFAULT_PASSWORD_HASH = "$2b$12$X9b6a4XlTzqZ5lV3WQdWquv0Z2s3z8gD2fL2Y8n5YlY9u8b7l8v7a"  # placeholder bcrypt hash
EMBEDDING_TEXT = (
    "Couple living in Sao Paulo interested in psychology, culture, art exhibitions, "
    "psychological films, quiet restaurants, romantic experiences and nature trips. "
    "Avoids loud places, nightlife and explicit content."
)


def ensure_schema(conn):
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    conn.execute(
        text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'single',
            ADD COLUMN IF NOT EXISTS neighborhood TEXT,
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS search_radius_km DOUBLE PRECISION DEFAULT 10.0
            """
        )
    )

    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS couple_members (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                member_name TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )
    )

    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS user_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                value TEXT NOT NULL,
                weight DOUBLE PRECISION NOT NULL DEFAULT 1.0
            )
            """
        )
    )

    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                psychological_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
                embedding_vector vector(384),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE user_profiles
            ADD COLUMN IF NOT EXISTS psychological_profile JSONB NOT NULL DEFAULT '{}'::jsonb
            """
        )
    )


def seed_user(conn) -> str:
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, DEFAULT_EMAIL))

    conn.execute(
        text(
            """
            INSERT INTO users (
                id, email, password_hash, name, account_type, city, neighborhood, country,
                latitude, longitude, search_radius_km, created_at
            )
            VALUES (
                :id, :email, :password_hash, :name, :account_type, :city, :neighborhood, :country,
                :latitude, :longitude, :search_radius_km, :created_at
            )
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                account_type = EXCLUDED.account_type,
                city = EXCLUDED.city,
                neighborhood = EXCLUDED.neighborhood,
                country = EXCLUDED.country,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                search_radius_km = EXCLUDED.search_radius_km
            """
        ),
        {
            "id": user_id,
            "email": DEFAULT_EMAIL,
            "password_hash": DEFAULT_PASSWORD_HASH,
            "name": "Alex & Camila",
            "account_type": "couple",
            "city": "Sao Paulo",
            "neighborhood": "Campo Belo",
            "country": "Brazil",
            "latitude": -23.625,
            "longitude": -46.668,
            "search_radius_km": 8.0,
            "created_at": datetime.utcnow(),
        },
    )

    conn.execute(text("DELETE FROM couple_members WHERE user_id = :user_id"), {"user_id": user_id})
    conn.execute(
        text(
            """
            INSERT INTO couple_members (id, user_id, member_name, created_at)
            VALUES (:id, :user_id, :member_name, :created_at)
            """
        ),
        [
            {"id": str(uuid.uuid4()), "user_id": user_id, "member_name": "Alex", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "user_id": user_id, "member_name": "Camila", "created_at": datetime.utcnow()},
        ],
    )

    return user_id


def seed_preferences(conn, user_id: str):
    prefs = [
        ("lifestyle", "alcohol=false", 1.0),
        ("lifestyle", "smoking=false", 1.0),
        ("lifestyle", "nightclubs=false", 1.0),
        ("lifestyle", "bars=false", 1.0),
        ("lifestyle", "noise_tolerance=low", 1.0),
        ("lifestyle", "environment_preference=quiet", 1.0),
        ("cultural_interest", "psychology", 1.0),
        ("cultural_interest", "human behavior", 1.0),
        ("cultural_interest", "astrology", 0.8),
        ("cultural_interest", "symbolism", 0.9),
        ("cultural_interest", "philosophy", 0.9),
        ("cultural_interest", "cinema", 1.0),
        ("cultural_interest", "museums", 1.0),
        ("cultural_interest", "art exhibitions", 1.0),
        ("movie_genre", "psychological thriller", 1.0),
        ("movie_genre", "mystery", 0.9),
        ("movie_genre", "intelligent suspense", 1.0),
        ("movie_avoid", "nudity", 1.0),
        ("movie_avoid", "explicit sexual content", 1.0),
        ("movie_avoid", "vulgar comedy", 0.9),
        ("music", "instrumental", 0.8),
        ("music", "ambient", 0.8),
        ("music", "classical", 0.7),
        ("music", "soft jazz", 0.7),
        ("food_cuisine", "italian", 1.0),
        ("food_cuisine", "japanese", 1.0),
        ("food_cuisine", "modern gastronomy", 0.9),
        ("restaurant_style", "romantic", 1.0),
        ("restaurant_style", "quiet", 1.0),
        ("restaurant_style", "chef driven", 0.9),
        ("allergy_avoid", "nuts", 1.0),
        ("allergy_avoid", "almonds", 1.0),
        ("allergy_avoid", "shrimp", 1.0),
        ("allergy_avoid", "shellfish", 1.0),
        ("allergy_avoid", "strong peppers", 1.0),
        ("allergy_severity", "high", 1.0),
        ("travel_style", "romantic trips", 1.0),
        ("travel_style", "nature", 1.0),
        ("travel_style", "mountains", 0.9),
        ("travel_style", "charming small towns", 0.9),
        ("favorite_destination", "Campos do Jordao", 1.0),
        ("favorite_destination", "Santo Antonio do Pinhal", 1.0),
        ("travel_distance", "short trips", 1.0),
        ("travel_distance", "weekend travel", 1.0),
        ("experience_style", "romantic=true", 1.0),
        ("experience_style", "intellectual=true", 1.0),
        ("experience_style", "quiet environments=true", 1.0),
        ("experience_style", "crowded places=false", 1.0),
        ("experience_style", "loud music=false", 1.0),
        ("psychological_trait", "introspective", 1.0),
        ("psychological_trait", "reflective", 1.0),
        ("psychological_trait", "analytical", 0.9),
        ("psychological_trait", "curious", 0.9),
        ("psychological_trait", "emotionally perceptive", 1.0),
        ("preference_style", "deep experiences", 1.0),
        ("preference_style", "meaningful conversations", 1.0),
        ("preference_style", "symbolic interpretation", 0.9),
        ("preference_style", "learning oriented experiences", 0.9),
        ("avoid", "superficial entertainment", 1.0),
        ("avoid", "loud environments", 1.0),
        ("avoid", "mass crowded nightlife", 1.0),
        ("context", "company=couple", 1.0),
        ("context", "budget_range=medium", 1.0),
        ("context", "preferred_time=evening", 1.0),
        ("context", "transport=car", 1.0),
    ]

    conn.execute(text("DELETE FROM user_preferences WHERE user_id = :user_id"), {"user_id": user_id})
    conn.execute(
        text(
            """
            INSERT INTO user_preferences (id, user_id, category, value, weight)
            VALUES (:id, :user_id, :category, :value, :weight)
            """
        ),
        [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "category": c,
                "value": v,
                "weight": w,
            }
            for (c, v, w) in prefs
        ],
    )


def seed_profile(conn, user_id: str):
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embedding = model.encode([EMBEDDING_TEXT], normalize_embeddings=True)[0].tolist()
    embedding_str = "[" + ",".join(f"{x:.8f}" for x in embedding) + "]"

    psychological_profile = {
        "personality_style": {
            "introspection": 0.92,
            "analytical_thinking": 0.88,
            "emotional_depth": 0.84,
            "curiosity": 0.91,
        },
        "cognitive_preferences": {
            "learning_oriented": True,
            "symbolic_thinking": True,
            "interest_in_meaning": True,
            "intellectual_discussion": True,
        },
        "experience_preferences": {
            "romantic_environments": True,
            "quiet_places": True,
            "cultural_depth": True,
            "nature_connection": True,
        },
        "social_style": {
            "crowds": False,
            "nightlife": False,
            "intimate_settings": True,
        },
        "entertainment_style": {
            "films": ["psychological thriller", "mystery", "intelligent suspense"],
            "avoid_content": ["nudity", "vulgar humor"],
        },
        "relationship_dynamic": {
            "shared_interests": ["psychology", "astrology", "philosophy", "symbolism"],
            "preferred_experiences": ["deep conversations", "cultural experiences", "romantic environments"],
        },
    }

    profile_json = {
        "account_type": "couple",
        "members": ["Alex", "Camila"],
        "city": "Sao Paulo",
        "neighborhood": "Campo Belo",
        "country": "Brazil",
        "coordinates": {"lat": -23.625, "lon": -46.668},
        "search_radius_km": 8,
        "lifestyle": {
            "alcohol": False,
            "smoking": False,
            "nightclubs": False,
            "bars": False,
            "noise_tolerance": "low",
            "environment_preference": "quiet",
        },
        "cultural_interests": [
            "psychology",
            "human behavior",
            "astrology",
            "symbolism",
            "philosophy",
            "cinema",
            "museums",
            "art exhibitions",
        ],
        "movie_preferences": {
            "favorite_genres": ["psychological thriller", "mystery", "intelligent suspense"],
            "avoid": ["nudity", "explicit sexual content", "vulgar comedy"],
        },
        "music_preferences": ["instrumental", "ambient", "classical", "soft jazz"],
        "food_preferences": {
            "favorite_cuisines": ["italian", "japanese", "modern gastronomy"],
            "restaurant_style": ["romantic", "quiet", "chef driven"],
        },
        "allergy_profile": {
            "person": "Camila",
            "avoid_ingredients": ["nuts", "almonds", "shrimp", "shellfish", "strong peppers"],
            "allergy_severity": "high",
        },
        "allergy_avoid": ["nuts", "almonds", "shrimp", "shellfish", "strong peppers"],
        "travel_preferences": {
            "style": ["romantic trips", "nature", "mountains", "charming small towns"],
            "favorite_destinations": ["Campos do Jordao", "Santo Antonio do Pinhal"],
            "distance_preference": ["short trips", "weekend travel"],
        },
        "experience_style": {
            "romantic": True,
            "intellectual": True,
            "quiet_environments": True,
            "crowded_places": False,
            "loud_music": False,
            "romantic_vs_group": "romantic",
            "quiet_vs_social": "quiet",
        },
        "psychological_profile": psychological_profile,
        "budget_range": "medium",
        "distance_limit": "8km",
        "noise_tolerance": "quiet",
        "default_context": {
            "company": "couple",
            "budget_range": "medium",
            "preferred_time": "evening",
            "transport": "car",
        },
    }

    conn.execute(
        text(
            """
            INSERT INTO user_profiles (id, user_id, profile_json, psychological_profile, embedding_vector, updated_at)
            VALUES (
              :id,
              :user_id,
              CAST(:profile_json AS jsonb),
              CAST(:psychological_profile AS jsonb),
              CAST(:embedding_vector AS vector),
              NOW()
            )
            ON CONFLICT (user_id)
            DO UPDATE SET
              profile_json = EXCLUDED.profile_json,
              psychological_profile = EXCLUDED.psychological_profile,
              embedding_vector = EXCLUDED.embedding_vector,
              updated_at = NOW()
            """
        ),
        {
            "id": user_id,
            "user_id": user_id,
            "profile_json": json.dumps(profile_json),
            "psychological_profile": json.dumps(psychological_profile),
            "embedding_vector": embedding_str,
        },
    )


def test_recommendation_engine(user_id: str):
    try:
        r = requests.get(
            "http://localhost:8002/recommendations",
            params={"user_id": user_id, "city": "Sao Paulo", "limit": 8, "daypart": "evening"},
            timeout=20,
        )
        if r.status_code < 400:
            data = r.json()
            print("recommendations_sample:")
            for item in data[:3]:
                print(item)
        else:
            print("recommendation_engine_error", r.status_code, r.text)
    except Exception as exc:
        print("recommendation_engine_unavailable", exc)


def main():
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.begin() as conn:
        ensure_schema(conn)
        user_id = seed_user(conn)
        seed_preferences(conn, user_id)
        seed_profile(conn, user_id)

    print("Seeded couple profile")
    print("user_id:", str(uuid.uuid5(uuid.NAMESPACE_DNS, DEFAULT_EMAIL)))
    test_recommendation_engine(str(uuid.uuid5(uuid.NAMESPACE_DNS, DEFAULT_EMAIL)))


if __name__ == "__main__":
    main()
