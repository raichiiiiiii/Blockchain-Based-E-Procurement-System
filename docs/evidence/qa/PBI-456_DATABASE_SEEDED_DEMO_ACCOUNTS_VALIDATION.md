# PBI-456 Database-Seeded Demo Accounts Validation

Date: 2026-05-26
Branch: feature/PBI-456-457-453-ui-runtime-hardening
Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

Validated the database-seeded account path for the production-extension hardening slice. The normal path is backend authentication with seeded credentials, not frontend-only identity data.

## Demo Accounts

Seed validation covers these usernames with local password `demo-password`:

- `admin.demo`
- `buyer.demo`
- `supplier.demo`
- `compliance.demo`
- `shariah.demo`
- `financier.demo`
- `auditor.demo`
- `regulator.demo`
- `security.demo`

The seed script reports credential, organization, procurement order, delivery evidence, lifecycle event, anchor metadata, and escrow demo records.

## Files Reviewed Or Updated

- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/auth/api/auth.routes.ts`
- `src/modules/auth/application/login-user.ts`
- `src/modules/auth/infrastructure/postgres-platform-user-credential-repository.ts`
- `.env.example`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `backlog/production-extension-roadmap.csv`

## Validation Results

| Command | Result |
|---|---|
| `npm run db:seed -- --dry-run` | Passed. Validated 9 demo accounts and demo procurement/order/proof records. |
| `docker compose up -d postgres` | Passed. PostgreSQL container started and became healthy. |
| `$env:DB_MIGRATIONS_ENABLED='true'; npm run db:migrate` | Passed. Existing migrations were already applied. |
| `$env:DEMO_SEED_ENABLED='true'; npm run db:seed` | Passed. Seeded 9 demo accounts and demo case records. |
| Browser smoke on `http://127.0.0.1:5174/` with backend `3101` | Passed for Administrator, Buyer, Supplier, Auditor, and Security Operator sign-in. |

## Known Limitations

- This remains a local supervisor-demo seed, not production identity management.
- The local demo password is intentionally documented and must not be reused as a production secret.
- Some MVP read models remain in-memory in PostgreSQL mode as documented in the local demo runbook.
