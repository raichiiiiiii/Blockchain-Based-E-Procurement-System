# PBI-459 Containerized Deployable Model Validation

Date: 2026-05-26

Branch: `feature/PBI-459-containerized-deployable-model`

Commit inspected before change: `1e3adf5783fdd7bacb7cc0a01dd7b7da03c06b6c`

## Scope

PBI-459 adds a containerized internal deployable model for the supervisor-demo MVP. The scope is limited to local/operator deployment for frontend, backend, and PostgreSQL with health checks and documented smoke validation. This does not claim production Fabric consortium operation, production payment execution, ERP integration, ISO 20022 execution, or production Islamic finance certification.

## Files Changed

- `Dockerfile.backend`
- `Dockerfile.frontend`
- `.dockerignore`
- `docker-compose.app.yml`
- `docker/frontend/nginx.conf`
- `scripts/smoke/deployable-smoke-test.ps1`
- `docs/runbooks/deployable-mvp.md`
- `src/app/server.ts`
- `src/app/server.validation.test.ts`
- `backlog/production-extension-roadmap.csv`
- `docs/evidence/qa/PBI-459_CONTAINERIZED_DEPLOYABLE_MODEL_VALIDATION.md`

## Implementation Summary

- Added backend container build for the TypeScript server on port `3100`.
- Added frontend static container served by Nginx on port `5173`.
- Added `docker-compose.app.yml` with `postgres`, `backend`, and `frontend` services.
- Added service health checks:
  - PostgreSQL: `pg_isready`
  - Backend: `GET /ready`
  - Frontend: static availability at `/`
- Added backend `GET /health` and `GET /ready`.
- Added readiness response details for persistence mode, database reachability, Fabric adapter mode, and demo seed mode.
- Added smoke script for deployable stack validation.
- Added deployable MVP runbook with startup, shutdown, demo accounts, health checks, and claim boundaries.
- Named the app compose project `pls-deployable-mvp` to avoid collisions with the existing local PostgreSQL-only compose project.

## Environment Configuration

The app compose model externalizes the expected operator settings:

- `PORT`
- `DATABASE_URL`
- `DATABASE_SSL_MODE`
- `PERSISTENCE_ADAPTER`
- `DEMO_SEED_ENABLED`
- `DB_MIGRATIONS_ENABLED`
- `VITE_API_PROXY_TARGET`
- `VITE_ENABLE_LOCAL_DEMO_FALLBACK=false`
- `VITE_ENABLE_GUIDED_DEMO=false`

`PERSISTENCE_ADAPTER=postgres` is the existing runtime persistence mode setting for backend runtime composition.

## Validation Results

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed: 698 tests, 0 failures |
| `npm run db:migrate -- --dry-run` | Passed: validated 5 migration files |
| `npm run db:seed -- --dry-run` | Passed: validated 9 demo accounts and current MVP seed records |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| `docker compose -f docker-compose.app.yml up --build -d` | Blocked by environment connectivity to Docker Hub while resolving `node:20-alpine` |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed: no duplicate PBI IDs |
| `git diff --check` | Passed |

## Docker Live Smoke

The live container startup was attempted with:

```powershell
docker compose -f docker-compose.app.yml up --build -d
```

Result: blocked before local service startup because Docker could not resolve `docker.io/library/node:20-alpine`.

Observed blocker:

```text
failed to resolve source metadata for docker.io/library/node:20-alpine
failed to do request: Head "https://registry-1.docker.io/v2/library/node/manifests/20-alpine"
dial tcp 100.50.6.117:443: connectex: A connection attempt failed
```

Release impact: environment-dependent blocker. The compose file validates, but a clean operator still needs Docker Hub access or pre-pulled base images to complete live startup.

Recommended next action: rerun the smoke script after Docker Hub connectivity is available:

```powershell
.\scripts\smoke\deployable-smoke-test.ps1
```

## Health And Readiness Checks

`GET /health` returns an OK health envelope for process liveness.

`GET /ready` returns dependency readiness and uses HTTP `503` for degraded dependency checks. In PostgreSQL mode, the backend verifies database reachability with a lightweight `SELECT 1`.

## Known Limitations

- The backend image currently installs development dependencies because migration and seed scripts run through the Node/TypeScript toolchain at container startup.
- The live Docker smoke could not complete in this environment due to Docker Hub connectivity.
- This is an internal deployable MVP model, not a hardened production deployment model.
- No production Fabric consortium, payment rail, ERP integration, ISO 20022 execution, or formal Shariah certification is introduced by this phase.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-459 as `Completed` with the Docker Hub connectivity blocker recorded in the Notes field.
