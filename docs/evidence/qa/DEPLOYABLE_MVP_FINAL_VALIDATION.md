# Deployable MVP Final Validation

Date: 2026-05-30
Branch: main
Commit inspected before this pass: `679c2e1`

## Scope

This validation summarizes the current repository state after closing the required runtime persistence follow-up items and reviewing canonical actor UAT readiness.

Readiness statement:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

## Persistence Closure Summary

The current PostgreSQL runtime path now includes:

- auth/session
- membership/RBAC
- access audit events
- procurement lifecycle events
- procurement orders
- delivery evidence metadata
- blockchain anchor metadata
- escrow records
- KYC/AML onboarding cases
- Shariah reviews
- PLS contract/distribution records
- export bundles and local software-key signature metadata
- operational readiness incidents

The current pass added:

- KYC/AML onboarding case PostgreSQL repository and migration
- Shariah review PostgreSQL repository and migration
- PLS contract/distribution PostgreSQL repository and migration
- export bundle PostgreSQL repository and migration
- operational incident PostgreSQL repository and migration
- durable evidence and runbook updates

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.test.ts` | Passed, 3 tests |
| `node --test --loader ts-node/esm src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.test.ts` | Passed, 3 tests |
| `node --test --loader ts-node/esm src/modules/financing/infrastructure/postgres-pls-contract-repository.test.ts` | Passed, 4 tests |
| `node --test --loader ts-node/esm src/modules/reporting/infrastructure/postgres-export-bundle-repository.test.ts` | Passed, 4 tests |
| `node --test --loader ts-node/esm src/modules/ops/infrastructure/postgres-operational-incident-repository.test.ts` | Passed, 4 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 11 migrations validated |
| `npm run db:seed -- --dry-run` | Passed |
| `docker compose config` | Passed |
| `npm test` | Passed, 777 tests |
| `git diff --check` | Passed with CRLF normalization warnings for edited TypeScript files |

## Browser And Environment Checks

| Check | Result |
|---|---|
| Frontend login smoke at `http://127.0.0.1:5173/login` | Passed: credential fields and sign-in button visible, no role-card shortcuts |
| Forbidden product label search in `src/frontend` | Passed, no matches |
| Role shortcut search in `src/frontend` | Passed, no matches |
| Live PostgreSQL startup | Blocked: Docker daemon was not running |
| Local PostgreSQL port check | Blocked: `localhost:5432` was not accepting TCP connections |
| Full browser actor sign-in smoke | Not rerun in this environment because persistent seeded credentials require PostgreSQL |

## Evidence Files Added Or Updated

- `docs/evidence/qa/PERSISTENCE_GAP_KYC_AML_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_REVIEW_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_PLS_CONTRACT_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_EXPORT_BUNDLE_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_OPERATIONAL_INCIDENT_VALIDATION.md`
- `docs/evidence/qa/CANONICAL_ACTOR_UAT_RESULTS.md`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/postgres-local-dev.md`

## Known Limitations

- This pass did not run live database apply/seed because Docker Desktop was unavailable.
- This pass did not claim production Fabric consortium execution, production payment execution, production ERP/accounting integration, production ISO 20022 execution, or external Shariah certification.
- Document metadata, contract negotiation records, external API credentials/idempotency/audit, payment instructions, and ERP/accounting jobs still need later persistence hardening.
- Live browser actor smoke should be rerun after PostgreSQL is available.

## Go / No-Go

Go for repository-level build/test validation and supervisor-demo evidence review.

No-go for pilot-ready, commercial-ready, production-certified, or live database browser UAT claims until the environment blocker is cleared and live actor smoke is appended.
