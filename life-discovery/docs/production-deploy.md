# Production Deploy

## Target topology

- Vercel hosts `apps/web` and the lightweight Next.js API routes that proxy external public APIs.
- `services/api` is the public backend service for auth, couple profile, onboarding, feedback, context, experience, life graph, and concierge proxy.
- `context_engine`, `user_profile_engine`, `recommendation_engine`, `onboarding_engine`, `date_night_ai`, and `ai_concierge` run as private backend services.
- Postgres must support pgvector. Use a managed Postgres provider or a container image based on `pgvector/pgvector:pg16`.
- `event_crawler` and `user_learning_engine` run as workers. Redis is optional for the first production deploy unless a production feature starts depending on it.

## Vercel

Configure the project with **Root Directory = `apps/web`** (relative to `life-discovery`).

If the Vercel project is linked to the GitHub repo root (`Besthingstodo`), use **Root Directory = `life-discovery/apps/web`**.

Deploy settings are defined in `apps/web/vercel.json`:

- Install: workspace install from the monorepo root via pnpm/corepack
- Build: `pnpm --filter @life/web build`
- Output: `.next` (auto-detected from the Next.js app)

Required Vercel environment variables:

- `TMDB_API_KEY`
- `GEOAPIFY_API_KEY`
- `TICKETMASTER_API_KEY`
- `OPENWEATHER_API_KEY`

Optional:

- `NEXT_PUBLIC_LIFE_API_URL` when the web app starts calling the public `services/api` deployment directly.

## Backend services

Deploy `services/api` as the only public Python service. Configure these production variables:

- `APP_ENV=production`
- `JWT_SECRET=<strong secret>`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `CORS_ALLOW_ORIGINS=https://<vercel-domain>`
- `CONTEXT_ENGINE_URL=https://<private-or-internal-context-engine-url>`
- `USER_PROFILE_ENGINE_URL=https://<private-or-internal-user-profile-engine-url>`
- `AI_CONCIERGE_URL=https://<private-or-internal-ai-concierge-url>`

Internal services should receive their Postgres variables and only be exposed privately where the platform supports private networking.

## API policy

- Keep external API keys server-side in Next.js route handlers or backend services.
- Route handlers should return normalized recommendation-shaped data and a safe fallback when keys are missing or providers fail.
- Use short provider timeouts and cache headers so production pages stay responsive.
- Add new providers behind one normalized interface before wiring them into product screens.

## Release checks

Before promoting a deploy:

- `pnpm --filter @life/web build`
- `docker compose -f infrastructure/docker/docker-compose.yml up --build`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_full_stack.ps1`
- Verify `/health` on the public backend URL.
- Verify `/api/tmdb`, `/api/places`, `/api/events`, `/api/weather`, and `/api/meals` on the Vercel preview URL.
