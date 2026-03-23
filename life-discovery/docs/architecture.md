# LIFE DISCOVERY - Current Architecture

## 1. Runtime overview

The supported local runtime is the Docker Compose stack in [infrastructure/docker/docker-compose.yml](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/infrastructure/docker/docker-compose.yml).

Current runtime services:

1. `api`
- main external REST surface
- auth, couple profile, onboarding, feedback, context orchestration, and concierge proxy

2. `context-engine`
- local context lookup
- weather and city context enrichment

3. `user-profile-engine`
- profile generation and profile-serving logic

4. `recommendation-engine`
- recommendation scoring and ranking

5. `onboarding-engine`
- onboarding flows and profile step ingestion

6. `date-night-ai`
- date-night plan generation

7. `ai-concierge`
- LLM-backed concierge orchestration

8. `postgres`
- primary relational store

9. `crawler`
- event ingestion worker

10. `user-learning-engine`
- background learning loop

Important naming note:
- code directories are canonical in `snake_case`
- Docker service names remain in `kebab-case`

## 2. Canonical repository structure

```text
/life-discovery
  /apps
    /web
    /mobile                # placeholder only
  /services
    /api
    /context_engine
    /user_profile_engine
    /recommendation_engine
    /onboarding_engine
    /date_night_ai
    /ai_concierge
    /user_learning_engine
    /discovery_engine      # ingestion library/shared crawler logic
  /workers
    /event_crawler
  /packages
  /infrastructure
    /docker
  /scripts
  /docs
```

See [docs/source-of-truth.md](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/docs/source-of-truth.md) for the canonical-vs-legacy policy.

## 3. Frontend architecture

The main product UI lives in [apps/web](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web).

Key areas:
- [apps/web/app/home/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/home/page.tsx): curated day brief
- [apps/web/app/watch/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/watch/page.tsx): films and series flow
- [apps/web/app/map/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/map/page.tsx): neighborhoods and movement
- [apps/web/app/concierge/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/concierge/page.tsx): structured concierge UI
- [apps/web/app/date-night/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/date-night/page.tsx): date-night plan
- [apps/web/app/profile/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/profile/page.tsx): couple adjustments
- [apps/web/app/onboarding/page.tsx](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/app/onboarding/page.tsx): guided setup

Core frontend data flow:
- [apps/web/lib/api.ts](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/lib/api.ts)
- [apps/web/lib/curation.ts](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/lib/curation.ts)
- [apps/web/lib/mock-data.ts](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/lib/mock-data.ts)
- [apps/web/lib/storage.ts](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web/lib/storage.ts)

Important implementation detail:
- the frontend has a strong fallback mode and can render curated local data even when backend services are unavailable

## 4. Backend architecture

### API gateway

[services/api](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api) is the main integration point.

Important files:
- [services/api/app/main.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/main.py)
- [services/api/app/config.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/config.py)
- [services/api/app/routers/auth_router.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/routers/auth_router.py)
- [services/api/app/routers/couple_router.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/routers/couple_router.py)
- [services/api/app/routers/context_router.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/routers/context_router.py)
- [services/api/app/routers/experience_router.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/routers/experience_router.py)
- [services/api/app/routers/concierge.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/routers/concierge.py)

### Supporting services

- [services/context_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/context_engine)
- [services/user_profile_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/user_profile_engine)
- [services/recommendation_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/recommendation_engine)
- [services/onboarding_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/onboarding_engine)
- [services/date_night_ai](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/date_night_ai)
- [services/ai_concierge](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/ai_concierge)
- [services/user_learning_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/user_learning_engine)

### Ingestion

[workers/event_crawler](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/workers/event_crawler) is the active worker path.

[services/discovery_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/discovery_engine) remains relevant as ingestion support code, but it is not the canonical standalone runtime service.

## 5. Legacy and duplicate paths

These directories exist, but should not be used as the default edit targets for new work:

- [services/recommendation-engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/recommendation-engine)
- [services/user-profile-engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/user-profile-engine)
- [services/discovery-engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/discovery-engine)
- [services/concierge-agent](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/concierge-agent)

These legacy directories are the main source of repository ambiguity today.

## 6. Current limitations

- The repository still contains duplicate legacy services next to canonical ones.
- [docs/api.md](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/docs/api.md) is thinner than the actual API surface.
- The old discovery router path in [services/api/app/routers/discovery.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api/app/routers/discovery.py) appears orphaned and is not part of the active API wiring.
