# Setup Guide

## Prerequisites
- Docker + Docker Compose
- Python 3.11+

## Start
1. Copy env values if needed:
   - use `.env.example`
2. Run stack:
   - `docker compose -f infrastructure/docker/docker-compose.yml up --build`
3. Seed data:
   - `python scripts/seed_data.py`
4. Open web app:
   - `http://localhost:3000`

## Services
- API: `:8000`
- User Profile Engine: `:8001`
- Recommendation Engine: `:8002`
- Discovery Engine: `:8003`
- Concierge Agent: `:8004`
- Postgres: `:5432`
- Redis: `:6379`
- Meilisearch: `:7700`
