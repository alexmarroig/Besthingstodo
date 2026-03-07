from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Interaction, User, UserProfile

router = APIRouter(tags=["context"])


@router.get("/context")
async def get_context(request: Request, user: User = Depends(get_current_user)):
    ip = request.client.host if request.client else ""
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{settings.context_engine_url}/context",
            params={"ip": ip, "city": user.city},
        )
    if response.status_code >= 400:
        now = datetime.now(timezone.utc)
        return {
            "city": user.city,
            "temperature": None,
            "weather": "unknown",
            "local_time": now.isoformat(),
            "day_of_week": now.strftime("%A"),
        }
    return response.json()


@router.get("/user_state")
async def user_state(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    profile = db.execute(select(UserProfile).where(UserProfile.user_id == user.id)).scalar_one_or_none()
    recent = (
        db.execute(
            select(Interaction)
            .where(Interaction.user_id == user.id)
            .order_by(desc(Interaction.created_at))
            .limit(20)
        )
        .scalars()
        .all()
    )

    ip = request.client.host if request.client else ""
    async with httpx.AsyncClient(timeout=20) as client:
        ctx_resp = await client.get(
            f"{settings.context_engine_url}/context",
            params={"ip": ip, "city": user.city},
        )

    context = ctx_resp.json() if ctx_resp.status_code < 400 else {
        "city": user.city,
        "temperature": None,
        "weather": "unknown",
        "local_time": datetime.now(timezone.utc).isoformat(),
        "day_of_week": datetime.now(timezone.utc).strftime("%A"),
    }

    return {
        "user_profile": profile.profile_json if profile else {},
        "context": context,
        "location": {"city": user.city, "country": user.country},
        "recent_feedback": [
            {
                "experience_id": x.experience_id,
                "feedback_type": x.feedback_type,
                "created_at": x.created_at.isoformat(),
            }
            for x in recent
        ],
    }
