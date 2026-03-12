# Setup Guide

## Supported stack
- Active service directories use the `snake_case` stack: `context_engine`, `user_profile_engine`, `recommendation_engine`, `onboarding_engine`, `date_night_ai`, `ai_concierge`, `api`, `user_learning_engine`, `workers/event_crawler`.
- Docker runtime service names stay in kebab-case for compatibility with container DNS.
- Legacy folders such as `recommendation-engine`, `user-profile-engine`, `discovery-engine` and `concierge-agent` are not part of the supported local runtime path.

## Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Optional: `OPENAI_API_KEY` if you want live LLM responses in `ai_concierge`

## Local boot
1. Copy `.env.example` to `.env` and fill only the keys you need locally.
2. Start the stack:
   - `docker compose -f infrastructure/docker/docker-compose.yml up --build -d`
3. Seed deterministic smoke-test data without local Python:
   - `powershell -ExecutionPolicy Bypass -File scripts/seed_smoke_data.ps1`
4. Run the full validator:
   - `powershell -ExecutionPolicy Bypass -File scripts/validate_full_stack.ps1`
5. Run the web app locally:
   - `cd apps/web`
   - `cmd /c npm install`
   - `cmd /c npm run dev`

## Runtime services
- API: `http://localhost:8000`
- Recommendation Engine: `http://localhost:8002`
- Context Engine: `http://localhost:8005`
- User Profile Engine: `http://localhost:8006`
- AI Concierge: `http://localhost:8007`
- Onboarding Engine: `http://localhost:8008`
- Date Night AI: `http://localhost:8009`
- Postgres: `localhost:5432`

## Notes
- The API gateway proxies concierge calls through `POST /concierge` and uses `ai_concierge` as the official backend.
- `docker compose config` may expand local environment secrets; do not paste that output into docs or tickets.
- The web build can fail inside restricted sandboxes with `spawn EPERM`; use a normal host shell for the production build check.
