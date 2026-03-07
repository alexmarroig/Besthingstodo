from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Experience, Profile, User
from ..schemas import ExperienceOut, ProfileUpsert, UserCreate, UserOut

router = APIRouter(prefix="", tags=["core"])


@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    user = User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user, from_attributes=True)


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user, from_attributes=True)


@router.post("/profile")
def upsert_profile(payload: ProfileUpsert, db: Session = Depends(get_db)):
    stmt = select(Profile).where(Profile.user_id == payload.user_id)
    profile = db.execute(stmt).scalar_one_or_none()
    if profile is None:
        profile = Profile(**payload.model_dump())
        db.add(profile)
    else:
        profile.lifestyle = payload.lifestyle
        profile.values = payload.values
        profile.cultural_preferences = payload.cultural_preferences
        profile.restrictions = payload.restrictions
    db.commit()
    return {"status": "ok"}


@router.get("/profile/{user_id}")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    stmt = select(Profile).where(Profile.user_id == user_id)
    profile = db.execute(stmt).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "user_id": profile.user_id,
        "lifestyle": profile.lifestyle,
        "values": profile.values,
        "cultural_preferences": profile.cultural_preferences,
        "restrictions": profile.restrictions,
    }


@router.get("/preferences/{user_id}")
def get_preferences(user_id: str, db: Session = Depends(get_db)):
    stmt = select(Profile).where(Profile.user_id == user_id)
    profile = db.execute(stmt).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile.cultural_preferences


@router.get("/experiences", response_model=list[ExperienceOut])
def list_experiences(city: str = "Sao Paulo", db: Session = Depends(get_db)):
    stmt = select(Experience).where(Experience.city == city).limit(200)
    rows = db.execute(stmt).scalars().all()
    return [ExperienceOut.model_validate(x, from_attributes=True) for x in rows]
