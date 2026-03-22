from datetime import date, datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# ──────────────────────────────────────────────────────────────────────────────
# Subscription tier constants
# ──────────────────────────────────────────────────────────────────────────────
TIER_FREE = "free"
TIER_PLUS = "plus"
TIER_PREMIUM = "premium"


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    account_type: Mapped[str] = mapped_column(String, default="single")
    city: Mapped[str] = mapped_column(String, default="Sao Paulo")
    neighborhood: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str] = mapped_column(String, default="Brazil")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    search_radius_km: Mapped[float] = mapped_column(Float, default=10.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="event")
    domain: Mapped[str] = mapped_column(String, default="events_exhibitions")
    city: Mapped[str] = mapped_column(String, default="Sao Paulo")
    location: Mapped[str] = mapped_column(String, default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String, default="seed")
    url: Mapped[str] = mapped_column(String, default="")
    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[str] = mapped_column(String)
    weight: Mapped[float] = mapped_column(Float, default=1.0)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, index=True)
    profile_json: Mapped[dict] = mapped_column(JSON, default=dict)
    psychological_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    embedding_vector: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleMember(Base):
    __tablename__ = "couple_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    drinks_alcohol: Mapped[bool] = mapped_column(Boolean, default=False)
    smokes: Mapped[bool] = mapped_column(Boolean, default=False)
    occupation: Mapped[str | None] = mapped_column(String, nullable=True)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    dislikes: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleProfile(Base):
    __tablename__ = "couple_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, index=True)
    schema_version: Mapped[str] = mapped_column(String, default="v1")
    couple_profile_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    experience_id: Mapped[str] = mapped_column(String, ForeignKey("experiences.id"), index=True)
    feedback_type: Mapped[str] = mapped_column(String)
    decision: Mapped[str | None] = mapped_column(String, nullable=True)
    post_experience_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason_tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    context_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingQuestion(Base):
    __tablename__ = "onboarding_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    question_text: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    weight: Mapped[float] = mapped_column(Float, default=1.0)


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    type: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    source_node_id: Mapped[str] = mapped_column(String, ForeignKey("graph_nodes.id"), index=True)
    target_node_id: Mapped[str] = mapped_column(String, ForeignKey("graph_nodes.id"), index=True)
    relationship_type: Mapped[str] = mapped_column(String, index=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)


# ══════════════════════════════════════════════════════════════════════════════
# PREMIUM FEATURES
# ══════════════════════════════════════════════════════════════════════════════


class Subscription(Base):
    """User subscription tier (free / plus / premium)."""
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, index=True)
    tier: Mapped[str] = mapped_column(String, default=TIER_FREE)  # free|plus|premium
    # ISO-8601 expiry — None means no expiry (lifetime) or free tier
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Stripe / Pagar.me subscription id for future integration
    external_subscription_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleMemory(Base):
    """
    A shared memory / date the couple registers.
    Can reference an Experience (if it came from a recommendation)
    or be free-text (manually added memory).
    """
    __tablename__ = "couple_memories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    # Optional reference to the experience that originated this memory
    experience_id: Mapped[str | None] = mapped_column(String, ForeignKey("experiences.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    # When the memory happened (may differ from created_at)
    memory_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    venue_name: Mapped[str | None] = mapped_column(String, nullable=True)
    # Tags chosen by the couple: e.g. ["romantic","first time","rain"]
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Mood: happy | romantic | nostalgic | adventurous | calm
    mood: Mapped[str | None] = mapped_column(String, nullable=True)
    # URL/path to main photo (stored externally)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Rating 1-5 the couple assigns to this memory
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LoveMapPin(Base):
    """
    A pin on the couple's Love Map — each visit/date adds a point.
    Derived from CoupleMemory but also queryable independently for map rendering.
    """
    __tablename__ = "love_map_pins"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    memory_id: Mapped[str | None] = mapped_column(String, ForeignKey("couple_memories.id"), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    label: Mapped[str] = mapped_column(String, default="")
    # pin_type: date | restaurant | travel | cinema | museum | bar | park | other
    pin_type: Mapped[str] = mapped_column(String, default="date")
    visit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HealthScore(Base):
    """
    Computed relationship health score (0-100) with component breakdown.
    Recalculated on demand and cached here with a timestamp.
    """
    __tablename__ = "health_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, index=True)
    # Overall score 0-100
    score: Mapped[float] = mapped_column(Float, default=0.0)
    # Component scores (JSON dict)
    components: Mapped[dict] = mapped_column(JSON, default=dict)
    # Trend: up | stable | down
    trend: Mapped[str] = mapped_column(String, default="stable")
    # Free-text IA insight (1-2 sentences)
    insight: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Monthly report JSON (generated once/month by background job)
    monthly_report: Mapped[dict] = mapped_column(JSON, default=dict)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleStreak(Base):
    """Tracks daily engagement streak for gamification."""
    __tablename__ = "couple_streaks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, index=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_active_days: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleBadge(Base):
    """Badges earned by the couple through various milestones."""
    __tablename__ = "couple_badges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    # badge_key matches a key in BADGE_DEFINITIONS
    badge_key: Mapped[str] = mapped_column(String, nullable=False)
    badge_name: Mapped[str] = mapped_column(String, nullable=False)
    badge_emoji: Mapped[str] = mapped_column(String, default="🏆")
    description: Mapped[str] = mapped_column(String, default="")
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleChallenge(Base):
    """
    Active or completed challenges assigned to a couple.
    Challenges nudge them toward new categories/experiences.
    """
    __tablename__ = "couple_challenges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    # challenge_key: e.g. "explore_10_new", "new_neighborhood", "streak_7"
    challenge_key: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    target_count: Mapped[int] = mapped_column(Integer, default=1)
    current_count: Mapped[int] = mapped_column(Integer, default=0)
    # status: active | completed | expired
    status: Mapped[str] = mapped_column(String, default="active")
    badge_reward: Mapped[str | None] = mapped_column(String, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SurpriseSession(Base):
    """
    Surprise mode session: each partner answers private questions,
    AI generates a secret recommendation, then both review after.
    """
    __tablename__ = "surprise_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    # Answers collected privately per member (keyed by member index "0"/"1")
    member_answers: Mapped[dict] = mapped_column(JSON, default=dict)
    # The surprise recommendation generated by AI
    recommendation: Mapped[dict] = mapped_column(JSON, default=dict)
    # status: pending_answers | ready | revealed | reviewed
    status: Mapped[str] = mapped_column(String, default="pending_answers")
    # Post-experience ratings per member after the surprise
    post_ratings: Mapped[dict] = mapped_column(JSON, default=dict)
    experience_id: Mapped[str | None] = mapped_column(String, ForeignKey("experiences.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revealed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class DiaryThread(Base):
    """
    A themed async conversation thread between the couple + AI concierge.
    Examples: "O que foi especial essa semana?", "Lembra quando..."
    """
    __tablename__ = "diary_threads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    # thread_type: weekly_reflection | memory | challenge | surprise | free
    thread_type: Mapped[str] = mapped_column(String, default="weekly_reflection")
    title: Mapped[str] = mapped_column(String, nullable=False)
    # AI-generated summary of the thread after both partners respond
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # status: open | awaiting_partner | closed
    status: Mapped[str] = mapped_column(String, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class DiaryMessage(Base):
    """A single message within a DiaryThread."""
    __tablename__ = "diary_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    thread_id: Mapped[str] = mapped_column(String, ForeignKey("diary_threads.id"), index=True)
    # author_type: member_0 | member_1 | ai
    author_type: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Optional: message references a memory
    memory_id: Mapped[str | None] = mapped_column(String, ForeignKey("couple_memories.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
