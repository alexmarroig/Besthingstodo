from functools import lru_cache

from sentence_transformers import SentenceTransformer

from .config import settings


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


def embed_profile(profile: dict) -> list[float]:
    text = " ".join(
        [
            " ".join(profile.get("cultural_interests", [])),
            " ".join(profile.get("food_preferences", [])),
            " ".join(profile.get("movie_preferences", [])),
            str(profile.get("experience_style", "")),
            str(profile.get("budget_range", "")),
            str(profile.get("distance_limit", "")),
            str(profile.get("noise_tolerance", "")),
        ]
    ).strip()
    vec = get_model().encode([text or "user preferences"], normalize_embeddings=True)
    return vec[0].tolist()
