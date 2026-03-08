from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..couple_defaults import default_couple_profile
from ..db import get_db
from ..deps import get_current_user
from ..life_graph import seed_initial_graph_for_user
from ..models import CoupleMember, CoupleProfile, User
from ..schemas import CoupleMeOut, CoupleMemberOut, CouplePatchIn, CoupleProfileOut

router = APIRouter(prefix="/couple", tags=["couple"])


def _deep_merge(base: dict, patch: dict) -> dict:
    merged = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


@router.get("/me", response_model=CoupleMeOut)
def get_couple_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    seed_initial_graph_for_user(db, user.id)

    members = db.execute(select(CoupleMember).where(CoupleMember.user_id == user.id)).scalars().all()
    profile = db.execute(select(CoupleProfile).where(CoupleProfile.user_id == user.id)).scalar_one_or_none()

    profile_json = default_couple_profile() if profile is None else profile.couple_profile_json or {}
    schema_version = "v1" if profile is None else profile.schema_version

    location = profile_json.get("location", {}) if isinstance(profile_json, dict) else {}

    return CoupleMeOut(
        user_id=user.id,
        email=user.email,
        account_name=user.name,
        city=user.city,
        neighborhood=user.neighborhood,
        country=user.country,
        search_radius_km=user.search_radius_km,
        max_drive_minutes=int(location.get("max_drive_minutes", 40)),
        transport=str(location.get("transport", "car")),
        avoid_going_out_when_rain=bool(location.get("avoid_going_out_when_rain", True)),
        weekend_wake_time=str(location.get("weekend_wake_time", "10:00")),
        members=[
            CoupleMemberOut(
                id=m.id,
                full_name=m.full_name,
                email=m.email,
                birth_date=m.birth_date,
                drinks_alcohol=m.drinks_alcohol,
                smokes=m.smokes,
                occupation=m.occupation,
                interests=m.interests or [],
                dislikes=m.dislikes or [],
            )
            for m in members
        ],
        profile=CoupleProfileOut(schema_version=schema_version, couple_profile_json=profile_json),
    )


@router.patch("/me", response_model=CoupleMeOut)
def patch_couple_me(payload: CouplePatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.city is not None:
        user.city = payload.city
    if payload.neighborhood is not None:
        user.neighborhood = payload.neighborhood
    if payload.country is not None:
        user.country = payload.country
    if payload.search_radius_km is not None:
        user.search_radius_km = payload.search_radius_km

    profile = db.execute(select(CoupleProfile).where(CoupleProfile.user_id == user.id)).scalar_one_or_none()
    if profile is None:
        base_profile = default_couple_profile()
        profile = CoupleProfile(
            id=str(uuid4()),
            user_id=user.id,
            schema_version="v1",
            couple_profile_json=base_profile,
            updated_at=datetime.utcnow(),
        )
        db.add(profile)
    else:
        base_profile = profile.couple_profile_json or {}

    location_patch = {}
    if payload.max_drive_minutes is not None:
        location_patch["max_drive_minutes"] = payload.max_drive_minutes
    if payload.transport is not None:
        location_patch["transport"] = payload.transport
    if payload.avoid_going_out_when_rain is not None:
        location_patch["avoid_going_out_when_rain"] = payload.avoid_going_out_when_rain
    if payload.weekend_wake_time is not None:
        location_patch["weekend_wake_time"] = payload.weekend_wake_time

    merged = base_profile
    if location_patch:
        merged = _deep_merge(merged, {"location": location_patch})
    if payload.patch:
        merged = _deep_merge(merged, payload.patch)

    profile.couple_profile_json = merged
    profile.updated_at = datetime.utcnow()

    if payload.members is not None:
        db.query(CoupleMember).filter(CoupleMember.user_id == user.id).delete()
        for member in payload.members:
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

    db.commit()

    return get_couple_me(db=db, user=user)
