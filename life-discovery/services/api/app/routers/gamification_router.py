"""
Gamification router — streaks, badges, and challenges.

Endpoints:
  GET  /gamification/streak          — current streak info
  POST /gamification/streak/ping     — register today's activity (call on app open)
  GET  /gamification/badges          — all earned badges
  GET  /gamification/challenges      — active challenges
  POST /gamification/challenges/seed — seed default challenges for a new user
  POST /gamification/challenges/{id}/progress — increment challenge progress
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import (
    CoupleBadge,
    CoupleChallenge,
    CoupleStreak,
    Interaction,
    CoupleMemory,
    User,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])


# ── Badge definitions ──────────────────────────────────────────────────────

BADGE_DEFINITIONS: dict[str, dict] = {
    "first_date": {
        "name": "Primeira Aventura",
        "emoji": "🌟",
        "description": "Registrou a primeira memória juntos",
    },
    "streak_3": {
        "name": "Em Chama",
        "emoji": "🔥",
        "description": "3 dias seguidos de interação no app",
    },
    "streak_7": {
        "name": "Chama Acesa",
        "emoji": "🔥🔥",
        "description": "7 dias seguidos de interação no app",
    },
    "streak_30": {
        "name": "Incandescentes",
        "emoji": "🌋",
        "description": "30 dias seguidos de interação",
    },
    "explorer_10": {
        "name": "Exploradores",
        "emoji": "🏆",
        "description": "10 experiências novas nos últimos 30 dias",
    },
    "versatile": {
        "name": "Versáteis",
        "emoji": "🎭",
        "description": "Exploraram 4 categorias diferentes de experiências",
    },
    "map_5": {
        "name": "Desbravadores",
        "emoji": "🗺️",
        "description": "5 pins no Mapa do Amor",
    },
    "memory_10": {
        "name": "Guardiões da Memória",
        "emoji": "📸",
        "description": "10 memórias registradas",
    },
    "health_80": {
        "name": "Conexão Profunda",
        "emoji": "💞",
        "description": "Health Score acima de 80",
    },
}

# ── Default challenges ──────────────────────────────────────────────────────

DEFAULT_CHALLENGES: list[dict] = [
    {
        "challenge_key": "explore_10_new",
        "title": "10 Novas Descobertas",
        "description": "Aceitem ou curtam 10 sugestões novas em 30 dias",
        "target_count": 10,
        "badge_reward": "explorer_10",
    },
    {
        "challenge_key": "streak_7",
        "title": "7 Dias Juntos",
        "description": "Abram o app e interajam por 7 dias seguidos",
        "target_count": 7,
        "badge_reward": "streak_7",
    },
    {
        "challenge_key": "new_category",
        "title": "Virada Cultural",
        "description": "Experimentem uma categoria que nunca exploraram antes",
        "target_count": 1,
        "badge_reward": "versatile",
    },
    {
        "challenge_key": "add_3_memories",
        "title": "Caça às Memórias",
        "description": "Registrem 3 encontros no diário do casal",
        "target_count": 3,
        "badge_reward": "memory_10",
    },
    {
        "challenge_key": "love_map_5",
        "title": "Mapa do Amor",
        "description": "Marquem 5 lugares especiais no Mapa do Amor",
        "target_count": 5,
        "badge_reward": "map_5",
    },
]


# ── Schemas ────────────────────────────────────────────────────────────────

class StreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    total_active_days: int
    last_activity_date: str | None
    status: str  # active | broken | new


class BadgeOut(BaseModel):
    badge_key: str
    name: str
    emoji: str
    description: str
    earned_at: str


class ChallengeOut(BaseModel):
    id: str
    challenge_key: str
    title: str
    description: str
    target_count: int
    current_count: int
    status: str
    badge_reward: str | None
    progress_pct: float


# ── Helpers ────────────────────────────────────────────────────────────────

def _award_badge(user_id: str, badge_key: str, db: Session) -> CoupleBadge | None:
    """Award a badge if not already earned."""
    existing = db.execute(
        select(CoupleBadge).where(
            CoupleBadge.user_id == user_id,
            CoupleBadge.badge_key == badge_key,
        )
    ).scalar_one_or_none()
    if existing:
        return None
    defn = BADGE_DEFINITIONS.get(badge_key)
    if not defn:
        return None
    badge = CoupleBadge(
        user_id=user_id,
        badge_key=badge_key,
        badge_name=defn["name"],
        badge_emoji=defn["emoji"],
        description=defn["description"],
    )
    db.add(badge)
    return badge


def _check_badge_triggers(user_id: str, streak: CoupleStreak, db: Session) -> list[str]:
    """Check if any badges should be auto-awarded based on current state."""
    awarded: list[str] = []

    # Streak badges
    for days, key in [(3, "streak_3"), (7, "streak_7"), (30, "streak_30")]:
        if streak.current_streak >= days:
            if _award_badge(user_id, key, db):
                awarded.append(key)

    # Memory badges
    mem_count = db.execute(
        select(CoupleMemory).where(CoupleMemory.user_id == user_id)
    ).scalars().all()
    if len(mem_count) >= 1 and _award_badge(user_id, "first_date", db):
        awarded.append("first_date")
    if len(mem_count) >= 10 and _award_badge(user_id, "memory_10", db):
        awarded.append("memory_10")

    return awarded


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakOut)
def get_streak(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    streak = db.execute(
        select(CoupleStreak).where(CoupleStreak.user_id == user.id)
    ).scalar_one_or_none()
    if not streak:
        return StreakOut(
            current_streak=0, longest_streak=0, total_active_days=0,
            last_activity_date=None, status="new",
        )
    today = date.today()
    status = "active"
    if streak.last_activity_date:
        diff = (today - streak.last_activity_date).days
        if diff == 0:
            status = "active"
        elif diff == 1:
            status = "active"  # yesterday — not broken yet
        else:
            status = "broken"
    return StreakOut(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        total_active_days=streak.total_active_days,
        last_activity_date=streak.last_activity_date.isoformat() if streak.last_activity_date else None,
        status=status,
    )


@router.post("/streak/ping", response_model=StreakOut)
def ping_streak(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Call this on every meaningful user interaction to maintain streak."""
    today = date.today()
    streak = db.execute(
        select(CoupleStreak).where(CoupleStreak.user_id == user.id)
    ).scalar_one_or_none()

    if streak is None:
        streak = CoupleStreak(user_id=user.id, current_streak=1, longest_streak=1,
                              last_activity_date=today, total_active_days=1)
        db.add(streak)
    else:
        if streak.last_activity_date == today:
            pass  # already counted today
        elif streak.last_activity_date == today - timedelta(days=1):
            streak.current_streak += 1
            streak.total_active_days += 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        else:
            streak.current_streak = 1
            streak.total_active_days += 1
        streak.last_activity_date = today
        streak.updated_at = datetime.utcnow()

    new_badges = _check_badge_triggers(user.id, streak, db)
    db.commit()

    status = "active" if streak.current_streak > 0 else "new"
    return StreakOut(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        total_active_days=streak.total_active_days,
        last_activity_date=streak.last_activity_date.isoformat() if streak.last_activity_date else None,
        status=status,
    )


@router.get("/badges", response_model=list[BadgeOut])
def list_badges(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    badges = db.execute(
        select(CoupleBadge).where(CoupleBadge.user_id == user.id)
        .order_by(CoupleBadge.earned_at.desc())
    ).scalars().all()
    return [
        BadgeOut(
            badge_key=b.badge_key,
            name=b.badge_name,
            emoji=b.badge_emoji,
            description=b.description,
            earned_at=b.earned_at.isoformat(),
        )
        for b in badges
    ]


@router.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    challenges = db.execute(
        select(CoupleChallenge).where(
            CoupleChallenge.user_id == user.id,
            CoupleChallenge.status == "active",
        ).order_by(CoupleChallenge.created_at.desc())
    ).scalars().all()
    return [
        ChallengeOut(
            id=c.id,
            challenge_key=c.challenge_key,
            title=c.title,
            description=c.description,
            target_count=c.target_count,
            current_count=c.current_count,
            status=c.status,
            badge_reward=c.badge_reward,
            progress_pct=round(c.current_count / max(1, c.target_count) * 100, 1),
        )
        for c in challenges
    ]


@router.post("/challenges/seed", status_code=201)
def seed_challenges(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Seed default challenges for a new user (idempotent)."""
    existing_keys = {
        c.challenge_key for c in db.execute(
            select(CoupleChallenge).where(CoupleChallenge.user_id == user.id)
        ).scalars().all()
    }
    expires = datetime.utcnow() + timedelta(days=30)
    created = 0
    for defn in DEFAULT_CHALLENGES:
        if defn["challenge_key"] not in existing_keys:
            db.add(CoupleChallenge(
                user_id=user.id,
                expires_at=expires,
                **defn,
            ))
            created += 1
    db.commit()
    return {"seeded": created}


@router.post("/challenges/{challenge_id}/progress")
def increment_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Increment progress on an active challenge."""
    c = db.get(CoupleChallenge, challenge_id)
    if not c or c.user_id != user.id or c.status != "active":
        return {"status": "not_found"}

    c.current_count = min(c.target_count, c.current_count + 1)
    if c.current_count >= c.target_count:
        c.status = "completed"
        c.completed_at = datetime.utcnow()
        if c.badge_reward:
            _award_badge(user.id, c.badge_reward, db)

    db.commit()
    return {
        "status": c.status,
        "current_count": c.current_count,
        "target_count": c.target_count,
        "completed": c.status == "completed",
    }
