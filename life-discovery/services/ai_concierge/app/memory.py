import json
from datetime import datetime

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .models import ConversationMemory


def save_memory(user_id: str, message: str, response: dict, db: Session) -> None:
    db.add(ConversationMemory(user_id=user_id, message=message, response=response))
    db.commit()


def get_recent_memories(user_id: str, limit: int, db: Session) -> list[ConversationMemory]:
    stmt = (
        select(ConversationMemory)
        .where(ConversationMemory.user_id == user_id)
        .order_by(desc(ConversationMemory.timestamp))
        .limit(limit)
    )
    return db.execute(stmt).scalars().all()


def extract_recent_titles(memories: list[ConversationMemory]) -> set[str]:
    titles: set[str] = set()
    for m in memories:
        try:
            payload = m.response or {}
            for s in payload.get("suggestions", []):
                t = (s.get("title") or "").strip().lower()
                if t:
                    titles.add(t)
        except Exception:
            continue
    return titles
