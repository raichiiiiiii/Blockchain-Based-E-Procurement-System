# Issue 27 Merge-Gate Hardening Validation

Date: 2026-06-01
Branch: codex/issue-26-executable-actor-workflows
Commit inspected before change: b34c92a
Issue: https://github.com/raichiiiiiii/Blockchain-Based-E-Procurement-System/issues/27

## Scope

This pass closes the Issue 27 merge-gate gaps for the Issue 26 actor-workflow branch. It keeps the product positioned as supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## PBIs Addressed

- PBI-507 Postgres persistence for source-to-award, invoices, and closeout.
- PBI-508 First-class actor workflow semantics for source-to-award, invoices, and closeout.
- PBI-509 OpenAPI, frontend, database, and compose validation in CI.
- PBI-510 Actor workflow validation evidence refresh.
- PBI-511 Explicit productivity fallback labeling.
- PBI-512 Graph interaction hardening for claim-boundary nodes.

## Implementation Summary

- Added migration `019_issue26_workflow_persistence.sql` for source-to-award cases, procurement invoices, and procurement closeout records.
- Added PostgreSQL adapters for source-to-award, invoice, and closeout repositories and wired them into Postgres runtime composition.
- Preserved in-memory adapters for fast tests.
- Added scoped workflow-role support for source-to-award manager, quotation manager, invoice manager, and procurement closeout manager without introducing client-side role switching.
- Updated Issue 26 workflow tests so workflow-specific actors can execute their authorized flows and unauthorized scope remains blocked.
- Expanded CI to run OpenAPI validation, migration dry-run, seed dry-run, Docker Compose config, backend build, frontend build, and tests.
- Added `calculationSource` to productivity summaries so projected baseline values are visibly labeled as fallback instead of hidden constants.
- Hardened organization network graph claim-boundary nodes so boundary nodes are informational and do not imply a production integration route, certification, or private network.
- Refreshed actor workflow evidence to include Issue 27 merge-gate coverage.

## Files Changed

- `.github/workflows/ci.yml`
- `backlog/backlog.csv`
- `docs/evidence/qa/ACTOR_USE_CASE_VALIDATION_MATRIX.md`
- `docs/evidence/qa/ISSUE27_MERGE_GATE_HARDENING_VALIDATION.md`
- `docs/evidence/qa/PBI-506_ISSUE26_FINAL_VALIDATION.md`
- `migrations/019_issue26_workflow_persistence.sql`
- `src/app/server.ts`
- `src/frontend/pages/CompanyProductivityPage.tsx`
- `src/frontend/pages/OrganizationNetworkPage.tsx`
- `src/frontend/types/productivity.ts`
- `src/modules/organization-network/api/organization-network.routes.test.ts`
- `src/modules/procurement/api/issue26-workflow.routes.test.ts`
- `src/modules/procurement/application/create-procurement-order.ts`
- `src/modules/procurement/application/invoice-service.ts`
- `src/modules/procurement/application/procurement-closeout-service.ts`
- `src/modules/procurement/application/source-to-award-service.ts`
- `src/modules/procurement/infrastructure/postgres-invoice-repository.ts`
- `src/modules/procurement/infrastructure/postgres-procurement-closeout-repository.ts`
- `src/modules/procurement/infrastructure/postgres-procurement-runtime-repositories.test.ts`
- `src/modules/procurement/infrastructure/postgres-source-to-award-repository.ts`
- `src/modules/productivity/application/company-productivity-service.ts`
- `src/modules/productivity/domain/productivity.ts`

Note: `backlog/backlog.xlsx` had unrelated pre-existing local changes and was not part of this validation scope.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/procurement/infrastructure/postgres-procurement-runtime-repositories.test.ts src/modules/procurement/api/issue26-workflow.routes.test.ts src/modules/productivity/api/productivity.routes.test.ts src/modules/organization-network/api/organization-network.routes.test.ts` | Passed |
| `node --test --loader ts-node/esm src/modules/organization-network/api/organization-network.routes.test.ts` | Passed, 8 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 849 tests |
| `npm run openapi:validate` | Passed, 36 paths |
| `npm run db:migrate -- --dry-run` | Passed, 19 migrations validated |
| `npm run db:seed -- --dry-run` | Passed, 28 organizations and 24 demo accounts validated |
| `docker compose -f docker-compose.app.yml config` | Passed |
| Python backlog CSV validation | Passed, 512 rows, no duplicate or malformed PBI IDs |
| Browser smoke on `http://127.0.0.1:5180/login` | Passed for credential login, buyer dashboard, productivity fallback label, and forbidden-label scan |
| `git diff --check` | Passed |

## Browser Smoke Notes

- Login page showed credential form only; no role-card or `Continue as` shortcut appeared.
- `buyer.demo` / `demo-password` reached the buyer dashboard.
- Company productivity displayed a visible `Projection fallback` indicator when no procurement records backed the summary.
- Product UI scan did not find forbidden labels: `PBI`, `Sprint`, `Backlog`, `Roadmap`, `User stories`, `implementation slice`, or `feature lane`.
- The already-running backend did not expose the latest claim-boundary graph response during the browser smoke; the boundary-node behavior is covered by the updated backend regression test and should be visible after backend restart with this branch.

## Known Limitations

- This branch remains supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
- No production payment execution, production ERP integration, production Fabric consortium, formal Shariah certification, or real logistics integration is claimed.
- The production-extension roadmap CSV was not present in this branch; Issue 27 closure PBIs were recorded in `backlog/backlog.csv`.
- Live PostgreSQL restart persistence was not manually smoke-tested in a running database session; migration dry-run, repository tests, and runtime composition wiring were validated.

## Merge Recommendation

The branch is mergeable for Issue 27 if reviewers accept the documented limitations. The critical merge-gate gaps called out in Issue 27 are closed by persistence adapters, first-class workflow role tests, CI validation gates, refreshed evidence, explicit productivity fallback labeling, and claim-boundary graph hardening.
