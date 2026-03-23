from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Experience
from ..schemas import ExperienceOut, RecommendationOut


def fetch_city_experiences(db: Session, city: str) -> list[Experience]:
    return db.execute(select(Experience).where(Experience.city == city)).scalars().all()


def build_experience_out(exp: Experience, exp_domain: str) -> ExperienceOut:
    return ExperienceOut(
        id=exp.id,
        title=exp.title,
        description=exp.description,
        category=exp.category,
        domain=exp_domain,
        slug=exp.slug,
        city=exp.city,
        location=exp.location,
        neighborhood=exp.neighborhood,
        start_time=exp.start_time,
        price=exp.price,
        price_band=exp.price_band,
        tags=exp.tags or [],
        source=exp.source,
        url=exp.url,
        booking_url=exp.booking_url,
        editorial_source=exp.editorial_source,
        content_tier=exp.content_tier,
        quality_score=exp.quality_score,
        availability_kind=exp.availability_kind,
        indoor_outdoor=exp.indoor_outdoor,
        latitude=exp.latitude,
        longitude=exp.longitude,
    )


def build_recommendation_out(exp: Experience, exp_domain: str, score: float, reason: str | None) -> RecommendationOut:
    return RecommendationOut(
        **build_experience_out(exp, exp_domain).model_dump(),
        score=score,
        reason=reason,
    )
