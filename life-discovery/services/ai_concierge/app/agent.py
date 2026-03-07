import json

import httpx
from sqlalchemy.orm import Session

from .config import settings
from .memory import extract_recent_titles, get_recent_memories, save_memory
from .prompts import SYSTEM_PROMPT
from .tools import get_context, get_recommendations, get_user_profile, parse_intent


def _build_reason(item: dict, profile: dict, context: dict, intent: dict) -> str:
    reasons = []
    if item.get("tags"):
        reasons.append(f"matches your interests in {', '.join(item['tags'][:2])}")
    if context.get("weather") and context.get("weather") != "unknown":
        reasons.append(f"fits current weather ({context['weather']})")
    if intent.get("intent") in {"quiet", "romantic", "cultural", "restaurant"}:
        reasons.append(f"aligned with your {intent['intent']} request")
    if not reasons:
        reasons.append("good fit for your profile and current context")
    return "; ".join(reasons)


def _fallback_response(items: list[dict], profile: dict, context: dict, intent: dict) -> dict:
    suggestions = []
    for item in items[:3]:
        suggestions.append({"title": item["title"], "reason": _build_reason(item, profile, context, intent)})
    return {"suggestions": suggestions}


def _call_llm(message: str, profile: dict, context: dict, candidates: list[dict]) -> dict | None:
    if not settings.openai_api_key:
        return None

    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "User request: "
                    + message
                    + "\nProfile: "
                    + json.dumps(profile)
                    + "\nContext: "
                    + json.dumps(context)
                    + "\nCandidates: "
                    + json.dumps(candidates[:6])
                    + "\nReturn strict JSON: {\"suggestions\":[{\"title\":\"...\",\"reason\":\"...\"}]}"
                ),
            },
        ],
        "temperature": 0.4,
    }

    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
                json=payload,
            )
        if r.status_code >= 400:
            return None
        content = r.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return None


def run_agent(user_id: str, message: str, db: Session) -> dict:
    intent = parse_intent(message)
    profile = get_user_profile(user_id)
    city = profile.get("city") or "Sao Paulo"
    context = get_context(city)

    recent = get_recent_memories(user_id, 6, db)
    exclude_titles = extract_recent_titles(recent)

    candidates = get_recommendations(message, context.get("city", city), db, profile=profile, exclude_titles=exclude_titles)

    llm_response = _call_llm(message, profile, context, candidates)
    if llm_response and isinstance(llm_response, dict) and isinstance(llm_response.get("suggestions"), list):
        response = llm_response
    else:
        response = _fallback_response(candidates, profile, context, intent)

    save_memory(user_id, message, response, db)
    return response
