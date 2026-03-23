# Monorepo scripts

## Supported local flow

Start the Docker stack:

```bash
cd life-discovery
docker compose -f infrastructure/docker/docker-compose.yml up --build -d
```

Seed deterministic smoke data:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/seed_smoke_data.ps1
```

Refresh and validate the canonical Sao Paulo catalog:

```bash
python scripts/catalog_pipeline.py validate
python scripts/catalog_pipeline.py refresh
```

Seed the curated Sao Paulo catalog for the couple profile:

```bash
python scripts/seed_couple_profile.py
```

Validate the running stack health:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_full_stack.ps1
```

Run the curated couple smoke flow:

```bash
python scripts/smoke_couple_flow.py
```

## Script roles

- [seed_smoke_data.ps1](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/scripts/seed_smoke_data.ps1)
  - waits for the core services
  - registers or reuses a couple account
  - submits onboarding data
  - generates the user profile
  - seeds deterministic smoke-test experiences

- [validate_full_stack.ps1](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/scripts/validate_full_stack.ps1)
  - checks the Docker Compose health surface for the HTTP services
  - helps confirm the stack is reachable before deeper testing

- [catalog_pipeline.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/scripts/catalog_pipeline.py)
  - validates the canonical catalog in [curated-editorial.sao-paulo.json](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/packages/catalog/data/curated-editorial.sao-paulo.json)
  - checks deduplication and schema quality
  - refreshes the compatibility mirror in [curated_sao_paulo_catalog.json](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/scripts/curated_sao_paulo_catalog.json)

- [seed_couple_profile.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/scripts/seed_couple_profile.py)
  - seeds the shared couple account/profile used in local validation
  - loads the canonical curated Sao Paulo catalog from [curated-editorial.sao-paulo.json](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/packages/catalog/data/curated-editorial.sao-paulo.json)
  - inserts higher-quality restaurants, delivery, cinemas, streaming and cultural options into `experiences`
  - persists editorial catalog metadata like `slug`, `content_tier`, `quality_score`, `availability_kind` and `indoor_outdoor`

- [smoke_couple_flow.py](/C:/Users/gaming/Desktop/Projetos/Besthingstodo/life-discovery/scripts/smoke_couple_flow.py)
  - logs in as the shared couple account
  - verifies recommendations for `dining_out`, `delivery`, `movies_series` and `events_exhibitions`
  - checks `concierge` and `date night` end-to-end against the live stack

## Legacy scripts

Several Python scripts remain in this folder for historical or manual workflows.

They are not the primary local validation path. Prefer the PowerShell seed + validation flow above unless you are intentionally working on migration or ingestion internals.
