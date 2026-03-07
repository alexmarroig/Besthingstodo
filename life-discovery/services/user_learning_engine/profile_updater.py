from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sklearn.preprocessing import normalize
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from signals import apply_time_decay, convert_interaction_to_signal


@dataclass
class Settings:
    database_url: str
    lambda_decay: float = 0.05


def get_engine(database_url: str) -> Engine:
    return create_engine(database_url, pool_pre_ping=True)


def ensure_tables(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_preference_weights (
                    user_id TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    weight DOUBLE PRECISION NOT NULL DEFAULT 0,
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (user_id, tag)
                )
                """
            )
        )


def get_recent_interactions(engine: Engine, hours: int = 168) -> list[dict[str, Any]]:
    query = text(
        """
        SELECT
            i.user_id,
            i.experience_id,
            i.feedback_type AS interaction_type,
            i.created_at,
            e.tags,
            e.embedding
        FROM interactions i
        JOIN experiences e ON e.id = i.experience_id
        WHERE i.created_at >= NOW() - (:hours || ' hours')::interval
        ORDER BY i.created_at DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(query, {"hours": hours}).mappings().all()
    return [dict(r) for r in rows]


def update_tag_weights(engine: Engine, interactions: list[dict[str, Any]], lambda_decay: float = 0.05) -> None:
    agg: dict[tuple[str, str], float] = defaultdict(float)

    for row in interactions:
        user_id = row["user_id"]
        event_time = row["created_at"]
        signal = convert_interaction_to_signal(row.get("interaction_type", ""))
        decayed = apply_time_decay(signal, event_time, lambda_decay=lambda_decay)
        tags = row.get("tags") or []
        for tag in tags:
            t = str(tag).strip().lower()
            if t:
                agg[(user_id, t)] += decayed

    if not agg:
        return

    upsert = text(
        """
        INSERT INTO user_preference_weights (user_id, tag, weight, updated_at)
        VALUES (:user_id, :tag, :weight, NOW())
        ON CONFLICT (user_id, tag)
        DO UPDATE SET
            weight = GREATEST(0.0, user_preference_weights.weight * 0.98 + EXCLUDED.weight),
            updated_at = NOW()
        """
    )

    with engine.begin() as conn:
        for (user_id, tag), weight in agg.items():
            conn.execute(upsert, {"user_id": user_id, "tag": tag, "weight": float(weight)})


def _to_float_array(value: Any) -> np.ndarray | None:
    if value is None:
        return None
    try:
        arr = np.array(value, dtype=np.float32)
        if arr.ndim != 1 or arr.size == 0:
            return None
        return arr
    except Exception:
        return None


def update_user_embeddings(engine: Engine, interactions: list[dict[str, Any]], lambda_decay: float = 0.05) -> None:
    by_user: dict[str, list[tuple[float, np.ndarray]]] = defaultdict(list)

    for row in interactions:
        interaction_type = (row.get("interaction_type") or "").lower().strip()
        if interaction_type not in {"like", "save", "click", "view", "dislike"}:
            continue

        signal = convert_interaction_to_signal(interaction_type)
        if signal <= 0:
            continue

        vec = _to_float_array(row.get("embedding"))
        if vec is None:
            continue

        decayed = apply_time_decay(signal, row["created_at"], lambda_decay=lambda_decay)
        by_user[row["user_id"]].append((decayed, vec))

    if not by_user:
        return

    upsert = text(
        """
        INSERT INTO user_profiles (id, user_id, profile_json, embedding_vector, updated_at)
        VALUES (:id, :user_id, CAST(:profile_json AS jsonb), :embedding_vector, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            embedding_vector = EXCLUDED.embedding_vector,
            updated_at = NOW()
        """
    )

    with engine.begin() as conn:
        for user_id, weighted_vectors in by_user.items():
            weights = np.array([max(0.0001, w) for w, _ in weighted_vectors], dtype=np.float32)
            vectors = np.vstack([v for _, v in weighted_vectors])
            avg = np.average(vectors, axis=0, weights=weights)
            avg_norm = normalize(avg.reshape(1, -1))[0].astype(np.float32)

            conn.execute(
                upsert,
                {
                    "id": user_id,
                    "user_id": user_id,
                    "profile_json": '{"auto_updated": true}',
                    "embedding_vector": avg_norm.tolist(),
                },
            )


def refresh_user_profiles(engine: Engine, lambda_decay: float = 0.05) -> dict[str, Any]:
    ensure_tables(engine)
    interactions = get_recent_interactions(engine)
    update_tag_weights(engine, interactions, lambda_decay=lambda_decay)
    update_user_embeddings(engine, interactions, lambda_decay=lambda_decay)

    return {
        "processed_interactions": len(interactions),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
