# Shariah Review Persistence Gap Validation

Date: 2026-05-30
Branch: main

## Scope

Closed the MVP-critical runtime persistence gap for Shariah review metadata.

The change keeps domain/application layers database-library-free and adds PostgreSQL persistence only in infrastructure and runtime composition.

## Files Changed

- `migrations/008_shariah_reviews.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.ts`
- `src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_REVIEW_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

## Runtime Behavior

- `PERSISTENCE_ADAPTER=postgres` now wires `PostgresShariahReviewRepository`.
- Shariah review submission, checklist, decision, and history routes use the same repository seam.
- The demo seed inserts the approved restricted PLS seedbed review `review-demo-approved`.
- PLS governance evidence can now read persisted Shariah review metadata in PostgreSQL mode.

## Data Safety

- Review references store safe metadata only.
- Raw contract documents and Shariah certification artifacts are not stored in this table.
- No raw contract or certification payload is written to blockchain.
- This evidence does not claim formal external Shariah certification.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.test.ts` | Passed, 3 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 8 migration files validated including `008_shariah_reviews.sql` |
| `npm run db:seed -- --dry-run` | Passed, 9 demo accounts plus Shariah review seed path validated |
| `npm test` | Passed, 765 tests |
| `git diff --check` | Passed; PowerShell reported CRLF whitespace warnings for existing edited TypeScript files only |

## Known Limitations

- This does not implement production Shariah certificate issuance, board governance, or external legal attestation.
- This does not make the PLS seedbed a production Islamic finance platform.
- Shariah certificate artifacts remain a separate pilot-hardening persistence gap.

## Next Recommended Persistence Slice

Add PostgreSQL persistence for PLS contracts and distribution records so financing demo state is durable across backend restart.
