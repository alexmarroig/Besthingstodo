import json

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://life:life@localhost:5432/life_discovery"


def main():
    with open("scripts/onboarding_questions.json", "r", encoding="utf-8") as f:
        questions = json.load(f)

    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS onboarding_questions (
                  id SERIAL PRIMARY KEY,
                  question_key TEXT UNIQUE NOT NULL,
                  question_text TEXT NOT NULL,
                  category TEXT NOT NULL,
                  weight FLOAT NOT NULL DEFAULT 1.0
                )
                """
            )
        )
        for q in questions:
            conn.execute(
                text(
                    """
                    INSERT INTO onboarding_questions (question_key, question_text, category, weight)
                    VALUES (:question_key, :question_text, :category, :weight)
                    ON CONFLICT (question_key) DO UPDATE SET
                      question_text = EXCLUDED.question_text,
                      category = EXCLUDED.category,
                      weight = EXCLUDED.weight
                    """
                ),
                q,
            )
    print(f"Seeded {len(questions)} onboarding questions")


if __name__ == "__main__":
    main()
