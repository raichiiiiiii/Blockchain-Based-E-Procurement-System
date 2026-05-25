# PBI-296 PostgreSQL Persistence Baseline Validation

Date: 2026-05-25

## Scope

Implemented a local PostgreSQL persistence baseline for auth/session, membership/RBAC,
access audit events, procure-to-pay lifecycle events, and blockchain anchor metadata.

## Files Added Or Updated

- `.env.example`
- `docker-compose.yml`
- `migrations/001_auth_membership.sql`
- `migrations/002_audit_procurement.sql`
- `migrations/003_blockchain_anchors.sql`
- `scripts/db/migrate.ts`
- `scripts/db/seed-demo-data.ts`
- `src/infrastructure/database/database-config.ts`
- `src/infrastructure/database/postgres-client.ts`
- `src/infrastructure/database/postgres-row-utils.ts`
- `src/modules/auth/infrastructure/postgres-auth-session-repository.ts`
- `src/modules/auth/infrastructure/postgres-platform-user-credential-repository.ts`
- `src/modules/membership/infrastructure/postgres-member-organization-repository.ts`
- `src/modules/access-control/infrastructure/postgres-role-repository.ts`
- `src/modules/access-control/infrastructure/postgres-role-assignment-repository.ts`
- `src/modules/shared/infrastructure/postgres-access-audit-event-repository.ts`
- `src/modules/procurement/infrastructure/postgres-procure-to-pay-lifecycle-event-repository.ts`
- `src/modules/blockchain/application/blockchain-anchor-metadata-repository.ts`
- `src/modules/blockchain/infrastructure/postgres-blockchain-anchor-metadata-repository.ts`
- `docs/runbooks/postgres-local-dev.md`
- `docs/evidence/qa/PBI-296_POSTGRES_BASELINE_VALIDATION.md`
- `package.json`
- `package-lock.json`

## Architecture Checks

- PostgreSQL dependencies are isolated to infrastructure code.
- Domain and application layers do not import `pg`.
- In-memory repositories remain in place for fast tests and default server construction.
- Fabric is not used as an application database.
- Blockchain anchor persistence stores proof metadata only: event id, payload hash, case hash,
  anchor status, Fabric references, timestamps, and failure reason.
- Seed data does not store raw KYC, invoice, payment credential, escrow term, or commercial
  document payloads.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Passed after fixing strict nullable `rowCount` checks in Postgres adapters. |
| `npm test` | Passed: 604 tests, 604 pass, 0 fail. |
| `npm run db:migrate -- --dry-run` | Passed: validated 3 migration files. An earlier run exposed a nullable `rowCount` check in the migration runner; fixed and rerun. |
| `npm run db:seed -- --dry-run` | Passed: validated 8 demo accounts. |
| `docker compose config` | Passed: compose file renders one `postgres` service and `pls_postgres_data` volume. |
| `rg -n 'from [''\"'']pg[''\"'']\|require\\([''\"'']pg[''\"'']\\)' src/modules src/app src/infrastructure` | Passed: only `src/infrastructure/database/postgres-client.ts` imports `pg`. |
| `git diff --check` | Passed. |

## Known Limitations

- Runtime server wiring still defaults to in-memory repositories unless Postgres repositories
  are explicitly composed in a later environment setup slice.
- Validation used dry-run migration and seed commands. Live migration/seed execution requires
  starting the local Docker Postgres service and setting the documented environment variables.
- `npm install pg @types/pg --save` reported existing audit findings from the dependency tree:
  2 moderate and 5 high vulnerabilities. No audit remediation was attempted in this phase.
