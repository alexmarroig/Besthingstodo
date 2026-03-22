"""
Couple Diary router — async threads + AI concierge with memory.

"Diário do Casal": weekly reflection threads, memory prompts, and
AI-generated insights that summarize conversations and remind the couple
of past shared moments ("Lembra quando...").

Endpoints:
  GET  /diary                    — list all threads
  POST /diary                    — create a new thread
  GET  /diary/{id}               — get thread with messages
  POST /diary/{id}/message       — add a message (member or AI)
  POST /diary/{id}/summarize     — AI summarizes the thread (Plus/Premium)
  GET  /diary/prompt             — get today's AI-generated reflection prompt
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
from ..models import (
    CoupleMemory,
    DiaryMessage,
    DiaryThread,
    Subscription,
    TIER_FREE,
    User,
)

router = APIRouter(prefix="/diary", tags=["diary"])

_WEEKLY_PROMPTS = [
    "O que foi especial para vocês essa semana?",
    "Qual momento dos últimos dias você gostaria de reviver?",
    "O que seu parceiro(a) fez recentemente que te surpreendeu positivamente?",
    "Se pudessem fazer uma coisa juntos amanhã, o que seria?",
    "Qual experiência recente te fez sentir mais conectado(a)?",
    "O que você está animado(a) para descobrir juntos em breve?",
    "Tem um lugar que vocês ainda não visitaram mas querem muito? Qual?",
]

_NOSTALGIA_PROMPTS = [
    "Lembra quando vocês foram a {venue}? O que foi mais especial?",
    "Essa memória de {title} ainda está viva para você?",
    "Se fossem revisitar {venue}, o que fariam diferente?",
]


# ── Schemas ────────────────────────────────────────────────────────────────

class ThreadCreate(BaseModel):
    title: str
    thread_type: str = "weekly_reflection"  # weekly_reflection|memory|challenge|free


class MessageIn(BaseModel):
    content: str
    author_type: str = "member_0"  # member_0 | member_1
    memory_id: str | None = None


class MessageOut(BaseModel):
    id: str
    author_type: str
    content: str
    memory_id: str | None
    created_at: str


class ThreadOut(BaseModel):
    id: str
    title: str
    thread_type: str
    status: str
    ai_summary: str | None
    messages: list[MessageOut]
    created_at: str


# ── AI helpers ─────────────────────────────────────────────────────────────

async def _ai_summarize(thread: DiaryThread, messages: list[DiaryMessage]) -> str:
    """Use OpenAI to summarize thread; falls back to simple rule-based summary."""
    if not os.getenv("OPENAI_API_KEY"):
        return _fallback_summary(messages)
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        )
        conversation = "\n".join(
            f"{m.author_type}: {m.content}" for m in messages
            if m.author_type != "ai"
        )
        system = (
            "Você é o concierge do Life Discovery. "
            "Leia essa conversa do casal e escreva um resumo caloroso e empático em 2-3 frases, "
            "destacando os sentimentos e conexões compartilhados. Responda em português."
        )
        resp = await client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Conversa:\n{conversation}"},
            ],
            temperature=0.7,
        )
        return resp.choices[0].message.content or _fallback_summary(messages)
    except Exception:
        return _fallback_summary(messages)


def _fallback_summary(messages: list[DiaryMessage]) -> str:
    n = len([m for m in messages if m.author_type != "ai"])
    return (
        f"Vocês compartilharam {n} mensagem(s) nessa thread. "
        "Continue o diálogo para aprofundar a conexão."
    )


def _nostalgia_prompt(memories: list[CoupleMemory]) -> str | None:
    if not memories:
        return None
    mem = random.choice(memories)
    template = random.choice(_NOSTALGIA_PROMPTS)
    return template.format(
        venue=mem.venue_name or "aquele lugar especial",
        title=mem.title,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/prompt")
def get_daily_prompt(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return today's reflection prompt, occasionally a nostalgia trigger."""
    memories = db.execute(
        select(CoupleMemory).where(CoupleMemory.user_id == user.id).limit(50)
    ).scalars().all()

    # 30% chance of nostalgia prompt if there are memories
    if memories and random.random() < 0.3:
        prompt = _nostalgia_prompt(memories)
        if prompt:
            return {"prompt": prompt, "type": "nostalgia"}

    return {"prompt": random.choice(_WEEKLY_PROMPTS), "type": "weekly"}


@router.get("", response_model=list[ThreadOut])
def list_threads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    threads = db.execute(
        select(DiaryThread).where(DiaryThread.user_id == user.id)
        .order_by(DiaryThread.created_at.desc()).limit(50)
    ).scalars().all()
    return [
        ThreadOut(
            id=t.id, title=t.title, thread_type=t.thread_type,
            status=t.status, ai_summary=t.ai_summary, messages=[],
            created_at=t.created_at.isoformat(),
        )
        for t in threads
    ]


@router.post("", response_model=ThreadOut, status_code=201)
def create_thread(
    payload: ThreadCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    thread = DiaryThread(user_id=user.id, **payload.model_dump())
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return ThreadOut(
        id=thread.id, title=thread.title, thread_type=thread.thread_type,
        status=thread.status, ai_summary=thread.ai_summary, messages=[],
        created_at=thread.created_at.isoformat(),
    )


@router.get("/{thread_id}", response_model=ThreadOut)
def get_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    thread = db.get(DiaryThread, thread_id)
    if not thread or thread.user_id != user.id:
        raise HTTPException(status_code=404, detail="Thread not found")
    messages = db.execute(
        select(DiaryMessage).where(DiaryMessage.thread_id == thread_id)
        .order_by(DiaryMessage.created_at)
    ).scalars().all()
    return ThreadOut(
        id=thread.id, title=thread.title, thread_type=thread.thread_type,
        status=thread.status, ai_summary=thread.ai_summary,
        messages=[
            MessageOut(id=m.id, author_type=m.author_type, content=m.content,
                       memory_id=m.memory_id, created_at=m.created_at.isoformat())
            for m in messages
        ],
        created_at=thread.created_at.isoformat(),
    )


@router.post("/{thread_id}/message", response_model=MessageOut, status_code=201)
def add_message(
    thread_id: str,
    payload: MessageIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    thread = db.get(DiaryThread, thread_id)
    if not thread or thread.user_id != user.id:
        raise HTTPException(status_code=404, detail="Thread not found")
    msg = DiaryMessage(
        thread_id=thread_id,
        author_type=payload.author_type,
        content=payload.content,
        memory_id=payload.memory_id,
    )
    db.add(msg)
    # Auto-close if both partners have responded (at least 2 non-AI messages)
    existing = db.execute(
        select(DiaryMessage).where(
            DiaryMessage.thread_id == thread_id,
            DiaryMessage.author_type.in_(["member_0", "member_1"]),
        )
    ).scalars().all()
    if len(existing) + 1 >= 2 and thread.status == "open":
        thread.status = "awaiting_ai"
    db.commit()
    db.refresh(msg)
    return MessageOut(
        id=msg.id, author_type=msg.author_type, content=msg.content,
        memory_id=msg.memory_id, created_at=msg.created_at.isoformat(),
    )


@router.post("/{thread_id}/summarize")
async def summarize_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate AI summary (Plus/Premium feature)."""
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    ).scalar_one_or_none()
    if sub is None or sub.tier == TIER_FREE:
        raise HTTPException(
            status_code=403,
            detail="Resumo com IA disponível apenas nos planos Plus e Premium.",
        )
    thread = db.get(DiaryThread, thread_id)
    if not thread or thread.user_id != user.id:
        raise HTTPException(status_code=404, detail="Thread not found")
    messages = db.execute(
        select(DiaryMessage).where(DiaryMessage.thread_id == thread_id)
        .order_by(DiaryMessage.created_at)
    ).scalars().all()
    summary = await _ai_summarize(thread, messages)
    thread.ai_summary = summary
    thread.status = "closed"
    thread.closed_at = datetime.utcnow()
    # Add AI message to thread
    ai_msg = DiaryMessage(thread_id=thread_id, author_type="ai", content=summary)
    db.add(ai_msg)
    db.commit()
    return {"summary": summary}
