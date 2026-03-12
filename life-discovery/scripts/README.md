# Monorepo commands

## Start stack

```bash
cd life-discovery
docker compose -f infrastructure/docker/docker-compose.yml up --build -d
```

## Seed deterministic smoke data

```powershell
powershell -ExecutionPolicy Bypass -File scripts/seed_smoke_data.ps1
```

## Validate the full stack

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_full_stack.ps1
```

## Legacy scripts

The Python scripts in this folder are preserved for historical reference, but the supported local validation path is now the PowerShell seed + validation flow above so the repo does not depend on a host Python installation.
