# LIFE DISCOVERY ENGINE - Architecture

## 1. Full System Architecture

LIFE DISCOVERY ENGINE is designed as a modular platform with specialized services:

1. `api` (BFF/API Gateway)
- Single external REST entrypoint.
- Auth/session integration point.
- Orchestrates recommendation, profile updates, discovery runs, and concierge calls.

2. `user-profile-engine`
- Owns identity profile evolution from behavioral and explicit feedback signals.
- Maintains preference weights, restrictions, and profile snapshots.

3. `discovery-engine`
- Crawls cultural/event sources.
- Normalizes heterogeneous records into canonical `experiences`.
- Adds category and cultural-profile metadata.

4. `recommendation-engine`
- Retrieves candidates from normalized experiences.
- Computes relevance score using identity + context + temporal constraints.
- Returns explainable ranked list.

5. `concierge-agent`
- Natural language interface.
- Interprets user intent (example: "what to do tonight") and transforms to recommendation query.
- Produces structured suggestions + rationale.

Cross-cutting infrastructure:
- PostgreSQL + pgvector for relational + vector storage.
- Redis for queues/caching.
- Meilisearch for text and faceted search.
- Docker Compose for local orchestration.

## 2. Service Boundaries

### API Gateway (`services/api`)
Owns:
- Route surface (`/users`, `/profile`, `/preferences`, `/experiences`, `/recommendations`, `/feedback`, `/discovery`, `/concierge`)
- Persistence for base entities (`users`, `profiles`, `feedback`, `experiences`)
- Inter-service orchestration

Does not own:
- Ranking logic internals
- Crawler internals
- Profile learning internals

### User Profile Engine (`services/user-profile-engine`)
Owns:
- Profile adaptation policy
- Preference weights and confidence evolution
- Profile snapshot serving for ranker

Does not own:
- Experience ingestion
- UI contracts

### Discovery Engine (`services/discovery-engine`)
Owns:
- Connectors (Sympla, Eventbrite, Fever starter)
- Extraction/normalization/classification
- Canonical upsert of discovered experiences

Does not own:
- User-specific ranking

### Recommendation Engine (`services/recommendation-engine`)
Owns:
- Candidate scoring
- Context-aware ranking
- Explainability payload fields (`why`)

Does not own:
- Natural language dialogue

### Concierge Agent (`services/concierge-agent`)
Owns:
- Query interpretation and response composition
- Human-friendly explanation layer

Does not own:
- Raw model retraining pipelines

## 3. Database Design

Core tables:

1. `users`
- identity and location baseline

2. `profiles`
- lifestyle/values/cultural preferences and restrictions JSON

3. `experiences`
- canonical normalized entity:
  - `id`, `title`, `description`, `category`, `tags`
  - location (`city`, `neighborhood`)
  - time (`start_at`)
  - price (`price_min`, `price_max`)
  - `source`, `metadata_json`

4. `feedback`
- explicit interaction signals: like/dislike + reason

5. `user_preference_weights`
- long-term evolving weights per domain/topic with confidence

Scalability notes:
- Partition `feedback` by month and hash(user_id) at scale.
- Add pgvector columns for user/item embeddings in v2.
- Add materialized feature snapshots for low-latency ranking.

## 4. ML / Recommendation Strategy

Current MVP strategy:
1. Build user signal tokens from profile weights.
2. Candidate set from city-filtered experiences.
3. Score with hybrid function:
- semantic token overlap (proxy embedding similarity)
- context boosts (daypart/weather)
- temporal relevance
- hard penalties for avoided categories (bar/club/nightlife)

Target production strategy:
1. Replace token overlap with real embedding cosine (`user_embedding` x `experience_embedding`).
2. Add learning-to-rank model (LightGBM/XGBoost).
3. Add exploration policy (contextual bandit).
4. Continual updates from explicit and implicit feedback stream.

## 5. API Design

External REST routes via gateway:
- `POST /users`
- `GET /users/{user_id}`
- `POST /profile`
- `GET /profile/{user_id}`
- `GET /preferences/{user_id}`
- `GET /experiences`
- `POST /recommendations`
- `POST /feedback`
- `POST /discovery/run`
- `POST /concierge`

Internal service routes:
- `user-profile-engine`: `POST /feedback`, `GET /profiles/{user_id}`
- `recommendation-engine`: `POST /recommendations`
- `discovery-engine`: `POST /crawl/run`
- `concierge-agent`: `POST /concierge/respond`

## 6. Repository Structure

```text
/life-discovery
  /apps
    /web
    /mobile
  /services
    /api
    /recommendation-engine
    /discovery-engine
    /user-profile-engine
    /concierge-agent
  /packages
    /ui-components
    /shared-types
    /utils
  /infrastructure
    /docker
    /terraform
  /scripts
  /docs
```

This structure enforces clear bounded contexts while keeping shared frontend artifacts in dedicated packages.
