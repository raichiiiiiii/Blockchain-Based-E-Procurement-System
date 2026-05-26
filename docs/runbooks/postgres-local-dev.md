# PostgreSQL Local Development

This runbook starts the local operational database used by the demo persistence baseline.
PostgreSQL stores application state and proof metadata. Fabric remains a proof anchor only.

## Prerequisites

- Docker with Compose support.
- Node.js dependencies installed with `npm install`.

## Environment

Copy the local defaults and adjust only for your machine:

```powershell
Copy-Item .env.example .env.local
```

Required local variables:

```text
PERSISTENCE_ADAPTER=memory
DATABASE_URL=postgres://pls_app:pls_app_password@localhost:5432/pls_platform
DATABASE_SSL_MODE=disable
DB_MIGRATIONS_ENABLED=true
DEMO_SEED_ENABLED=true
```

Do not commit local secrets or production database URLs.

`PERSISTENCE_ADAPTER` controls runtime repository composition:

```text
memory   default, keeps the backend fast and isolated for tests
postgres persists implemented runtime repositories after migration/seed
```

The current Postgres runtime path covers auth/session, member organizations, roles, role assignments, access audit events, procurement lifecycle events, procurement orders, delivery evidence metadata, blockchain anchor metadata, and escrow records. KYC/AML cases, Shariah review records, export bundles, and PLS contracts remain on their in-memory repositories until dedicated adapters are implemented.

## Start PostgreSQL

```powershell
docker compose up -d postgres
docker compose ps
```

The service uses `postgres:16-alpine`, publishes `localhost:5432`, and stores data in the
`pls_postgres_data` Docker volume.

## Apply Migrations

Preview the migration set without connecting to the database:

```powershell
npm run db:migrate -- --dry-run
```

Apply migrations against the configured database:

```powershell
$env:DATABASE_URL="postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
$env:DATABASE_SSL_MODE="disable"
$env:DB_MIGRATIONS_ENABLED="true"
npm run db:migrate
```

The runner records applied files in `schema_migrations` and skips files already applied.

## Seed Demo Data

Preview the seed plan:

```powershell
npm run db:seed -- --dry-run
```

Seed local demo users, organizations, role assignments, a procurement order, delivery evidence metadata,
procurement lifecycle events, pending blockchain anchor metadata, and a demo escrow record:

```powershell
$env:DEMO_SEED_ENABLED="true"
npm run db:seed
```

Demo credentials use username values such as `buyer.demo` and `auditor.demo` with the local
demo password hash generated from `demo-password`. This is for local demonstration only.

## Start Runtime With PostgreSQL

After migration and seed:

```powershell
$env:PERSISTENCE_ADAPTER="postgres"
$env:DATABASE_URL="postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
$env:DATABASE_SSL_MODE="disable"
$env:PORT="3100"
npm run dev
```

## Smoke Checks

Optional checks with `psql`:

```powershell
psql $env:DATABASE_URL -c "select filename, applied_at from schema_migrations order by filename;"
psql $env:DATABASE_URL -c "select username from platform_user_credentials order by username;"
psql $env:DATABASE_URL -c "select order_id, status from procurement_orders order by order_id;"
psql $env:DATABASE_URL -c "select evidence_id, verification_status from delivery_evidence order by evidence_id;"
psql $env:DATABASE_URL -c "select event_id, anchor_status from blockchain_anchor_metadata order by event_id;"
```

## Stop PostgreSQL

Stop the container while preserving the volume:

```powershell
docker compose stop postgres
```

Remove the local database volume only when you intentionally want a clean database:

```powershell
docker compose down -v
```
