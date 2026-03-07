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
