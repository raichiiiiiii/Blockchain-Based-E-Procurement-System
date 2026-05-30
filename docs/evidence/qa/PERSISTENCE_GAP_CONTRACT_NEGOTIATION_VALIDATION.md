# Machine-Readable Contract Persistence Validation

Date: 2026-05-30
Branch: main
Commit before change: 279bc73

## Scope

This checkpoint closes the PostgreSQL runtime persistence gap for the machine-readable contract and negotiation workspace. It keeps the existing domain/service behavior and adds a PostgreSQL adapter that stores indexed contract metadata plus the full internal contract aggregate as JSONB.

This does not claim legal contract execution, production document signing, ERP integration, or external registry publication.

## Files Changed

- `migrations/014_procurement_contracts.sql`
- `src/app/server.ts`
- `src/modules/contracts/infrastructure/postgres-procurement-contract-repository.ts`
- `src/modules/contracts/infrastructure/postgres-procurement-contract-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/evidence/qa/PERSISTENCE_GAP_CONTRACT_NEGOTIATION_VALIDATION.md`

## Runtime Behavior

- PostgreSQL runtime mode wires `PostgresProcurementContractRepository` through `src/app/server.ts`.
- In-memory contract repository remains available for tests and local composition.
- Contract metadata is indexed by contract ID, contract number, buyer organization, supplier organization, financier organization, status, and update time.
- Machine-readable terms, offers, acceptances, and lifecycle events are stored in `contract_json` as the internal aggregate.
- The table stores hashes and references only; it does not copy raw human-readable documents into contract rows.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/contracts/infrastructure/postgres-procurement-contract-repository.test.ts` | Passed, 4 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm run db:migrate -- --dry-run` | Passed, 14 migrations validated. |
| `npm run db:seed -- --dry-run` | Passed. |
| `docker compose config` | Passed. |
| `npm test` | Passed, 791 tests. |
| `npm run db:migrate` with local Docker PostgreSQL, `DATABASE_URL`, and `DB_MIGRATIONS_ENABLED=true` | Passed; migration `014_procurement_contracts.sql` applied. |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='procurement_contracts';"` | Passed; returned `procurement_contracts`. |
| `git diff --check` | Passed with CRLF warnings only. |

## Known Limitations

- The contract row stores an internal JSON aggregate, not an OCDS/UBL export package.
- Human-readable document content remains in the document subsystem or external storage; contract rows store document references.
- Contract signing remains acceptance metadata unless production signing/key management is separately implemented and validated.
- This persistence checkpoint does not add payment execution, ERP synchronization, or formal legal attestation.

## Readiness Statement

Machine-readable contracts are now PostgreSQL-backed for MVP/pilot-hardening runtime mode. Overall product readiness remains supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
