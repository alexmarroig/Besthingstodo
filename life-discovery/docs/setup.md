# Setup Guide

## Supported stack

- Active code directories use the `snake_case` stack:
  - `services/api`
  - `services/context_engine`
  - `services/user_profile_engine`
  - `services/recommendation_engine`
  - `services/onboarding_engine`
  - `services/date_night_ai`
  - `services/ai_concierge`
  - `services/user_learning_engine`
  - `workers/event_crawler`
- Docker runtime service names remain in `kebab-case` for container naming and internal DNS.
- Legacy folders such as `recommendation-engine`, `user-profile-engine`, `discovery-engine`, and `concierge-agent` are not part of the supported local runtime path.

See [docs/source-of-truth.md](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/docs/source-of-truth.md) before starting new work in the repo.

## Prerequisites

- Docker Desktop with the Linux engine running
- Node.js 20+
- Optional: `OPENAI_API_KEY` if you want live LLM responses in `ai_concierge`

## Local boot

1. Copy `.env.example` to `.env` and fill only the keys you need locally.
2. Start the stack:
   - `docker compose -f infrastructure/docker/docker-compose.yml up --build -d`
3. Seed deterministic smoke-test data without local Python:
   - `powershell -ExecutionPolicy Bypass -File scripts/seed_smoke_data.ps1`
4. Validate the running service health:
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

## Validation scope

The validator checks:
- Docker Compose services are reachable
- health endpoints for the HTTP services respond

It does not replace:
- frontend visual QA
- deeper end-to-end user journey testing
- external API verification such as OpenWeather or OpenAI behavior

## Notes

- The API gateway proxies concierge calls through the API layer and uses `ai_concierge` as the official backend.
- `docker compose config` may expand local environment secrets; do not paste that output into docs or tickets.
- The web build can fail inside restricted sandboxes with `spawn EPERM`; use a normal host shell for a production build check if needed.
