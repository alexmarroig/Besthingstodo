from __future__ import annotations

from datetime import datetime

import requests

API_URL = "http://localhost:8000"
DATE_NIGHT_URL = "http://localhost:8009"
CONCIERGE_URL = "http://localhost:8007"
COUPLE_EMAIL = "alex.c.marroig@gmail.com"
COUPLE_PASSWORD = "alexcamila123"


def require_ok(response: requests.Response, label: str) -> dict:
    if response.status_code >= 400:
        raise RuntimeError(f"{label} failed status={response.status_code} body={response.text}")
    return response.json()


def main() -> None:
    auth = require_ok(
        requests.post(
            f"{API_URL}/auth/login",
            json={"email": COUPLE_EMAIL, "password": COUPLE_PASSWORD},
            timeout=30,
        ),
        "login",
    )
    token = auth["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = require_ok(requests.get(f"{API_URL}/couple/me", headers=headers, timeout=30), "couple/me")
    user_id = me["user_id"]
    print(f"couple_me account={me['account_name']} city={me['city']} user_id={user_id}")

    domain_results: dict[str, list[dict]] = {}
    for domain in ["dining_out", "delivery", "movies_series", "events_exhibitions"]:
        rows = require_ok(
            requests.get(
                f"{API_URL}/recommendations",
                params={"city": me["city"], "domain": domain, "weather": "rain", "limit": 4},
                headers=headers,
                timeout=30,
            ),
            f"recommendations[{domain}]",
        )
        if not rows:
            raise RuntimeError(f"recommendations[{domain}] returned no rows")
        domain_results[domain] = rows
        print(f"recommendations[{domain}] top={rows[0]['title']}")

    concierge = require_ok(
        requests.post(
            f"{CONCIERGE_URL}/concierge/chat",
            json={"user_id": user_id, "message": "Quero algo romantico, sem alcool e sem lotacao hoje a noite."},
            timeout=30,
        ),
        "concierge/chat",
    )
    suggestions = concierge.get("suggestions") or []
    if not suggestions:
        raise RuntimeError("concierge/chat returned no suggestions")
    print(f"concierge top={suggestions[0]}")

    plan = require_ok(
        requests.post(
            f"{DATE_NIGHT_URL}/date-night-plan",
            json={
                "user_id": user_id,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "location": me["city"],
                "time": "evening",
                "weather": "rain",
            },
            timeout=30,
        ),
        "date-night-plan",
    )
    print(
        "date_night",
        plan["activity_1"]["title"],
        "->",
        plan["activity_2"]["title"],
        "->",
        plan["activity_3"]["title"],
    )


if __name__ == "__main__":
    main()
