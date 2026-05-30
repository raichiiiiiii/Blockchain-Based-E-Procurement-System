# Operational Incident Persistence Gap Validation

Date: 2026-05-30
Branch: main

## Scope

Closed the runtime persistence gap for operational readiness incidents used by `/ready`, `/api/v1/ops/status`, and security alert read models.

The change keeps domain/application layers database-library-free and adds PostgreSQL persistence only in infrastructure and runtime composition.

## Files Changed

- `migrations/011_operational_incidents.sql`
- `src/app/server.ts`
- `src/modules/ops/infrastructure/postgres-operational-incident-repository.ts`
- `src/modules/ops/infrastructure/postgres-operational-incident-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_OPERATIONAL_INCIDENT_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

## Runtime Behavior

- `PERSISTENCE_ADAPTER=postgres` now wires `PostgresOperationalIncidentRepository`.
- Readiness checks can persist database and Fabric availability incidents in PostgreSQL mode.
- `resolveOpenBySource` resolves existing open incidents when a dependency recovers.
- Security alert and operational status views continue to use the existing read-only repository seam.

## Data Safety

- Operational incidents store source, severity, status, message, and timestamps only.
- No credentials, payment details, KYC documents, commercial documents, or blockchain private data are stored.
- This does not claim production incident management, paging, SIEM integration, or external monitoring integration.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/ops/infrastructure/postgres-operational-incident-repository.test.ts` | Passed, 4 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 11 migrations validated |
| `npm run db:seed -- --dry-run` | Passed |
| `docker compose config` | Passed |
| `npm test` | Passed, 777 tests |
| `git diff --check` | Passed with CRLF normalization warnings for edited TypeScript files |

## Known Limitations

- This is an operational incident read/persistence foundation, not a production observability stack.
- No external alert manager, SIEM sink, paging workflow, or retention policy is implemented in this slice.
- The current incident model remains intentionally compact: source, severity, message, status, occurrence time, and resolution time.

## Result

The operational incident persistence gap listed in `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md` is closed for PostgreSQL runtime mode.
