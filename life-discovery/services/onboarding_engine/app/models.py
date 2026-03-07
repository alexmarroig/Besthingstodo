from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserPsychAnswer(Base):
    __tablename__ = "user_psych_answers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, index=True)
    question_id: Mapped[int] = mapped_column(Integer, index=True)
    answer: Mapped[str] = mapped_column(String)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserCulturalDNA(Base):
    __tablename__ = "user_cultural_dna"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    intellectual_depth: Mapped[float] = mapped_column(Float, default=0.5)
    symbolic_interest: Mapped[float] = mapped_column(Float, default=0.5)
    psychological_curiosity: Mapped[float] = mapped_column(Float, default=0.5)
    quiet_environment_preference: Mapped[float] = mapped_column(Float, default=0.5)
    romantic_experience_preference: Mapped[float] = mapped_column(Float, default=0.5)
    crowd_tolerance: Mapped[float] = mapped_column(Float, default=0.5)
    museum_interest: Mapped[float] = mapped_column(Float, default=0.5)
    cinema_interest: Mapped[float] = mapped_column(Float, default=0.5)
    exhibition_interest: Mapped[float] = mapped_column(Float, default=0.5)
    restaurant_style_score: Mapped[float] = mapped_column(Float, default=0.5)
    travel_style_score: Mapped[float] = mapped_column(Float, default=0.5)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
