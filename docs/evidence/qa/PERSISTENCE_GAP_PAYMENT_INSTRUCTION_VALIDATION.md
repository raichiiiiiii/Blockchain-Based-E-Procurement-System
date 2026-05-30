# Payment Instruction Persistence Validation

Date: 2026-05-30
Branch: main
Commit before change: 1464c28

## Scope

This checkpoint closes the PostgreSQL runtime persistence gap for sandbox/manual payment instruction records. It adds durable storage for payment instruction metadata, adapter references, reconciliation status, failure reason, and linked lifecycle event IDs.

This does not implement or claim production payment settlement, bank connectivity, ISO 20022 execution, or payment credential custody.

## Files Changed

- `migrations/016_payment_instructions.sql`
- `src/app/server.ts`
- `src/modules/payments/infrastructure/postgres-payment-instruction-repository.ts`
- `src/modules/payments/infrastructure/postgres-payment-instruction-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/runbooks/local-demo.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/evidence/qa/PERSISTENCE_GAP_PAYMENT_INSTRUCTION_VALIDATION.md`

## Runtime Behavior

- PostgreSQL runtime mode wires `PostgresPaymentInstructionRepository`.
- In-memory payment repository remains available for tests and explicit local composition.
- `payment_instructions` stores sandbox/manual instruction status and adapter metadata.
- The table uses a partial unique index to preserve the current rule that only one pending, accepted, or settled instruction may exist for an escrow.
- The repository stores no payment credentials, account secrets, or bank authorization artifacts.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/payments/infrastructure/postgres-payment-instruction-repository.test.ts` | Passed, 6 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm run db:migrate -- --dry-run` | Passed, 16 migrations validated. |
| `npm run db:seed -- --dry-run` | Passed. |
| `docker compose config` | Passed. |
| `npm test` | Passed, 801 tests. |
| `npm run db:migrate` with local Docker PostgreSQL, `DATABASE_URL`, and `DB_MIGRATIONS_ENABLED=true` | Passed; migration `016_payment_instructions.sql` applied. |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_instructions';"` | Passed; returned `payment_instructions`. |
| `git diff --check` | Passed with CRLF warnings only. |

## Known Limitations

- Payment adapters remain `manualSettlement` and `localSandbox` only.
- No production payment rail, bank API, ISO 20022 execution certification, or reconciliation feed is implemented.
- No raw payment credentials are stored.
- Escrow settlement remains governed by the existing workflow; this checkpoint only makes payment instruction records durable.

## Readiness Statement

Sandbox/manual payment instructions are now PostgreSQL-backed for MVP/pilot-hardening runtime mode. Overall product readiness remains supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
