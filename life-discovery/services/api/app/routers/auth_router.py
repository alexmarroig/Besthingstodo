from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..couple_defaults import default_couple_profile, default_members
from ..db import get_db
from ..deps import get_current_user
from ..life_graph import seed_initial_graph_for_user
from ..models import CoupleMember, CoupleProfile, User
from ..schemas import CoupleMemberIn, LoginIn, RegisterCoupleIn, RegisterIn, TokenOut, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _merge_couple_profile(base: dict, override: dict) -> dict:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_couple_profile(merged[key], value)
        else:
            merged[key] = value
    return merged


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    exists = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        city=payload.city,
        country=payload.country,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenOut(access_token=token)


@router.post("/register-couple", response_model=TokenOut)
def register_couple(payload: RegisterCoupleIn, db: Session = Depends(get_db)):
    exists = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.account_name,
        account_type="couple",
        city=payload.city,
        neighborhood=payload.neighborhood,
        country=payload.country,
        search_radius_km=payload.search_radius_km,
    )
    db.add(user)
    db.flush()

    members = payload.members or [CoupleMemberIn(**m) for m in default_members()]

    for member in members:
        db.add(
            CoupleMember(
                id=str(uuid4()),
                user_id=user.id,
                full_name=member.full_name,
                email=member.email,
                birth_date=member.birth_date,
                drinks_alcohol=member.drinks_alcohol,
                smokes=member.smokes,
                occupation=member.occupation,
                interests=member.interests,
                dislikes=member.dislikes,
            )
        )

    profile_json = _merge_couple_profile(default_couple_profile(), payload.couple_profile_json)
    profile_json["location"] = {
        **profile_json.get("location", {}),
        "city": payload.city,
        "neighborhood": payload.neighborhood,
        "country": payload.country,
        "max_drive_minutes": payload.max_drive_minutes,
        "transport": payload.transport,
        "avoid_going_out_when_rain": payload.avoid_going_out_when_rain,
        "weekend_wake_time": payload.weekend_wake_time,
    }

    db.add(
        CoupleProfile(
            id=str(uuid4()),
            user_id=user.id,
            schema_version="v1",
            couple_profile_json=profile_json,
            updated_at=datetime.utcnow(),
        )
    )

    seed_initial_graph_for_user(db, user.id)
    db.commit()

    token = create_access_token(user.id)
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id)
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, name=user.name, city=user.city, country=user.country)
