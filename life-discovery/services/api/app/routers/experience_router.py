from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Experience, User
from ..schemas import ExperienceOut, RecommendationOut
from .recommendation_router import recommend_for_user

router = APIRouter(tags=["experiences"])


@router.get("/experiences", response_model=list[ExperienceOut])
def experiences(
    city: str = "Sao Paulo",
    domain: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.execute(select(Experience).where(Experience.city == city)).scalars().all()
    result = []
    for x in rows:
        exp_domain = x.domain or "events_exhibitions"
        if domain and exp_domain != domain:
            continue
        result.append(
            ExperienceOut(
                id=x.id,
                title=x.title,
                description=x.description,
                category=x.category,
                domain=exp_domain,
                city=x.city,
                location=x.location,
                start_time=x.start_time,
                price=x.price,
                tags=x.tags or [],
                source=x.source,
            )
        )
    return result


@router.get("/recommendations", response_model=list[RecommendationOut])
def recommendations(
    city: str = "Sao Paulo",
    limit: int = 10,
    domain: str | None = Query(default=None, pattern="^(dining_out|delivery|movies_series|events_exhibitions)?$"),
    weather: str | None = None,
    daypart: str | None = None,
    hour: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.get(User, user.id):
        raise HTTPException(status_code=404, detail="user not found")

    context = {
        "weather": weather or "",
        "daypart": daypart or "",
    }
    if hour is not None:
        context["hour"] = hour

    ranked = recommend_for_user(user.id, city, limit, db, domain=domain, context=context)
    return [
        RecommendationOut(
            id=exp.id,
            title=exp.title,
            description=exp.description,
            category=exp.category,
            domain=exp_domain,
            city=exp.city,
            location=exp.location,
            start_time=exp.start_time,
            price=exp.price,
            tags=exp.tags or [],
            source=exp.source,
            score=score,
            reason=reason,
        )
        for score, reason, exp_domain, exp in ranked
    ]
