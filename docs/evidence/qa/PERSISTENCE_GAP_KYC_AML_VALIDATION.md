# KYC/AML Persistence Gap Validation

Date: 2026-05-30
Branch: main

## Scope

Closed the MVP-critical runtime persistence gap for KYC/AML onboarding cases.

The change keeps domain/application layers database-library-free and adds PostgreSQL persistence only in infrastructure and runtime composition.

## Files Changed

- `migrations/007_kyc_aml_onboarding_cases.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.ts`
- `src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_KYC_AML_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

## Runtime Behavior

- `PERSISTENCE_ADAPTER=postgres` now wires `PostgresOnboardingCaseRepository`.
- KYC/AML create, decision, status-history, and eligibility routes use the same repository seam.
- Buyer, supplier, and financier demo organizations are seeded with approved KYC/AML cases.
- Eligibility gates for procurement, escrow, and PLS can now read persisted KYC/AML status in PostgreSQL mode.

## Data Safety

- KYC and AML values are stored as structured metadata.
- Evidence references store safe metadata and checksums only.
- No raw KYC documents are written to blockchain.
- No raw KYC documents are returned by the new repository.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.test.ts` | Passed, 3 tests |
| `npm run build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 7 migration files validated including `007_kyc_aml_onboarding_cases.sql` |
| `npm run db:seed -- --dry-run` | Passed, 9 demo accounts plus KYC/AML eligibility seed path validated |
| `npm test` | Passed, 762 tests |
| `git diff --check` | Passed; PowerShell reported CRLF whitespace warnings for existing edited TypeScript files only |

## Known Limitations

- This does not implement production KYC document storage, OCR, legal verification, or third-party AML screening.
- This does not expose raw KYC documents in product UI.
- This does not claim regulator-grade onboarding automation.

## Next Recommended Persistence Slice

Add PostgreSQL persistence for Shariah reviews so PLS activation gates remain durable across backend restart.
