# Monorepo commands

## Start stack

```bash
cd life-discovery
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

## Seed

```bash
python scripts/seed_data.py
```

## Try recommendations

```bash
curl -X POST http://localhost:8000/recommendations \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_ID>","city":"Sao Paulo","context":{"daypart":"evening"},"limit":5}'
```

## Seed Couple Profile (Alex & Camila)

```bash
python scripts/seed_couple_profile.py
```

This script upserts:
- users / couple_members / couple_profiles
- user_preferences / domain_preferences
- user_profiles with embedding_vector (384)
- sample experiences for recommendation smoke tests

Then it runs an authenticated recommendation test against:
- GET /recommendations?domain=dining_out
- GET /recommendations?domain=delivery
- GET /recommendations?domain=movies_series
- GET /recommendations?domain=events_exhibitions
