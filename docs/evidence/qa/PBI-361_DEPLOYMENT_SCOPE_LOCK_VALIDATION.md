# PBI-361 Deployment Scope Lock Validation

Date: 2026-05-25

## Scope

Wave 0 documentation and scope lock for the deployment-ready MVP roadmap:

- PBI-361 Complete actor-ready deployment MVP
- PBI-362 Lock MVP actor scope and source references
- PBI-363 Reconcile Sprint 6 backlog and evidence status

## Files Inspected

- `backlog/backlog.csv`
- `backlog/deployment-ready-roadmap.csv`
- `backlog/plan.mermaid`
- `docs/sprint-planning/SPRINT6_TASKS.md`
- `docs/sprint-planning/DEPLOYMENT_READY_MVP_ROADMAP.md`
- `docs/README.md`
- `docs/report/srs-v3.tex`
- `docs/proposals/business_proposal_digital_procurement_pls_seedbed.tex`
- `docs/architecture/*.md` roadmap references
- `docs/contracts/*.md` roadmap references
- `docs/runbooks/postgres-local-dev.md`
- `docs/runbooks/fabric-local-network.md`

## Findings

- `backlog/backlog.csv` parsed successfully with 360 rows and no duplicate PBI IDs.
- `backlog/deployment-ready-roadmap.csv` parsed successfully with 68 rows and no duplicate PBI IDs.
- Deployment roadmap rows include PBI ID, parent/epic, actor, ReqID, priority, owner, status, dependencies, acceptance criteria, deployment relevance, and source reference path fields.
- Source reference paths used by the roadmap exist.
- Active roadmap documentation already points to `docs/proposals/` for proposal sources.
- `docs/README.md` still mentions `docs/drafts/` only as migration guidance, not as an active roadmap source of truth.
- Sprint 6 recovery evidence exists for product entry, dashboard UX, PostgreSQL baseline, Fabric baseline, backend blockchain gateway, proof UI, and escrow first slice.
- `docs/runbooks/local-demo.md` was missing and has been added as the local demo entry runbook.
- `backlog/plan.mermaid` marked PBI-006 escrow first slice as active; it has been updated to done to match validation evidence.

## Sprint 6 Recovery Evidence Map

| Scope | Evidence |
|---|---|
| Product entry/login/dashboard | `docs/evidence/qa/PBI-263_PRODUCT_ENTRY_VALIDATION.md` |
| Dashboard UX/state flow | `docs/evidence/qa/PBI-282_DASHBOARD_UX_STATE_VALIDATION.md` |
| PostgreSQL persistence baseline | `docs/evidence/qa/PBI-296_POSTGRES_BASELINE_VALIDATION.md` |
| Fabric AuditAnchor baseline | `docs/evidence/qa/PBI-309_FABRIC_BASELINE_VALIDATION.md` |
| Backend blockchain gateway/proof API | `docs/evidence/qa/PBI-323_BLOCKCHAIN_GATEWAY_VALIDATION.md` |
| Blockchain proof UI | `docs/evidence/qa/PBI-333_BLOCKCHAIN_PROOF_UI_VALIDATION.md` |
| Escrow first slice | `docs/evidence/qa/PBI-006_ESCROW_FIRST_SLICE_VALIDATION.md` |

## Remaining Deployment Gaps

- Administrator workflow is not actor-complete.
- Supplier received-order and acknowledgment workflow is not actor-complete.
- Compliance reviewer UI and downstream eligibility gate are not complete.
- Shariah reviewer and financier PLS workflows are not complete.
- Regulator export bundle workflow is not complete.
- Security operator workflow remains should-have.
- Runtime PostgreSQL composition switch is not complete.
- Final actor UAT scripts, authorization matrix, and supervisor demo script are not complete.

## Validation Commands

```text
pass - CSV parse check for backlog/backlog.csv and backlog/deployment-ready-roadmap.csv
pass - deployment roadmap source reference existence check
pass - Sprint 6 evidence and runbook reference existence check
pass - git diff --check
```

Validation notes:

- `backlog/backlog.csv`: 360 rows, no duplicate PBI IDs.
- `backlog/deployment-ready-roadmap.csv`: 68 rows, no duplicate PBI IDs.
- All `SourceReferencePath` entries in `backlog/deployment-ready-roadmap.csv` resolve to existing files or directories.
- `git diff --check` exited with status 0. Output included LF-to-CRLF normalization warnings for edited documentation/backlog files only.
- `npm run build`, `npm run frontend:build`, and `npm test` were not rerun for Wave 0 because this wave changed documentation/backlog planning artifacts only.
