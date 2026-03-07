from fastapi import FastAPI

from .db import engine
from .models import Base
from .router import router

app = FastAPI(title="AI Concierge", version="1.0.0")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-concierge"}


app.include_router(router)
