import httpx
from fastapi import FastAPI

from .config import settings
from .planner import group_type, infer_context
from .schemas import ConciergeRequest, ConciergeResponse, ConciergeSuggestion

app = FastAPI(title="Concierge Agent", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "concierge-agent"}


@app.post("/concierge/respond", response_model=ConciergeResponse)
async def respond(payload: ConciergeRequest):
    context = infer_context(payload.message)
    async with httpx.AsyncClient(timeout=20) as client:
        rec = await client.post(
            f"{settings.recommendation_engine_url}/recommendations",
            json={
                "user_id": payload.user_id,
                "city": payload.city,
                "context": context,
                "limit": 6,
            },
        )

    data = rec.json() if rec.status_code < 400 else {"items": []}
    suggestions = []
    for item in data.get("items", [])[:3]:
        suggestions.append(
            ConciergeSuggestion(
                type=group_type(item["category"]),
                title=item["title"],
                why=item.get("why", "Strong match with your identity profile"),
            )
        )

    response_text = "Aqui estao opcoes para hoje a noite em Sao Paulo, priorizando um perfil cultural e tranquilo."
    return ConciergeResponse(response_text=response_text, suggestions=suggestions)
