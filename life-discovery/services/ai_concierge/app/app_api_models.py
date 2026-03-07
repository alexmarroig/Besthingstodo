from datetime import datetime

from sqlalchemy import DateTime, Float, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class ApiBase(DeclarativeBase):
    pass


class Experience(ApiBase):
    __tablename__ = "experiences"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    location: Mapped[str] = mapped_column(String)
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
