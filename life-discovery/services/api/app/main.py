from fastapi import FastAPI
from sqlalchemy import text

from .db import engine
from .models import Base
from .routers import auth_router, context_router, experience_router, feedback_router, onboarding_router

app = FastAPI(title="Life Discovery API", version="2.0.0")


@app.on_event("startup")
def startup() -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router.router)
app.include_router(onboarding_router.router)
app.include_router(context_router.router)
app.include_router(feedback_router.router)
app.include_router(experience_router.router)
