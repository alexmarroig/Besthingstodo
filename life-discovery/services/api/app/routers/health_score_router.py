"""
Relationship Health Score router.

The Health Score (0-100) measures the vitality of the couple's engagement
with Life Discovery. It combines 4 components:

  engagement   (30 pts) — activity in last 30 days (interactions, feedback)
  diversity    (25 pts) — variety of experience categories explored
  harmony      (25 pts) — agreement between partners (low dislike conflict)
  memories     (20 pts) — memories + love map pins created

Endpoints:
  GET  /health-score          — compute & return current health score
  GET  /health-score/report   — return last monthly report (premium only)
  POST /health-score/report   — generate/refresh monthly report
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import (
    CoupleMemory,
    HealthScore,
    Interaction,
    LoveMapPin,
    Subscription,
    TIER_FREE,
    User,
)

router = APIRouter(prefix="/health-score", tags=["health-score"])


# ── Schemas ────────────────────────────────────────────────────────────────

class HealthComponentOut(BaseModel):
    score: float          # 0-100 for this component
    max_score: float
    label: str
    description: str


class HealthScoreOut(BaseModel):
    total: float          # 0-100
    trend: str            # up | stable | down
    insight: str
    components: dict[str, HealthComponentOut]
    computed_at: str


class MonthlyReportOut(BaseModel):
    month: str            # YYYY-MM
    highlights: list[str]
    stats: dict
    recommendations: list[str]
    computed_at: str


# ── Calculation logic ──────────────────────────────────────────────────────

_LOOKBACK_DAYS = 30
_MAX_ENGAGEMENT = 30.0
_MAX_DIVERSITY = 25.0
_MAX_HARMONY = 25.0
_MAX_MEMORIES = 20.0


def _compute_health(user_id: str, db: Session) -> dict:
    now = datetime.utcnow()
    since = now - timedelta(days=_LOOKBACK_DAYS)

    # ── Engagement ─────────────────────────────────────────────────────────
    interactions_count = db.execute(
        select(func.count(Interaction.id)).where(
            Interaction.user_id == user_id,
            Interaction.created_at >= since,
        )
    ).scalar() or 0
    # Saturates at 60 interactions/month → 30 pts
    engagement_score = min(_MAX_ENGAGEMENT, (interactions_count / 60) * _MAX_ENGAGEMENT)

    # ── Diversity ──────────────────────────────────────────────────────────
    # Count distinct experience domains touched recently via interactions
    from ..models import Experience
    rows = db.execute(
        select(Experience.domain).join(
            Interaction, Interaction.experience_id == Experience.id
        ).where(
            Interaction.user_id == user_id,
            Interaction.created_at >= since,
            Interaction.decision.in_(["accepted", "done", "saved", "like"]),
        ).distinct()
    ).scalars().all()
    distinct_domains = len(set(rows))  # max ~4 domains
    diversity_score = min(_MAX_DIVERSITY, (distinct_domains / 4) * _MAX_DIVERSITY)

    # ── Harmony (low conflict) ─────────────────────────────────────────────
    # Harmony = high when ratio of positive to total is high
    positive = db.execute(
        select(func.count(Interaction.id)).where(
            Interaction.user_id == user_id,
            Interaction.created_at >= since,
            Interaction.decision.in_(["accepted", "done", "saved", "like"]),
        )
    ).scalar() or 0
    total = max(1, interactions_count)
    harmony_ratio = positive / total  # 0-1
    harmony_score = harmony_ratio * _MAX_HARMONY

    # ── Memories ───────────────────────────────────────────────────────────
    memory_count = db.execute(
        select(func.count(CoupleMemory.id)).where(
            CoupleMemory.user_id == user_id,
            CoupleMemory.created_at >= since,
        )
    ).scalar() or 0
    pin_count = db.execute(
        select(func.count(LoveMapPin.id)).where(
            LoveMapPin.user_id == user_id,
            LoveMapPin.created_at >= since,
        )
    ).scalar() or 0
    memory_total = memory_count + pin_count
    memory_score = min(_MAX_MEMORIES, (memory_total / 5) * _MAX_MEMORIES)

    total_score = round(engagement_score + diversity_score + harmony_score + memory_score, 1)

    return {
        "total": total_score,
        "components": {
            "engagement": {
                "score": round(engagement_score, 1),
                "max_score": _MAX_ENGAGEMENT,
                "label": "Engajamento",
                "description": f"{interactions_count} interações nos últimos 30 dias",
            },
            "diversity": {
                "score": round(diversity_score, 1),
                "max_score": _MAX_DIVERSITY,
                "label": "Diversidade",
                "description": f"{distinct_domains} categoria(s) explorada(s)",
            },
            "harmony": {
                "score": round(harmony_score, 1),
                "max_score": _MAX_HARMONY,
                "label": "Harmonia",
                "description": f"{round(harmony_ratio * 100)}% das sugestões foram curtidas",
            },
            "memories": {
                "score": round(memory_score, 1),
                "max_score": _MAX_MEMORIES,
                "label": "Memórias",
                "description": f"{memory_count} memória(s) e {pin_count} pin(s) no mapa",
            },
        },
    }


def _generate_insight(total: float, components: dict, prev_score: float | None) -> tuple[str, str]:
    trend = "stable"
    if prev_score is not None:
        diff = total - prev_score
        if diff >= 5:
            trend = "up"
        elif diff <= -5:
            trend = "down"

    if total >= 80:
        insight = "Vocês estão em plena sintonia! Continuem explorando juntos."
    elif total >= 60:
        insight = "Ótima energia! Experimente categorias novas para ganhar mais pontos de diversidade."
    elif total >= 40:
        low = min(components, key=lambda k: components[k]["score"] / components[k]["max_score"])
        insight = f"Foco em '{components[low]['label']}' pode elevar bastante o score. {components[low]['description']}."
    else:
        insight = "Que tal uma descoberta hoje? Cada interação aquece a chama do relacionamento."

    return insight, trend


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=HealthScoreOut)
def get_health_score(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prev_row = db.execute(
        select(HealthScore).where(HealthScore.user_id == user.id)
    ).scalar_one_or_none()
    prev_score = prev_row.score if prev_row else None

    data = _compute_health(user.id, db)
    insight, trend = _generate_insight(data["total"], data["components"], prev_score)

    # Upsert health score
    if prev_row is None:
        hs = HealthScore(
            user_id=user.id,
            score=data["total"],
            components=data["components"],
            trend=trend,
            insight=insight,
        )
        db.add(hs)
    else:
        prev_row.score = data["total"]
        prev_row.components = data["components"]
        prev_row.trend = trend
        prev_row.insight = insight
        prev_row.computed_at = datetime.utcnow()
        hs = prev_row

    db.commit()

    return HealthScoreOut(
        total=data["total"],
        trend=trend,
        insight=insight,
        components={k: HealthComponentOut(**v) for k, v in data["components"].items()},
        computed_at=datetime.utcnow().isoformat(),
    )


@router.get("/report", response_model=MonthlyReportOut)
def get_monthly_report(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the last generated monthly report (Plus/Premium only)."""
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    ).scalar_one_or_none()
    if sub is None or sub.tier == TIER_FREE:
        raise HTTPException(
            status_code=403,
            detail="Relatório mensal disponível apenas nos planos Plus e Premium.",
        )

    hs = db.execute(
        select(HealthScore).where(HealthScore.user_id == user.id)
    ).scalar_one_or_none()

    if not hs or not hs.monthly_report:
        raise HTTPException(
            status_code=404,
            detail="Nenhum relatório mensal gerado ainda. Use POST /health-score/report para gerar.",
        )

    r = hs.monthly_report
    return MonthlyReportOut(
        month=r.get("month", ""),
        highlights=r.get("highlights", []),
        stats=r.get("stats", {}),
        recommendations=r.get("recommendations", []),
        computed_at=r.get("computed_at", ""),
    )


@router.post("/report", response_model=MonthlyReportOut)
def generate_monthly_report(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate/refresh the monthly report (Plus/Premium only)."""
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    ).scalar_one_or_none()
    if sub is None or sub.tier == TIER_FREE:
        raise HTTPException(
            status_code=403,
            detail="Relatório mensal disponível apenas nos planos Plus e Premium.",
        )

    now = datetime.utcnow()
    data = _compute_health(user.id, db)

    # Build report
    from ..models import CoupleMemory, Interaction
    interaction_count = db.execute(
        select(func.count(Interaction.id)).where(
            Interaction.user_id == user.id,
            Interaction.created_at >= now - timedelta(days=30),
        )
    ).scalar() or 0
    memory_count = db.execute(
        select(func.count(CoupleMemory.id)).where(
            CoupleMemory.user_id == user.id,
        )
    ).scalar() or 0

    highlights = []
    if data["total"] >= 80:
        highlights.append("Mês excelente! Vocês exploraram juntos com muita energia.")
    if data["components"]["diversity"]["score"] >= 20:
        highlights.append("Diversidade incrível: exploraram múltiplas categorias de experiências.")
    if memory_count >= 3:
        highlights.append(f"Criaram {memory_count} memórias — o Mapa do Amor está crescendo!")
    if not highlights:
        highlights.append("Cada descoberta conta. Continue explorando para próximos meses mais ricos.")

    recommendations = []
    for k, comp in data["components"].items():
        if comp["score"] / comp["max_score"] < 0.5:
            if k == "engagement":
                recommendations.append("Interajam com mais sugestões — curtir ou recusar alimenta o algoritmo.")
            elif k == "diversity":
                recommendations.append("Experimentem uma categoria nova: cinema, exposição, delivery ou evento.")
            elif k == "harmony":
                recommendations.append("Explorem juntos: acordar em tipos de programa fortalece a harmonia.")
            elif k == "memories":
                recommendations.append("Registrem o próximo encontro no Mapa do Amor — são só 30 segundos.")

    report = {
        "month": now.strftime("%Y-%m"),
        "highlights": highlights,
        "stats": {
            "health_score": data["total"],
            "interactions": interaction_count,
            "memories": memory_count,
            **{k: v["score"] for k, v in data["components"].items()},
        },
        "recommendations": recommendations,
        "computed_at": now.isoformat(),
    }

    hs = db.execute(
        select(HealthScore).where(HealthScore.user_id == user.id)
    ).scalar_one_or_none()
    if hs is None:
        hs = HealthScore(user_id=user.id, score=data["total"], components=data["components"])
        db.add(hs)
    hs.monthly_report = report
    hs.computed_at = now
    db.commit()

    return MonthlyReportOut(**report)
