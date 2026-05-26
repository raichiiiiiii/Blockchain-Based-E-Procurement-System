# Deployable MVP Runbook

Date: 2026-05-26

Readiness statement: This runbook supports a deployable internal pilot foundation. It does not claim commercial readiness, production readiness, production Fabric consortium operation, production payment execution, production export signing, ERP integration, ISO 20022 bank certification, or formal Shariah certification.

## Purpose

This runbook starts the Digital Procurement and PLS Seedbed MVP as a containerized local stack with PostgreSQL, backend API, and frontend UI. It is intended for operator rehearsal and internal pilot hardening.

## Services

The deployable compose model is defined in `docker-compose.app.yml`.

| Service | Container | Purpose |
| --- | --- | --- |
| `postgres` | `pls-postgres-app` | PostgreSQL operational database for auth/session, membership/RBAC, audit, procurement, delivery evidence, escrow, and anchor metadata records. |
| `backend` | `pls-backend-app` | Fastify API server on container port `3100`. |
| `frontend` | `pls-frontend-app` | Nginx-served static frontend on container port `80`, exposed locally as `5173`. |

## Environment

The app compose file externalizes the deployment-relevant settings:

| Variable | Default in compose | Notes |
| --- | --- | --- |
| `PORT` | `3100` | Backend port inside the container. |
| `PERSISTENCE_ADAPTER` | `postgres` | Existing runtime persistence switch. |
| `DATABASE_URL` | `postgres://pls_app:pls_app_password@postgres:5432/pls_platform` | Uses the compose service hostname. |
| `DATABASE_SSL_MODE` | `disable` | Local compose mode only. |
| `DB_MIGRATIONS_ENABLED` | `true` | Backend container applies migrations on startup. |
| `DEMO_SEED_ENABLED` | `true` | Backend container seeds demo accounts and data on startup. |
| `VITE_API_PROXY_TARGET` | `http://backend:3100` | Documented for parity; production static frontend uses Nginx `/api/v1` proxy. |
| `VITE_ENABLE_LOCAL_DEMO_FALLBACK` | `false` | Local fabricated data fallback remains disabled. |
| `VITE_ENABLE_GUIDED_DEMO` | `false` | Guided mode is disabled unless explicitly enabled elsewhere. |

Do not commit production secrets. The compose defaults are local demo credentials only.

## Start

From the repository root:

```powershell
docker compose -f docker-compose.app.yml up --build -d
```

Open:

```text
http://127.0.0.1:5173
```

Backend health endpoints:

```text
http://127.0.0.1:3100/health
http://127.0.0.1:3100/ready
```

## Smoke Test

Run:

```powershell
.\scripts\smoke\deployable-smoke-test.ps1
```

The script builds and starts the compose stack, checks `/health`, checks `/ready`, checks frontend static availability, signs in as `admin.demo`, and shuts the stack down unless `-KeepRunning` is supplied.

To test an already-running stack:

```powershell
.\scripts\smoke\deployable-smoke-test.ps1 -SkipComposeUp
```

## Demo Accounts

All demo accounts use:

```text
demo-password
```

Seeded usernames:

- `admin.demo`
- `buyer.demo`
- `supplier.demo`
- `compliance.demo`
- `shariah.demo`
- `financier.demo`
- `auditor.demo`
- `regulator.demo`
- `security.demo`

## Stop

```powershell
docker compose -f docker-compose.app.yml down
```

To remove the app database volume:

```powershell
docker compose -f docker-compose.app.yml down -v
```

Use volume removal only for local reset. It destroys local demo database state.

## What This Proves

- The frontend, backend, and PostgreSQL services can start as one compose stack.
- Backend health and readiness endpoints respond.
- Migrations and demo seed can run during backend startup.
- The frontend can reach the backend through the static Nginx `/api/v1` proxy.
- Credential-only demo login works against backend/database-seeded accounts.

## What This Does Not Claim

- It is not a production deployment model.
- It is not a production Fabric consortium.
- It does not execute real payments.
- It does not provide production export signing/key management.
- It does not provide production Shariah certification.
- It does not integrate with ERP/accounting, ISO 20022 bank rails, IoT hardware, QR signing infrastructure, or EPCIS networks.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Backend readiness is degraded | PostgreSQL is unavailable or migrations failed | Run `docker compose -f docker-compose.app.yml logs backend postgres`. |
| Frontend loads but login fails | Backend is not healthy or Nginx proxy cannot reach backend | Check `http://127.0.0.1:3100/ready` and frontend container logs. |
| Port 3100 or 5173 is busy | Local dev server is already running | Stop the local dev process or change compose host ports before starting. |
| Demo account login fails | Seed did not run or database volume has stale state | Run `docker compose -f docker-compose.app.yml down -v`, then start again. |
