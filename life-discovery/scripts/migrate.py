from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://life:life@localhost:5432/life_discovery"


def main():
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                  id TEXT PRIMARY KEY,
                  email TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  name TEXT NOT NULL,
                  city TEXT NOT NULL,
                  country TEXT NOT NULL,
                  created_at TIMESTAMP NOT NULL
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
                  weight FLOAT NOT NULL DEFAULT 1.0
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
                  embedding_vector vector(384),
                  updated_at TIMESTAMP NOT NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS interactions (
                  id TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL,
                  experience_id TEXT NOT NULL,
                  feedback_type TEXT NOT NULL,
                  created_at TIMESTAMP NOT NULL
                )
                """
            )
        )
    print("Migration done")


if __name__ == "__main__":
    main()
