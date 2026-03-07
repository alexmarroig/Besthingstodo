from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Experience, User
from ..schemas import ExperienceOut, RecommendationOut
from .recommendation_router import recommend_for_user

router = APIRouter(tags=["experiences"])


@router.get("/experiences", response_model=list[ExperienceOut])
def experiences(city: str = "Sao Paulo", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.execute(select(Experience).where(Experience.city == city)).scalars().all()
    return [
        ExperienceOut(
            id=x.id,
            title=x.title,
            description=x.description,
            category=x.category,
            city=x.city,
            location=x.location,
            start_time=x.start_time,
            price=x.price,
            tags=x.tags or [],
            source=x.source,
        )
        for x in rows
    ]


@router.get("/recommendations", response_model=list[RecommendationOut])
def recommendations(
    city: str = "Sao Paulo",
    limit: int = 10,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.get(User, user.id):
        raise HTTPException(status_code=404, detail="user not found")

    ranked = recommend_for_user(user.id, city, limit, db)
    return [
        RecommendationOut(
            id=exp.id,
            title=exp.title,
            description=exp.description,
            category=exp.category,
            city=exp.city,
            location=exp.location,
            start_time=exp.start_time,
            price=exp.price,
            tags=exp.tags or [],
            source=exp.source,
            score=score,
        )
        for score, exp in ranked
    ]
