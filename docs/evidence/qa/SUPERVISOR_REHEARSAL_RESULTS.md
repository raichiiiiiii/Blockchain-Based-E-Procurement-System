# Supervisor Rehearsal Results

Date: 2026-05-26

Branch: main

Commit inspected before rehearsal evidence: 6f81328

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This rehearsal followed the Amanah-Barakah-Mabrur commercial demo case against the local product UI. It was an internal supervisor-demo readiness check, not a production deployment, pilot launch, or commercial-readiness claim.

## Startup Result

Command:

```powershell
.\scripts\start-local-demo.ps1
```

Result: Passed.

Observed startup details:

- PostgreSQL container `pls-postgres` was running and healthy.
- Migrations applied successfully; existing migrations 001 to 004 were skipped and migration 005 was applied.
- Demo seed completed for demo accounts, procurement order, delivery evidence, proof metadata, and escrow.
- Backend launched on port 3100.
- Frontend launched on port 5173.
- Fabric deployment was skipped as expected because `-WithFabric` was not requested.

## Actor Routing Check

All mandatory demo actors and the should-have security operator could sign in from `/login` and reach role-specific dashboard navigation:

| Actor | Result |
| --- | --- |
| Administrator | Passed; Dashboard, Members, Roles, Access History visible. |
| Buyer / Procurement Officer | Passed; Dashboard, Orders, Escrow, Blockchain Proof visible. |
| SME / Supplier | Passed; Dashboard, Received Orders, Delivery Evidence, Escrow visible. |
| Compliance Reviewer | Passed; Dashboard, Compliance, Eligibility Status visible. |
| Shariah Reviewer | Passed; Dashboard, Shariah Review visible. |
| Bank / Financier | Passed; Dashboard, Financing, Shariah Review visible. |
| Auditor | Passed; Dashboard, Audit Trail, Blockchain Proof, Export Bundle visible. |
| Regulator / Reporting User | Passed; Dashboard, Export Bundle, Blockchain Proof visible. |
| Security Operator | Passed; Dashboard, Security Status, Access Alerts, Proof Failures, Denied Actions visible. |

Sampled product pages did not expose PBI, sprint, backlog, roadmap, story, task, or feature-lane labels.

## End-To-End Story Check

| Flow segment | Result | Notes |
| --- | --- | --- |
| Landing and sign in | Passed | Root route opened landing page; demo sign-in reached protected dashboard. |
| Administrator governance | Passed | Members, Roles, and Access History pages opened from administrator navigation. |
| Compliance review | Passed | Compliance reviewer recorded a decision and eligibility status remained visible. |
| Buyer order | Passed | Buyer created a procurement order from the Orders workspace. |
| Supplier acknowledgement | Passed | Supplier accepted an assigned order. |
| Supplier delivery evidence | Passed | Supplier recorded metadata-only delivery evidence for an accepted order. |
| Buyer delivery review | Passed | Buyer Orders page showed delivery evidence state, hash/lifecycle metadata, and no raw document payloads. |
| Escrow creation | Passed | Buyer created escrow from an accepted order and saw escrow-created proof metadata. |
| Blockchain proof panel | Passed for regulator; high-confusion gap for auditor | Regulator Blockchain Proof verified an anchored demo proof. Auditor Blockchain Proof page showed "No event proof is selected" and did not provide a direct verify action. |
| Shariah review | Passed | Shariah reviewer approved a pending PLS seedbed contract. |
| Financier PLS/distribution | Passed | Financier activated an approved contract and recorded profit/loss scenarios without payment-execution claims. |
| Regulator export bundle | Passed | Regulator requested export bundle and verified bundle integrity metadata. |
| Security status | Passed | Security operator opened backend-backed Security Status and Access Alerts read-only views. |

## Observed Issues

| Severity | Area | Issue | Recommended action |
| --- | --- | --- | --- |
| High confusion | Auditor proof workflow | Auditor Blockchain Proof route is a dead-end unless an event is selected elsewhere; the route has no direct proof panel or selection path. | In Phase 6, add an auditor-accessible proof panel or a clear event-selection path from Audit Trail to Blockchain Proof. |
| Documentation stale | Actor matrix | `ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md` still describes security alerts as frontend-local/follow-up even though PBI-416 added the backend read model. | Update the matrix during Phase 6 documentation polish. |
| Non-blocking | Fabric live path | Local Fabric live network was not part of this rehearsal; chaincode build/test and prerequisite smoke path exist. | Run live Fabric smoke only when local Fabric samples are configured. |

No demo-blocking route failure was observed in this rehearsal.

## Claim Safety Check

No sampled product copy claimed:

- production payment execution
- guaranteed profit or guaranteed principal
- production Islamic finance certification
- production Hyperledger Fabric consortium readiness
- external ERP/accounting integration
- ISO20022 payment execution
- full IoT/QR/logistics delivery evidence

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm test` | Passed; 687 tests, 0 failures. |
| `git diff --check` | Passed; line-ending warnings only. |

## Known Limitations

- The product remains supervisor demo ready, not pilot-ready or commercial-ready.
- Delivery evidence is metadata/hash only and excludes upload storage, IoT, QR signing, EPCIS compatibility, and external logistics integration.
- Escrow is an MVP workflow slice and does not execute settlement or payment release.
- PLS remains a restricted seedbed and does not imply formal Shariah certification, payment execution, guaranteed profit, or guaranteed principal.
- Export bundle verification uses MVP manifest/hash integrity, not production signing or external regulator portal delivery.
- Fabric live deployment depends on local Fabric sample prerequisites.

## Recommended Next Step

Proceed to Phase 6 and fix the auditor proof dead-end plus the stale security-operator wording in the actor acceptance matrix, then rerun a shorter supervisor rehearsal.
