# Source of Truth

This document defines the canonical directories and runtime surfaces for local development in this repository.

## Canonical runtime

The supported local stack is the Docker Compose stack in [infrastructure/docker/docker-compose.yml](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/infrastructure/docker/docker-compose.yml).

Important naming rule:
- directory names are canonical in `snake_case`
- container and internal DNS names may remain in `kebab-case`

That means `services/user_profile_engine` is the canonical code directory even when the running container is named `user-profile-engine`.

## Canonical edit targets

Use these directories by default for new work:

- [apps/web](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/web)
- [services/api](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/api)
- [services/context_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/context_engine)
- [services/user_profile_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/user_profile_engine)
- [services/recommendation_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/recommendation_engine)
- [services/onboarding_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/onboarding_engine)
- [services/date_night_ai](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/date_night_ai)
- [services/ai_concierge](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/ai_concierge)
- [services/user_learning_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/user_learning_engine)
- [workers/event_crawler](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/workers/event_crawler)

## Special case

[services/discovery_engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/discovery_engine) is active, but not as a standalone runtime service in Docker Compose.

Treat it as:
- canonical for crawler and ingestion library code
- not the primary deployed service surface

## Legacy or duplicate directories

Avoid these for new work unless you are intentionally doing cleanup or migration:

- [services/recommendation-engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/recommendation-engine)
- [services/user-profile-engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/user-profile-engine)
- [services/discovery-engine](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/discovery-engine)
- [services/concierge-agent](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/services/concierge-agent)
- [apps/mobile](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/apps/mobile) for production work

## Docs to trust first

Start with these when orienting yourself:

- [docs/source-of-truth.md](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/docs/source-of-truth.md)
- [docs/setup.md](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/docs/setup.md)
- [infrastructure/docker/docker-compose.yml](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/infrastructure/docker/docker-compose.yml)

Treat [docs/architecture.md](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/docs/architecture.md) as an architectural overview, not as the sole source of truth.
