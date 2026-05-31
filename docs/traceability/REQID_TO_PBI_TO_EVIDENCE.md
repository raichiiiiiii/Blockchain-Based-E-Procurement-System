# ReqID To PBI To Evidence Traceability

Status: MVP baseline with PBI-438 reconciliation
Owner: Product Owner + QA + Architecture
Last updated: 2026-05-31

This map links the current MVP requirement families to backlog items, code areas, and evidence. It is intentionally compact; detailed acceptance criteria remain in the unified canonical backlog at `backlog/backlog.csv`.

## Traceability Matrix

| ReqID | Business capability | Key PBIs / ranges | Main code or docs | Evidence |
|---|---|---|---|---|
| R02 | KYC/AML onboarding and eligibility | PBI-002, PBI-383 to PBI-392 | `src/modules/kyc-aml-onboarding/`, `docs/contracts/ONBOARDING_ELIGIBILITY_CONTRACT.md` | `docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md`, route tests |
| R03 | Permissioned membership and RBAC | PBI-003, PBI-364 to PBI-371 | `src/modules/membership/`, `src/modules/access-control/`, `docs/contracts/AUTH_SESSION_CONTRACT.md` | `docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md`, auth/access-control tests |
| R05 | Procurement order lifecycle | PBI-005, PBI-372 to PBI-382 | `src/modules/procurement/`, `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md` | procurement order, delivery evidence, lifecycle tests |
| R06 | Supplier acceptance and delivery evidence | PBI-006, PBI-379, PBI-380, PBI-441, PBI-442 | `src/modules/procurement/`, `src/modules/escrow/`, `docs/contracts/ESCROW_WORKFLOW_CONTRACT.md` | `docs/evidence/qa/PBI-379_DELIVERY_EVIDENCE_MVP_VALIDATION.md`, escrow tests |
| R07 | PLS / mudarabah governance | PBI-007, PBI-393 to PBI-405, PBI-447 | `src/modules/financing/`, `src/modules/shariah-review/`, `src/modules/shariah-certification/` | PLS route tests, certificate route tests, scorecard |
| R15 | Regulator export and evidence bundle | PBI-015, PBI-406 to PBI-412, PBI-448 | `src/modules/reporting/`, `docs/contracts/EXPORT_SIGNING_KEY_MANAGEMENT_CONTRACT.md` | export bundle route tests, PBI-448 evidence, export bundle app-owned proof evidence |
| R17 | Role-based dashboards and product UI | PBI-017, PBI-263 to PBI-295, PBI-453 to PBI-455 | `src/frontend/`, `docs/architecture/FRONTEND_PRODUCT_JOURNEY.md` | browser smoke in `PRODUCTION_EXTENSION_RELEASE_VALIDATION.md` |
| R18 | Delivery and logistics proof boundary | PBI-018, PBI-443, PBI-444 | `src/modules/integration/`, `src/modules/procurement/`, `docs/contracts/IOT_QR_EPCIS_DELIVERY_PROOF_CONTRACT.md` | PBI-443/444 evidence, external API tests |
| R20 | Shariah workflow | PBI-020, PBI-393 to PBI-405, PBI-447 | `src/modules/shariah-review/`, `src/modules/shariah-certification/` | Shariah review and certificate tests |
| R22 | Audit, access history, proof, non-repudiation | PBI-022, PBI-309 to PBI-340, PBI-421, PBI-437, PBI-438 | `src/modules/shared/`, `src/modules/blockchain/`, `chaincode/audit-anchor/` | chaincode tests, blockchain route tests, PBI-438 production-like local Fabric lab evidence |
| R25 | Deployment and operator readiness | PBI-418 to PBI-428, PBI-459 to PBI-461 | `docker-compose.app.yml`, `scripts/smoke/`, `docs/runbooks/` | `PRODUCTION_EXTENSION_RELEASE_VALIDATION.md` |
| R26 | Supervisor demo and safe market claim | PBI-423, PBI-429 to PBI-435 | `docs/demo/`, `docs/runbooks/supervisor-demo-script.md`, `docs/evidence/qa/COMMERCIAL_READINESS_SCORECARD.md` | commercial readiness governance evidence |
| R28 | Export integrity and verification | PBI-406 to PBI-412, PBI-448 | `src/modules/reporting/` | export bundle route tests, PBI-448 evidence |
| R30 | Fabric proof anchoring | PBI-309 to PBI-323, PBI-437, PBI-438 | `src/modules/blockchain/`, `chaincode/audit-anchor/`, `fabric/production-consortium/` | PBI-437/438 evidence, chaincode tests |

## Current Evidence Anchors

- `docs/evidence/qa/FINAL_RELEASE_CANDIDATE_VALIDATION.md`
- `docs/evidence/qa/PRODUCTION_EXTENSION_RELEASE_VALIDATION.md`
- `docs/evidence/qa/COMMERCIAL_READINESS_SCORECARD.md`
- `docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md`
- `docs/evidence/qa/PBI-437_438_PRODUCTION_FABRIC_CONSORTIUM_VALIDATION.md`
- `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md`
- `docs/evidence/qa/POST_PBI438_RELEASE_RECONCILIATION.md`
- `docs/evidence/qa/PBI-459_CONTAINERIZED_DEPLOYABLE_MODEL_VALIDATION.md`
- `docs/evidence/qa/UNIFIED_BACKLOG_RECONCILIATION_VALIDATION.md`
- `docs/evidence/qa/EXPORT_BUNDLE_APP_OWNED_FABRIC_ANCHOR_VALIDATION.md`

## Traceability Gaps

- KYC/AML cases, Shariah reviews, PLS contracts, export bundles, operational incidents, documents, contracts, payment instructions, and integration jobs need persistence-specific evidence if the product claims deployment durability beyond the local supervisor demo.
- PBI-438 is complete for production-like local Fabric lab and runtime gateway
  validation. Managed production Fabric consortium operations, production CA
  governance, and HSM/KMS-backed identity lifecycle remain out of scope.
- Production-extension PBIs PBI-436 through PBI-462 now live in the unified
  canonical backlog. Historical roadmap CSVs under `backlog/archive/` are not
  active backlog sources.

## Maintenance Rules

- When a PBI status changes, update this matrix if it affects an MVP capability.
- When a new evidence file validates an actor workflow, link it here.
- Do not use this matrix to close PBIs by itself; use implementation evidence and backlog acceptance criteria.
