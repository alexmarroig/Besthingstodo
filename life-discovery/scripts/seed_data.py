#!/usr/bin/env python3
import requests

API = "http://localhost:8000"


def main() -> None:
    user = {
        "email": "demo@life.app",
        "name": "Casal Demo",
        "city": "Sao Paulo",
        "neighborhood": "Campo Belo",
    }
    user_resp = requests.post(f"{API}/users", json=user, timeout=20)
    user_resp.raise_for_status()
    user_id = user_resp.json()["id"]

    profile = {
        "user_id": user_id,
        "lifestyle": {"style": ["calm", "cultural", "reflective"]},
        "values": {"priorities": ["quiet", "intellectual", "meaningful"]},
        "cultural_preferences": {
            "likes": ["psychological thriller", "museum", "exhibition", "quiet restaurant", "cafe"]
        },
        "restrictions": {"avoid": ["bars", "nightclubs", "loud environment", "explicit content"]},
    }
    requests.post(f"{API}/profile", json=profile, timeout=20).raise_for_status()
    requests.post(f"{API}/discovery/run", timeout=40).raise_for_status()
    print(f"Seed complete. user_id={user_id}")


if __name__ == "__main__":
    main()
