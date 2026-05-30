# ERP Accounting Job Persistence Validation

Date: 2026-05-30
Branch: main
Commit before change: ce25622

## Scope

This checkpoint closes the PostgreSQL runtime persistence gap for ERP/accounting local JSON integration jobs. It adds durable storage for UBL/Peppol-like exports, OCDS-like release package exports, payment status exports, journal event exports, and import validation results.

This does not implement or claim production ERP connectivity, Peppol network delivery, accounting-system sync, tax reporting, or automated journal posting.

## Files Changed

- `migrations/017_erp_integration_jobs.sql`
- `src/app/server.ts`
- `src/modules/integration/application/erp-integration-job-repository.ts`
- `src/modules/integration/infrastructure/in-memory-erp-integration-job-repository.ts`
- `src/modules/integration/infrastructure/local-json-erp-accounting-adapter.ts`
- `src/modules/integration/infrastructure/postgres-erp-integration-job-repository.ts`
- `src/modules/integration/infrastructure/postgres-erp-integration-job-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/runbooks/local-demo.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/evidence/qa/PERSISTENCE_GAP_ERP_ACCOUNTING_JOB_VALIDATION.md`

## Runtime Behavior

- PostgreSQL runtime mode wires `LocalJsonErpAccountingAdapter` to `PostgresErpIntegrationJobRepository`.
- The default adapter still uses `InMemoryErpIntegrationJobRepository` for fast tests and explicit local composition.
- `erp_integration_jobs` stores indexed job metadata plus the full local JSON job artifact.
- The table uses a partial unique index for `(profile_type, idempotency_key)` when an idempotency key is present.
- Mapping artifacts remain off-chain. No raw commercial documents, payment credentials, or private ERP credentials are stored on-chain.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/integration/infrastructure/postgres-erp-integration-job-repository.test.ts` | Passed, 4 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm run db:migrate -- --dry-run` | Passed, 17 migrations validated. |
| `npm run db:seed -- --dry-run` | Passed. |
| `docker compose config` | Passed. |
| `npm test` | Passed, 805 tests. |
| `npm run db:migrate` with local Docker PostgreSQL, `DATABASE_URL`, and `DB_MIGRATIONS_ENABLED=true` | Passed; migration `017_erp_integration_jobs.sql` applied. |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='erp_integration_jobs';"` | Passed; returned `erp_integration_jobs`. |
| `git diff --check` | Passed with CRLF warnings only. |

## Known Limitations

- ERP/accounting remains a local JSON adapter boundary.
- No production ERP API, Peppol access point, external accounting sync, or automated journal posting is implemented.
- Import validation stores mapping errors for review, but it does not create operational procurement records.
- Mapping job payloads may contain business metadata and are stored in PostgreSQL only, not on-chain.

## Readiness Statement

ERP/accounting local JSON jobs are now PostgreSQL-backed for MVP/pilot-hardening runtime mode. Overall product readiness remains supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
