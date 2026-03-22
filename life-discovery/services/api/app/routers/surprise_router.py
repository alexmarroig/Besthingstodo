"""
Surprise Mode router — "Surpresa do Dia".

Flow:
  1. POST /surprise/start              — opens a new session
  2. POST /surprise/{id}/answer        — each partner answers private questions
                                         (call twice: member_index=0 and member_index=1)
  3. POST /surprise/{id}/generate      — AI builds the surprise recommendation
  4. GET  /surprise/{id}               — reveal the surprise (status must be 'ready')
  5. POST /surprise/{id}/rate          — both partners rate after the experience

Uses OpenAI if available; falls back to a rule-based selection from the
experiences table filtered by the couple's profile.
"""
from __future__ import annotations

import os
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import CoupleProfile, Experience, SurpriseSession, User

router = APIRouter(prefix="/surprise", tags=["surprise"])

_OPENAI_AVAILABLE = bool(os.getenv("OPENAI_API_KEY"))

# Questions asked privately to each partner
_QUESTIONS = [
    "O que você precisa mais agora: conexão, diversão ou descanso?",
    "Qual a última coisa que fez seu parceiro(a) sorrir de verdade?",
    "Quanto tempo vocês têm disponível hoje? (ex: 2h, tarde toda)",
    "Preferência hoje: indoor ou ao ar livre?",
]


# ── Schemas ────────────────────────────────────────────────────────────────

class SurpriseStartOut(BaseModel):
    session_id: str
    questions: list[str]
    status: str


class AnswerIn(BaseModel):
    member_index: int  # 0 or 1
    answers: list[str]  # matches _QUESTIONS order


class SurpriseOut(BaseModel):
    session_id: str
    status: str
    recommendation: dict | None
    revealed_at: str | None


class RatingIn(BaseModel):
    member_index: int
    rating: int  # 1-5
    comment: str = ""


# ── Helpers ────────────────────────────────────────────────────────────────

def _rule_based_recommendation(user_id: str, answers: dict, db: Session) -> dict:
    """Fallback: pick a random high-relevance experience."""
    # Determine mood from answers
    mood_hints = " ".join(
        v for sublist in answers.values() for v in (sublist if isinstance(sublist, list) else [sublist])
    ).lower()

    category = "cultural"
    if "cinema" in mood_hints or "filme" in mood_hints:
        category = "cinema"
    elif "restaurante" in mood_hints or "comer" in mood_hints or "jantar" in mood_hints:
        category = "restaurant"
    elif "diversão" in mood_hints or "divertir" in mood_hints:
        category = "cultural"

    profile = db.execute(
        select(CoupleProfile).where(CoupleProfile.user_id == user_id)
    ).scalar_one_or_none()

    exps = db.execute(
        select(Experience)
        .where(Experience.category == category, Experience.city == "Sao Paulo")
        .limit(20)
    ).scalars().all()

    if not exps:
        exps = db.execute(select(Experience).where(Experience.city == "Sao Paulo").limit(20)).scalars().all()

    if not exps:
        return {"title": "Passeio surpresa", "description": "Um momento especial a ser descoberto juntos."}

    chosen = random.choice(exps)
    return {
        "experience_id": chosen.id,
        "title": chosen.title,
        "description": chosen.description,
        "venue": chosen.location,
        "url": chosen.url,
        "price": chosen.price,
        "category": chosen.category,
        "reason": "Selecionado especialmente com base nos seus humores de hoje!",
    }


async def _ai_recommendation(user_id: str, answers: dict, db: Session) -> dict:
    """Use OpenAI to craft the surprise recommendation."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        )

        profile = db.execute(
            select(CoupleProfile).where(CoupleProfile.user_id == user_id)
        ).scalar_one_or_none()
        profile_summary = str(profile.couple_profile_json)[:800] if profile else "Casal em São Paulo."

        answers_text = "\n".join(
            f"Parceiro {i}: {'; '.join(v if isinstance(v, list) else [v])}"
            for i, v in answers.items()
        )

        system = (
            "Você é o concierge de surpresas do Life Discovery. "
            "Baseado nos humores e perfil do casal, sugira UMA experiência surpresa para hoje em São Paulo. "
            "Responda em JSON com: title, description, venue, category, reason, estimated_price_brl."
        )
        prompt = f"Perfil do casal: {profile_summary}\n\nRespostas privadas:\n{answers_text}"

        resp = await client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.8,
        )
        import json
        return json.loads(resp.choices[0].message.content or "{}")
    except Exception:
        return _rule_based_recommendation(user_id, answers, db)


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/start", response_model=SurpriseStartOut, status_code=201)
def start_surprise(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = SurpriseSession(user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return SurpriseStartOut(
        session_id=session.id,
        questions=_QUESTIONS,
        status="pending_answers",
    )


@router.post("/{session_id}/answer")
def submit_answer(
    session_id: str,
    payload: AnswerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sess = db.get(SurpriseSession, session_id)
    if not sess or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.status not in ("pending_answers",):
        raise HTTPException(status_code=400, detail=f"Session already in status: {sess.status}")

    answers = dict(sess.member_answers) if sess.member_answers else {}
    answers[str(payload.member_index)] = payload.answers
    sess.member_answers = answers

    # Both members answered → ready to generate
    if len(answers) >= 2:
        sess.status = "ready_to_generate"

    db.commit()
    return {
        "received": True,
        "members_answered": len(answers),
        "status": sess.status,
    }


@router.post("/{session_id}/generate")
async def generate_surprise(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sess = db.get(SurpriseSession, session_id)
    if not sess or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.status not in ("ready_to_generate", "pending_answers"):
        raise HTTPException(status_code=400, detail=f"Session status: {sess.status}")

    answers = sess.member_answers or {}
    if _OPENAI_AVAILABLE:
        rec = await _ai_recommendation(user.id, answers, db)
    else:
        rec = _rule_based_recommendation(user.id, answers, db)

    sess.recommendation = rec
    sess.status = "ready"
    sess.revealed_at = datetime.utcnow()
    db.commit()
    return {"status": "ready", "message": "Sua surpresa está pronta! Use GET /surprise/{id} para revelar."}


@router.get("/{session_id}", response_model=SurpriseOut)
def reveal_surprise(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sess = db.get(SurpriseSession, session_id)
    if not sess or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return SurpriseOut(
        session_id=sess.id,
        status=sess.status,
        recommendation=sess.recommendation if sess.status in ("ready", "revealed", "reviewed") else None,
        revealed_at=sess.revealed_at.isoformat() if sess.revealed_at else None,
    )


@router.post("/{session_id}/rate")
def rate_surprise(
    session_id: str,
    payload: RatingIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sess = db.get(SurpriseSession, session_id)
    if not sess or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    ratings = dict(sess.post_ratings) if sess.post_ratings else {}
    ratings[str(payload.member_index)] = {"rating": payload.rating, "comment": payload.comment}
    sess.post_ratings = ratings

    if len(ratings) >= 2:
        sess.status = "reviewed"

    db.commit()
    return {"rated": True, "ratings_collected": len(ratings)}
