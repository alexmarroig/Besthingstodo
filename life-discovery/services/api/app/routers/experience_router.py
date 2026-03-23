from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..application.catalog_queries import build_experience_out, build_recommendation_out, fetch_city_experiences
from ..db import get_db
from ..deps import get_current_user
from ..models import User
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
    rows = fetch_city_experiences(db, city)
    result = []
    for x in rows:
        exp_domain = x.domain or "events_exhibitions"
        if domain and exp_domain != domain:
            continue
        result.append(build_experience_out(x, exp_domain))
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
    return [build_recommendation_out(exp, exp_domain, score, reason) for score, reason, exp_domain, exp in ranked]
