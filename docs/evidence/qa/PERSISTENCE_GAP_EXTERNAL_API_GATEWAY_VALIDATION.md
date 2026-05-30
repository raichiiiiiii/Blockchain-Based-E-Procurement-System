# External API Gateway Persistence Validation

Date: 2026-05-30
Branch: main
Commit before change: f922306

## Scope

This checkpoint closes the PostgreSQL runtime persistence gap for the external API gateway foundation. It adds durable storage for external client credentials, idempotency records, and accepted/rejected external request audit events.

The gateway remains a controlled integration boundary for proof verification, external delivery proof intake, ERP sync, and future payment callbacks. External payloads are adapter inputs and do not replace internal domain models.

## Files Changed

- `migrations/015_external_api_gateway.sql`
- `src/app/server.ts`
- `src/modules/integration/infrastructure/postgres-external-client-credential-repository.ts`
- `src/modules/integration/infrastructure/postgres-external-idempotency-repository.ts`
- `src/modules/integration/infrastructure/postgres-external-api-audit-repository.ts`
- `src/modules/integration/infrastructure/postgres-external-api-gateway-repositories.test.ts`
- `scripts/db/seed-demo-data.ts`
- `docker-compose.app.yml`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/deployable-mvp.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/evidence/qa/PERSISTENCE_GAP_EXTERNAL_API_GATEWAY_VALIDATION.md`

## Runtime Behavior

- PostgreSQL runtime mode wires:
  - `PostgresExternalClientCredentialRepository`
  - `PostgresExternalIdempotencyRepository`
  - `PostgresExternalApiAuditRepository`
- Demo seed creates local external client records for `proof-client`, `delivery-proof-client`, and `erp-sync-client`.
- The database stores only `secretHash`; raw shared-secret material is provided through environment configuration.
- `docker-compose.app.yml` includes the local-only `EXTERNAL_API_SHARED_SECRET=change-me-local-external-secret` value for smoke testing.
- In-memory repositories remain available for tests and explicit local composition.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/integration/infrastructure/postgres-external-api-gateway-repositories.test.ts` | Passed, 4 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm run db:migrate -- --dry-run` | Passed, 15 migrations validated. |
| `npm run db:seed -- --dry-run` | Passed; dry-run includes external API client credential seed plan. |
| `docker compose config` | Passed. |
| `docker compose -f docker-compose.app.yml config` | Passed. |
| `npm test` | Passed, 795 tests. |
| `npm run db:migrate` with local Docker PostgreSQL, `DATABASE_URL`, and `DB_MIGRATIONS_ENABLED=true` | Passed; migration `015_external_api_gateway.sql` applied. |
| `npm run db:seed` with `DATABASE_URL`, `DB_MIGRATIONS_ENABLED=true`, `DEMO_SEED_ENABLED=true`, and `EXTERNAL_API_SHARED_SECRET=change-me-local-external-secret` | Passed. |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('external_client_credentials','external_idempotency_records','external_api_audit_events') ORDER BY table_name;"` | Passed; all three tables returned. |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT client_id || ':' || status || ':' || scopes::text FROM external_client_credentials ORDER BY client_id;"` | Passed; `delivery-proof-client`, `erp-sync-client`, and `proof-client` returned as active. |
| `git diff --check` | Passed with CRLF warnings only. |

## Known Limitations

- The local shared secret is demo-only and must be replaced outside local development or compose smoke tests.
- This does not implement production API-key rotation, KMS-backed per-client secrets, external identity federation, or rate-limit infrastructure.
- External request payloads are still validated gateway inputs; they do not become unrestricted business records.
- No production IoT, EPCIS network, ERP, or payment integration is claimed.

## Readiness Statement

External API gateway state is now PostgreSQL-backed for MVP/pilot-hardening runtime mode. Overall product readiness remains supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
