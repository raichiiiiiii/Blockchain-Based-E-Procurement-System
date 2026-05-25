# PBI-393 PLS and Shariah Workflow Validation

Date: 2026-05-26  
Status: Wave 6 implementation evidence

## Scope

This evidence covers the restricted PLS seedbed and Shariah governance workflow for:

- PBI-393 Complete visible Shariah and PLS workflow
- PBI-395 Shariah review dashboard
- PBI-396 PLS review detail
- PBI-397 Shariah decision UI
- PBI-398 PLS contract domain model
- PBI-399 PLS activation gate
- PBI-400 Financier dashboard
- PBI-401 PLS contract detail
- PBI-402 Distribution record model
- PBI-403 Distribution detail page
- PBI-404 PLS scenario tests
- PBI-405 PLS and Shariah runbook

## Implementation Summary

- Added a financing module with PLS contract and distribution domain records.
- Added a repository seam and in-memory PLS adapter for fast tests.
- Added PLS activation service that requires an approved Shariah review reference.
- Added eligibility checks before backend PLS activation when an eligibility gateway is configured.
- Added profit and loss distribution scenario service tests.
- Added protected PLS routes for listing contracts, activation, and distribution records.
- Added Shariah reviewer dashboard with review queue, checklist metadata, and decision controls.
- Added financier dashboard with activation gate, approval reference, and profit/loss scenario records.
- Updated local demo runbook and actor UAT scripts.

## Guardrail Results

| Guardrail | Result |
|---|---|
| No guaranteed profit or principal | Passed. UI and scenario records explicitly avoid guarantees. |
| Shariah approval required before activation | Passed. Backend service and route reject missing, rejected, or conditional approval. |
| Distribution is simulation/seedbed scope | Passed. UI says scenario records and does not imply external payment execution. |
| No raw KYC or commercial documents in UI | Passed. UI shows only safe contract metadata, ratios, and references. |
| Domain/application DB isolation | Passed. Financing domain/application do not import database libraries. |
| No Fabric SDK in domain/application | Passed. Financing domain/application do not import Fabric SDK. |

## Commands Run

```powershell
node --loader ts-node/esm --test src/modules/financing/application/pls-contract-service.test.ts
node --loader ts-node/esm --test src/modules/financing/api/pls.routes.test.ts
node --loader ts-node/esm --test src/modules/financing/application/pls-contract-service.test.ts src/modules/financing/api/pls.routes.test.ts
npm run build
npm run frontend:build
npm test
git diff --check
```

## Results

```text
PLS service focused tests: pass, 6 tests
PLS route focused tests: pass, 4 tests
Combined PLS focused tests: pass, 10 tests
npm run build: pass
npm run frontend:build: pass
npm test: pass, 668 tests
git diff --check: pass with line-ending warnings only
frontend forbidden-label scan: pass, no forbidden product UI labels found in src/frontend
CSV parse: pass, backlog/backlog.csv 360 rows, deployment-ready-roadmap.csv 68 rows, no duplicate IDs
```

## Browser Smoke

Environment:

```text
Frontend dev server: http://127.0.0.1:5174/
Backend API: not running; demo account login fell back to local demo mode
```

Observed path:

```text
Shariah Reviewer:
Landing page -> Sign in -> Continue as Shariah Reviewer -> Shariah Review -> Approve
Result: decision message appeared and contract became ready for financing activation.

Financier:
Sign out -> Continue as Financier -> Financing -> Activate contract -> Record profit scenario -> Record loss scenario
Result: contract became active and profit/loss allocation records were visible.
```

## Manual UAT Path

Shariah reviewer:

```text
Landing page -> Sign in -> Continue as Shariah Reviewer -> Dashboard -> Shariah Review
Select PLS review record -> inspect ratio/loss/checklist metadata -> record decision
```

Financier:

```text
Landing page -> Sign in -> Continue as Financier -> Dashboard -> Financing
Select PLS contract -> inspect approval reference -> activate approved contract
Record profit scenario -> record loss scenario
```

## Known Limitations

- PLS is a restricted single-venture seedbed, not production Islamic finance product coverage.
- Distribution records are scenario records only and do not execute payment movement.
- The backend PLS repository is currently in-memory for fast local validation; PostgreSQL persistence can be added through the repository seam.
- The frontend Shariah queue uses local demo data for role UAT unless connected to a future PLS list endpoint backed by persistent seed data.
