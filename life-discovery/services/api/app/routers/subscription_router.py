"""
Subscription router — manage user subscription tiers.

Tiers:
  free     R$  0  — 5 recommendations/day, basic DNA
  plus     R$ 19.90/month — unlimited recs, AI concierge, monthly reports
  premium  R$ 39.90/month — everything + love map, unlimited memories,
                            exclusive challenges, concierge with memory

In production this would integrate with Stripe or Pagar.me.
For now, endpoints allow direct tier management (useful for testing/admin).

Endpoints:
  GET  /subscription            — get current subscription
  POST /subscription/upgrade    — upgrade tier (webhook-ready stub)
  POST /subscription/cancel     — cancel / downgrade to free
  GET  /subscription/plans      — list available plans with features
"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Subscription, TIER_FREE, TIER_PLUS, TIER_PREMIUM, User

router = APIRouter(prefix="/subscription", tags=["subscription"])


# ── Plan definitions ───────────────────────────────────────────────────────

PLANS = {
    TIER_FREE: {
        "name": "Free",
        "price_brl": 0.0,
        "billing": "forever",
        "features": [
            "5 recomendações por dia",
            "DNA Cultural básico",
            "Mapa do Amor (3 pins)",
            "5 memórias salvas",
        ],
        "limits": {
            "daily_recommendations": 5,
            "memories": 5,
            "love_map_pins": 3,
            "diary_threads": 2,
        },
    },
    TIER_PLUS: {
        "name": "Plus",
        "price_brl": 19.90,
        "billing": "monthly",
        "features": [
            "Recomendações ilimitadas",
            "Concierge IA com memória",
            "Relatórios mensais de saúde",
            "Mapa do Amor ilimitado",
            "50 memórias",
            "Surpresa do Dia ilimitada",
            "Diário do Casal com IA",
        ],
        "limits": {
            "daily_recommendations": -1,  # unlimited
            "memories": 50,
            "love_map_pins": -1,
            "diary_threads": -1,
        },
    },
    TIER_PREMIUM: {
        "name": "Premium",
        "price_brl": 39.90,
        "billing": "monthly",
        "features": [
            "Tudo do Plus",
            "Memórias ilimitadas",
            "Desafios exclusivos",
            "Concierge com memória completa",
            "Widget de casal para tela inicial",
            "Suporte prioritário",
            "Accesso antecipado a novidades",
        ],
        "limits": {
            "daily_recommendations": -1,
            "memories": -1,
            "love_map_pins": -1,
            "diary_threads": -1,
        },
    },
}


# ── Schemas ────────────────────────────────────────────────────────────────

class SubscriptionOut(BaseModel):
    tier: str
    tier_name: str
    price_brl: float
    expires_at: str | None
    features: list[str]
    limits: dict


class UpgradeIn(BaseModel):
    tier: str  # plus | premium
    # In production: payment_token from Stripe/PagarMe
    payment_token: str | None = None
    # Duration in months (default 1)
    months: int = 1


class PlansOut(BaseModel):
    plans: dict


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/plans", response_model=PlansOut)
def list_plans():
    return PlansOut(plans=PLANS)


@router.get("", response_model=SubscriptionOut)
def get_subscription(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    ).scalar_one_or_none()

    tier = TIER_FREE
    expires_at = None
    if sub:
        # Check expiry
        if sub.expires_at and sub.expires_at < datetime.utcnow():
            tier = TIER_FREE
        else:
            tier = sub.tier
            expires_at = sub.expires_at.isoformat() if sub.expires_at else None

    plan = PLANS[tier]
    return SubscriptionOut(
        tier=tier,
        tier_name=plan["name"],
        price_brl=plan["price_brl"],
        expires_at=expires_at,
        features=plan["features"],
        limits=plan["limits"],
    )


@router.post("/upgrade", response_model=SubscriptionOut)
def upgrade_subscription(
    payload: UpgradeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.tier not in (TIER_PLUS, TIER_PREMIUM):
        raise HTTPException(status_code=400, detail="Tier inválido. Use 'plus' ou 'premium'.")

    # In production: validate payment_token with Stripe/PagarMe here.
    # For now we accept without payment in development.

    expires = datetime.utcnow() + timedelta(days=30 * max(1, payload.months))

    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    ).scalar_one_or_none()

    if sub is None:
        sub = Subscription(user_id=user.id, tier=payload.tier, expires_at=expires)
        db.add(sub)
    else:
        sub.tier = payload.tier
        sub.expires_at = expires
        sub.updated_at = datetime.utcnow()

    db.commit()

    plan = PLANS[payload.tier]
    return SubscriptionOut(
        tier=payload.tier,
        tier_name=plan["name"],
        price_brl=plan["price_brl"],
        expires_at=expires.isoformat(),
        features=plan["features"],
        limits=plan["limits"],
    )


@router.post("/cancel", response_model=SubscriptionOut)
def cancel_subscription(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    ).scalar_one_or_none()
    if sub:
        sub.tier = TIER_FREE
        sub.expires_at = None
        sub.updated_at = datetime.utcnow()
        db.commit()

    plan = PLANS[TIER_FREE]
    return SubscriptionOut(
        tier=TIER_FREE,
        tier_name=plan["name"],
        price_brl=plan["price_brl"],
        expires_at=None,
        features=plan["features"],
        limits=plan["limits"],
    )
