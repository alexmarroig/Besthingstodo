"""
Memories & Love Map router.

Endpoints:
  POST   /memories             — create a new memory
  GET    /memories             — list couple memories (paginated)
  GET    /memories/{id}        — get single memory
  PATCH  /memories/{id}        — update memory
  DELETE /memories/{id}        — delete memory
  GET    /love-map             — get all love-map pins for map rendering
  POST   /love-map/pin         — add standalone pin (without full memory)
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import CoupleMemory, LoveMapPin, User

router = APIRouter(prefix="/memories", tags=["memories"])
love_map_router = APIRouter(prefix="/love-map", tags=["love-map"])


# ── Schemas ────────────────────────────────────────────────────────────────


class MemoryCreate(BaseModel):
    title: str
    description: str = ""
    memory_date: date | None = None
    latitude: float | None = None
    longitude: float | None = None
    venue_name: str | None = None
    tags: list[str] = []
    mood: str | None = None
    photo_url: str | None = None
    rating: int | None = None
    experience_id: str | None = None


class MemoryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    memory_date: date | None = None
    latitude: float | None = None
    longitude: float | None = None
    venue_name: str | None = None
    tags: list[str] | None = None
    mood: str | None = None
    photo_url: str | None = None
    rating: int | None = None


class MemoryOut(BaseModel):
    id: str
    title: str
    description: str
    memory_date: date | None
    latitude: float | None
    longitude: float | None
    venue_name: str | None
    tags: list[str]
    mood: str | None
    photo_url: str | None
    rating: int | None
    experience_id: str | None
    created_at: str

    class Config:
        from_attributes = True


class PinCreate(BaseModel):
    latitude: float
    longitude: float
    label: str = ""
    pin_type: str = "date"
    visit_date: date | None = None


class PinOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    label: str
    pin_type: str
    visit_date: date | None
    memory_id: str | None
    created_at: str

    class Config:
        from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────


def _memory_to_out(m: CoupleMemory) -> MemoryOut:
    return MemoryOut(
        id=m.id,
        title=m.title,
        description=m.description,
        memory_date=m.memory_date,
        latitude=m.latitude,
        longitude=m.longitude,
        venue_name=m.venue_name,
        tags=m.tags or [],
        mood=m.mood,
        photo_url=m.photo_url,
        rating=m.rating,
        experience_id=m.experience_id,
        created_at=m.created_at.isoformat(),
    )


def _pin_to_out(p: LoveMapPin) -> PinOut:
    return PinOut(
        id=p.id,
        latitude=p.latitude,
        longitude=p.longitude,
        label=p.label,
        pin_type=p.pin_type,
        visit_date=p.visit_date,
        memory_id=p.memory_id,
        created_at=p.created_at.isoformat(),
    )


# ── Memory Endpoints ────────────────────────────────────────────────────────


@router.post("", response_model=MemoryOut, status_code=201)
def create_memory(
    payload: MemoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mem = CoupleMemory(
        user_id=user.id,
        **payload.model_dump(),
    )
    db.add(mem)

    # Auto-create love-map pin if coordinates provided
    if payload.latitude and payload.longitude:
        pin = LoveMapPin(
            user_id=user.id,
            memory_id=mem.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            label=payload.venue_name or payload.title,
            pin_type="date",
            visit_date=payload.memory_date,
        )
        db.add(pin)

    db.commit()
    db.refresh(mem)
    return _memory_to_out(mem)


@router.get("", response_model=list[MemoryOut])
def list_memories(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(CoupleMemory)
        .where(CoupleMemory.user_id == user.id)
        .order_by(CoupleMemory.memory_date.desc().nullslast(), CoupleMemory.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    return [_memory_to_out(m) for m in rows]


@router.get("/{memory_id}", response_model=MemoryOut)
def get_memory(
    memory_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mem = db.get(CoupleMemory, memory_id)
    if not mem or mem.user_id != user.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    return _memory_to_out(mem)


@router.patch("/{memory_id}", response_model=MemoryOut)
def update_memory(
    memory_id: str,
    payload: MemoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mem = db.get(CoupleMemory, memory_id)
    if not mem or mem.user_id != user.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(mem, k, v)
    db.commit()
    db.refresh(mem)
    return _memory_to_out(mem)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(
    memory_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mem = db.get(CoupleMemory, memory_id)
    if not mem or mem.user_id != user.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(mem)
    db.commit()


# ── Love Map Endpoints ──────────────────────────────────────────────────────


@love_map_router.get("", response_model=list[PinOut])
def get_love_map(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return all pins for the couple's love map."""
    pins = db.execute(
        select(LoveMapPin)
        .where(LoveMapPin.user_id == user.id)
        .order_by(LoveMapPin.visit_date.desc().nullslast())
    ).scalars().all()
    return [_pin_to_out(p) for p in pins]


@love_map_router.post("/pin", response_model=PinOut, status_code=201)
def add_pin(
    payload: PinCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pin = LoveMapPin(user_id=user.id, **payload.model_dump())
    db.add(pin)
    db.commit()
    db.refresh(pin)
    return _pin_to_out(pin)
