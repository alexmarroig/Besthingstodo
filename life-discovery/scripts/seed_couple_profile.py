import hashlib
import json
import uuid
from datetime import datetime

import requests
from passlib.context import CryptContext
from sqlalchemy import create_engine, text

from catalog_pipeline import dedupe_catalog, load_curated_catalog as load_canonical_catalog

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover
    SentenceTransformer = None

DATABASE_URL = "postgresql+psycopg://life:life@localhost:5432/life_discovery"
API_URL = "http://localhost:8000"
COUPLE_EMAIL = "alex.c.marroig@gmail.com"
COUPLE_PASSWORD = "alexcamila123"
COUPLE_NAME = "Alex & Camila"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_embedding(text_value: str, dim: int = 384) -> list[float]:
    if SentenceTransformer is not None:
        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        return model.encode([text_value], normalize_embeddings=True)[0].tolist()

    # Fallback deterministic embedding if transformer model is unavailable.
    values = []
    for idx in range(dim):
        digest = hashlib.sha256(f"{text_value}:{idx}".encode("utf-8")).digest()
        unit = int.from_bytes(digest[:4], "big") / 4294967295.0
        values.append((unit * 2.0) - 1.0)
    norm = sum(v * v for v in values) ** 0.5 or 1.0
    return [v / norm for v in values]


def to_vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vector) + "]"


def ensure_schema(conn) -> None:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

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
            CREATE TABLE IF NOT EXISTS domain_preferences (
                user_id TEXT NOT NULL,
                domain TEXT NOT NULL,
                weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                PRIMARY KEY (user_id, domain)
            )
            """
        )
    )

    conn.execute(
        text(
            """
            DO $$
            BEGIN
                IF to_regclass('public.experiences') IS NOT NULL THEN
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


def build_couple_profile_json() -> dict:
    return {
        "schema_version": "v1",
        "location": {
            "city": "Sao Paulo",
            "neighborhood": "Campo Belo",
            "country": "Brazil",
            "transport": "car",
            "max_drive_minutes": 40,
            "avoid_going_out_when_rain": True,
            "weekend_wake_time": "10:00",
        },
        "lifestyle": {
            "alcohol": False,
            "smoking": False,
            "nightclubs": False,
            "bars": False,
            "avoid_crowded_places": True,
            "preferences": ["romantic", "fun", "instagrammable", "small", "cozy"],
        },
        "members": [
            {
                "full_name": "Alex da Cunha Marroig",
                "birthday": "1992-02-28",
                "email": "alex.c.marroig@gmail.com",
            },
            {
                "full_name": "Camila Veloso de Freitas",
                "birthday": "1995-11-07",
            },
        ],
        "interests": [
            "technology",
            "science",
            "psychology",
            "astrology",
            "cinema",
            "museums",
            "cafes",
            "bookstores",
        ],
        "preferred_parks": ["Villa Lobos"],
        "movies": {
            "genres": ["psychological thriller", "mystery", "plot twist movies"],
            "avoid": ["nudity", "explicit content", "horror"],
            "favorites": [
                "Interestelar",
                "Titanic",
                "Parasita",
                "Os Outros",
                "Efeito Borboleta",
                "Sinais",
                "Buscando",
                "Desaparecida",
                "Um lugar para recordar",
            ],
        },
        "series": ["This Is Us", "Gossip Girl", "The OC", "MasterChef", "The Voice", "The Bear"],
        "restaurants": {
            "dining_out": ["Lellis Trattoria", "Libertango", "Charles", "Issho"],
            "delivery": ["Patties", "Z Deli", "Issho"],
            "favorite_dishes": [
                "ravioloni mozzarella napolitano",
                "bife a milanesa",
                "ojo de bife",
                "pizza portuguesa",
                "cheeseburger patties",
                "oraculo z-deli",
                "yakissoba issho",
            ],
        },
        "allergies": {
            "camila": [
                "nuts",
                "almonds",
                "mushrooms",
                "celery",
                "pepper",
                "shrimp",
                "blue dye",
                "shellfish",
            ]
        },
        "travel": {
            "styles": ["mountain towns", "romantic destinations"],
            "favorite_destinations": [
                "Campos do Jordao",
                "Santo Antonio do Pinhal",
                "Holambra",
                "Itu",
                "Aguas de Lindoia",
                "Pedreira",
                "Ibiuna",
                "Sao Roque",
                "Mairinque",
            ],
        },
        "events": {
            "interests": [
                "psychology exhibitions",
                "art installations",
                "light installations",
                "museum events",
            ],
            "examples_liked": [
                "Jung exhibition",
                "Nise da Silveira exhibition",
                "Dopamine Land",
                "Jardim de Luzes",
            ],
            "wishlist_places": ["Theatro Municipal", "Planetario"],
        },
    }


def upsert_user(conn) -> str:
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, COUPLE_EMAIL))
    conn.execute(
        text(
            """
            INSERT INTO users (
                id, email, password_hash, name, account_type, city, neighborhood, country,
                latitude, longitude, search_radius_km, created_at
            ) VALUES (
                :id, :email, :password_hash, :name, :account_type, :city, :neighborhood, :country,
                :latitude, :longitude, :search_radius_km, :created_at
            )
            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
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
            "email": COUPLE_EMAIL,
            "password_hash": pwd_context.hash(COUPLE_PASSWORD),
            "name": COUPLE_NAME,
            "account_type": "couple",
            "city": "Sao Paulo",
            "neighborhood": "Campo Belo",
            "country": "Brazil",
            "latitude": -23.625,
            "longitude": -46.668,
            "search_radius_km": 12.0,
            "created_at": datetime.utcnow(),
        },
    )
    return user_id


def upsert_couple_members(conn, user_id: str) -> None:
    conn.execute(text("DELETE FROM couple_members WHERE user_id = :user_id"), {"user_id": user_id})
    now = datetime.utcnow()
    conn.execute(
        text(
            """
            INSERT INTO couple_members (
                id, user_id, full_name, email, birth_date,
                drinks_alcohol, smokes, occupation, interests, dislikes, created_at
            ) VALUES (
                :id, :user_id, :full_name, :email, :birth_date,
                :drinks_alcohol, :smokes, :occupation, CAST(:interests AS jsonb), CAST(:dislikes AS jsonb), :created_at
            )
            """
        ),
        [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "full_name": "Alex da Cunha Marroig",
                "email": "alex.c.marroig@gmail.com",
                "birth_date": "1992-02-28",
                "drinks_alcohol": False,
                "smokes": False,
                "occupation": None,
                "interests": json.dumps(["technology", "science", "psychology", "astrology"]),
                "dislikes": json.dumps(["crowded places", "nightclubs", "bars"]),
                "created_at": now,
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "full_name": "Camila Veloso de Freitas",
                "email": None,
                "birth_date": "1995-11-07",
                "drinks_alcohol": False,
                "smokes": False,
                "occupation": "Psicologa clinica e astrologa",
                "interests": json.dumps(["psychology", "astrology"]),
                "dislikes": json.dumps(["crowded places", "nightclubs", "bars"]),
                "created_at": now,
            },
        ],
    )


def upsert_couple_profile(conn, user_id: str, couple_profile_json: dict) -> None:
    conn.execute(
        text(
            """
            INSERT INTO couple_profiles (id, user_id, schema_version, couple_profile_json, updated_at)
            VALUES (:id, :user_id, 'v1', CAST(:couple_profile_json AS jsonb), NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                schema_version = EXCLUDED.schema_version,
                couple_profile_json = EXCLUDED.couple_profile_json,
                updated_at = NOW()
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "couple_profile_json": json.dumps(couple_profile_json),
        },
    )


def upsert_user_preferences(conn, user_id: str) -> None:
    preferences = [
        ("lifestyle", "alcohol=false", 1.0),
        ("lifestyle", "smoking=false", 1.0),
        ("lifestyle", "nightclubs=false", 1.0),
        ("lifestyle", "bars=false", 1.0),
        ("lifestyle", "avoid_crowded_places=true", 1.0),
        ("weather_rule", "prefer_staying_home_when_raining", 1.0),
        ("schedule", "wake_time_weekend=10:00", 1.0),
        ("interest", "technology", 1.0),
        ("interest", "science", 1.0),
        ("interest", "psychology", 1.0),
        ("interest", "astrology", 1.0),
        ("interest", "cinema", 1.0),
        ("interest", "museums", 1.0),
        ("interest", "cafes", 1.0),
        ("interest", "bookstores", 1.0),
        ("preferred_park", "villa lobos", 0.9),
        ("movie_genre", "psychological thriller", 1.0),
        ("movie_genre", "mystery", 1.0),
        ("movie_genre", "plot twist movies", 1.0),
        ("movie_avoid", "nudity", 1.0),
        ("movie_avoid", "explicit content", 1.0),
        ("movie_avoid", "horror", 1.0),
        ("movie_favorite", "interestelar", 0.9),
        ("movie_favorite", "titanic", 0.8),
        ("movie_favorite", "parasita", 1.0),
        ("movie_favorite", "os outros", 1.0),
        ("movie_favorite", "efeito borboleta", 1.0),
        ("movie_favorite", "sinais", 0.9),
        ("movie_favorite", "buscando", 1.0),
        ("movie_favorite", "desaparecida", 1.0),
        ("movie_favorite", "um lugar para recordar", 0.8),
        ("series", "this is us", 1.0),
        ("series", "gossip girl", 0.8),
        ("series", "the oc", 0.8),
        ("series", "masterchef", 0.8),
        ("series", "the voice", 0.7),
        ("series", "the bear", 1.0),
        ("dining_out", "lellis trattoria", 1.0),
        ("dining_out", "libertango", 1.0),
        ("dining_out", "charles", 0.9),
        ("dining_out", "issho", 1.0),
        ("delivery", "patties", 1.0),
        ("delivery", "z deli", 1.0),
        ("delivery", "issho", 1.0),
        ("favorite_dish", "ravioloni mozzarella napolitano", 1.0),
        ("favorite_dish", "bife a milanesa", 1.0),
        ("favorite_dish", "ojo de bife", 1.0),
        ("favorite_dish", "pizza portuguesa", 0.9),
        ("favorite_dish", "cheeseburger patties", 1.0),
        ("favorite_dish", "oraculo z-deli", 1.0),
        ("favorite_dish", "yakissoba issho", 1.0),
        ("allergy_avoid", "nuts", 1.0),
        ("allergy_avoid", "almonds", 1.0),
        ("allergy_avoid", "mushrooms", 1.0),
        ("allergy_avoid", "celery", 1.0),
        ("allergy_avoid", "pepper", 1.0),
        ("allergy_avoid", "shrimp", 1.0),
        ("allergy_avoid", "blue dye", 1.0),
        ("allergy_avoid", "shellfish", 1.0),
        ("travel_style", "mountain towns", 1.0),
        ("travel_style", "romantic destinations", 1.0),
        ("favorite_destination", "campos do jordao", 1.0),
        ("favorite_destination", "santo antonio do pinhal", 1.0),
        ("favorite_destination", "holambra", 0.9),
        ("favorite_destination", "itu", 0.9),
        ("favorite_destination", "aguas de lindoia", 0.9),
        ("favorite_destination", "pedreira", 0.9),
        ("favorite_destination", "ibiuna", 0.9),
        ("favorite_destination", "sao roque", 0.9),
        ("favorite_destination", "mairinque", 0.9),
        ("event_interest", "psychology exhibitions", 1.0),
        ("event_interest", "art installations", 1.0),
        ("event_interest", "light installations", 1.0),
        ("event_interest", "museum events", 1.0),
        ("liked_event", "jung exhibition", 1.0),
        ("liked_event", "nise da silveira exhibition", 1.0),
        ("liked_event", "dopamine land", 1.0),
        ("liked_event", "jardim de luzes", 1.0),
        ("wishlist_place", "theatro municipal", 1.0),
        ("wishlist_place", "planetario", 1.0),
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
                "category": category,
                "value": value,
                "weight": weight,
            }
            for category, value, weight in preferences
        ],
    )


def upsert_domain_preferences(conn, user_id: str) -> None:
    domain_preferences = [
        ("dining_out", 1.0),
        ("delivery", 1.1),
        ("movies_series", 1.0),
        ("events_exhibitions", 0.95),
    ]

    conn.execute(text("DELETE FROM domain_preferences WHERE user_id = :user_id"), {"user_id": user_id})
    conn.execute(
        text(
            """
            INSERT INTO domain_preferences (user_id, domain, weight, updated_at)
            VALUES (:user_id, :domain, :weight, NOW())
            """
        ),
        [
            {"user_id": user_id, "domain": domain, "weight": weight}
            for domain, weight in domain_preferences
        ],
    )


def upsert_user_profile_with_embedding(conn, user_id: str, couple_profile_json: dict) -> None:
    embedding_text = json.dumps(couple_profile_json, ensure_ascii=False)
    embedding = generate_embedding(embedding_text)
    embedding_str = to_vector_literal(embedding)

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
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "profile_json": json.dumps(couple_profile_json),
            "psychological_profile": json.dumps(
                {
                    "traits": {
                        "quiet_environment_preference": 0.95,
                        "romantic_experience_preference": 0.92,
                        "crowd_tolerance": 0.1,
                        "analytical_interest": 0.9,
                    }
                }
            ),
            "embedding_vector": embedding_str,
        },
    )


def upsert_life_graph_initial(conn, user_id: str) -> None:
    conn.execute(
        text(
            """
            DELETE FROM graph_edges
            WHERE source_node_id IN (
                SELECT id FROM graph_nodes WHERE metadata_json->>'user_id' = :user_id
            )
            OR target_node_id IN (
                SELECT id FROM graph_nodes WHERE metadata_json->>'user_id' = :user_id
            )
            """
        ),
        {"user_id": user_id},
    )
    conn.execute(
        text("DELETE FROM graph_nodes WHERE metadata_json->>'user_id' = :user_id"),
        {"user_id": user_id},
    )

    def add_node(node_type: str, name: str) -> str:
        node_id = str(uuid.uuid4())
        conn.execute(
            text(
                """
                INSERT INTO graph_nodes (id, type, name, metadata_json)
                VALUES (:id, :type, :name, CAST(:metadata_json AS jsonb))
                """
            ),
            {
                "id": node_id,
                "type": node_type,
                "name": name,
                "metadata_json": json.dumps({"user_id": user_id}),
            },
        )
        return node_id

    def add_edge(source: str, target: str, rel: str, weight: float) -> None:
        conn.execute(
            text(
                """
                INSERT INTO graph_edges (id, source_node_id, target_node_id, relationship_type, weight)
                VALUES (:id, :source_node_id, :target_node_id, :relationship_type, :weight)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "source_node_id": source,
                "target_node_id": target,
                "relationship_type": rel,
                "weight": weight,
            },
        )

    alex = add_node("person", "Alex da Cunha Marroig")
    camila = add_node("person", "Camila Veloso de Freitas")
    couple = add_node("couple", "Alex & Camila")

    interests = {
        "psychology": 1.4,
        "astrology": 1.2,
        "cinema": 1.1,
        "art exhibitions": 1.2,
        "mountain travel": 1.1,
    }
    restaurants = ["Lellis Trattoria", "Libertango", "Patties", "Z-Deli", "Issho"]
    destinations = ["Campos do Jordao", "Santo Antonio do Pinhal", "Holambra", "Ibiuna"]
    movies = ["Interestelar", "Parasita", "Os Outros", "Efeito Borboleta"]

    interest_nodes = {}
    for name, weight in interests.items():
        node_id = add_node("interest", name)
        interest_nodes[name] = node_id
        add_edge(alex, node_id, "likes", round(weight * 0.8, 3))
        add_edge(camila, node_id, "likes", round(weight * 0.9, 3))
        add_edge(couple, node_id, "favorite", weight)

    for name in restaurants:
        node_id = add_node("restaurant", name)
        add_edge(couple, node_id, "favorite", 1.0)
        add_edge(interest_nodes["cinema"], node_id, "related_to", 0.2)

    for name in destinations:
        node_id = add_node("travel_destination", name)
        add_edge(couple, node_id, "favorite", 1.0)
        add_edge(interest_nodes["mountain travel"], node_id, "related_to", 0.9)

    for name in movies:
        node_id = add_node("movie", name)
        add_edge(couple, node_id, "favorite", 1.0)
        add_edge(interest_nodes["cinema"], node_id, "related_to", 1.0)

    park = add_node("park", "Villa Lobos")
    add_edge(couple, park, "likes", 0.95)


def load_curated_catalog() -> list[dict]:
    return dedupe_catalog(load_canonical_catalog())


def seed_experiences_for_recommendation_test(conn) -> None:
    conn.execute(
        text(
            """
            DELETE FROM interactions
            WHERE experience_id IN (
                SELECT id
                FROM experiences
                WHERE source IN ('seed_real_couple', 'curated_sao_paulo', 'smoke_validation')
            )
            """
        )
    )

    conn.execute(
        text(
            """
            DELETE FROM experiences
            WHERE source IN ('seed_real_couple', 'curated_sao_paulo', 'smoke_validation')
            """
        )
    )

    now = datetime.utcnow()
    curated_rows = load_curated_catalog()

    conn.execute(
        text(
            """
            INSERT INTO experiences (
                id, title, description, category, domain, slug, city, location, neighborhood, latitude, longitude,
                start_time, price, price_band, tags, source, url, booking_url, editorial_source,
                content_tier, quality_score, availability_kind, indoor_outdoor, created_at
            ) VALUES (
                :id, :title, :description, :category, :domain, :slug, :city, :location, :neighborhood, :latitude, :longitude,
                :start_time, :price, :price_band, CAST(:tags AS jsonb), :source, :url, :booking_url, :editorial_source,
                :content_tier, :quality_score, :availability_kind, :indoor_outdoor, :created_at
            )
            """
        ),
        [
            {
                "id": str(uuid.uuid4()),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "category": item.get("category", "event"),
                "domain": item.get("domain", "events_exhibitions"),
                "slug": item.get("slug"),
                "city": "Sao Paulo",
                "location": item.get("location", ""),
                "neighborhood": item.get("neighborhood"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "start_time": now,
                "price": item.get("price", 0.0),
                "price_band": item.get("price_band"),
                "tags": json.dumps(item.get("tags", [])),
                "source": "curated_sao_paulo",
                "url": item.get("url", ""),
                "booking_url": item.get("booking_url"),
                "editorial_source": item.get("editorial_source"),
                "content_tier": item.get("content_tier"),
                "quality_score": item.get("quality_score"),
                "availability_kind": item.get("availability_kind"),
                "indoor_outdoor": item.get("indoor_outdoor"),
                "created_at": now,
            }
            for item in curated_rows
        ],
    )


def test_recommendations() -> None:
    login_resp = requests.post(
        f"{API_URL}/auth/login",
        json={"email": COUPLE_EMAIL, "password": COUPLE_PASSWORD},
        timeout=20,
    )
    login_resp.raise_for_status()
    token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    for domain in ["dining_out", "delivery", "movies_series", "events_exhibitions"]:
        resp = requests.get(
            f"{API_URL}/recommendations",
            params={"city": "Sao Paulo", "domain": domain, "weather": "rain", "limit": 3},
            headers=headers,
            timeout=20,
        )
        if resp.status_code >= 400:
            print(f"recommendation_error domain={domain} status={resp.status_code} body={resp.text}")
            continue

        rows = resp.json()
        print(f"recommendations domain={domain} count={len(rows)}")
        for item in rows[:2]:
            print(
                " -",
                item.get("title"),
                "| score=",
                item.get("score"),
                "| reason=",
                item.get("reason"),
            )


def main() -> None:
    profile_json = build_couple_profile_json()
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

    with engine.begin() as conn:
        ensure_schema(conn)
        user_id = upsert_user(conn)
        upsert_couple_members(conn, user_id)
        upsert_couple_profile(conn, user_id, profile_json)
        upsert_user_preferences(conn, user_id)
        upsert_domain_preferences(conn, user_id)
        upsert_user_profile_with_embedding(conn, user_id, profile_json)
        upsert_life_graph_initial(conn, user_id)
        seed_experiences_for_recommendation_test(conn)

    print("Seeded real couple profile")
    print("email:", COUPLE_EMAIL)
    print("password:", COUPLE_PASSWORD)
    print("user_id:", str(uuid.uuid5(uuid.NAMESPACE_DNS, COUPLE_EMAIL)))

    try:
        test_recommendations()
    except Exception as exc:
        print("recommendation_test_unavailable", exc)


if __name__ == "__main__":
    main()





