# Backlog Grooming Scope Reconciliation

Date: 2026-05-26
Branch: main
Scope: Backlog and planning governance only

## Purpose

This pass resolves ambiguity between broad legacy backlog rows and newer supervisor-demo MVP slices. It does not upgrade the product beyond the commercial readiness scorecard rating of `Supervisor demo ready`, and it does not claim pilot-ready or commercial-ready status.

No frontend, backend, domain, database, blockchain, migration, chaincode, package, Vite, or Docker files were edited.

## Files Inspected

- `backlog/backlog.csv`
- `docs/evidence/qa/BACKLOG_STATUS_RECONCILIATION.md`
- `docs/evidence/qa/COMMERCIAL_READINESS_BACKLOG_UPDATE.md`
- `docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md`
- `docs/evidence/qa/COMMERCIAL_READINESS_SCORECARD.md`
- `docs/sprint-planning/COMMERCIAL_READINESS_PLAN.md`
- `docs/sprint-planning/DEPLOYMENT_READY_MVP_ROADMAP.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/report/product-diagnosis-redesign/product_diagnosis_redesign_report.tex`
- `docs/contracts/ESCROW_WORKFLOW_CONTRACT.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/contracts/ONBOARDING_ELIGIBILITY_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/architecture/ESCROW_SMART_CONTRACT_BOUNDARY.md`
- `docs/architecture/BLOCKCHAIN_PROOF_UI_CONTRACT.md`
- `docs/architecture/FABRIC_MVP_BOUNDARY.md`

## PBIs Reviewed

Escrow:

- `PBI-006`
- `PBI-192` to `PBI-203`
- `PBI-341` to `PBI-360`

PLS:

- `PBI-007`
- `PBI-204` to `PBI-215`
- `PBI-393` to `PBI-405`

Regulator export:

- `PBI-015`
- `PBI-216` to `PBI-227`
- `PBI-406` to `PBI-412`

Delivery evidence:

- `PBI-018`
- `PBI-245` to `PBI-246`
- `PBI-379` to `PBI-380`

Security operator:

- `PBI-025`
- `PBI-413` to `PBI-417`

Commercial readiness governance:

- `PBI-429` to `PBI-435`

## PBIs Whose Notes Were Updated

Notes were updated for 97 rows:

```text
PBI-006, PBI-007, PBI-015, PBI-018, PBI-025,
PBI-192 to PBI-227,
PBI-245 to PBI-246,
PBI-341 to PBI-360,
PBI-379 to PBI-380,
PBI-393 to PBI-417,
PBI-429 to PBI-435
```

The notes clarify one of the following:

- completed for supervisor-demo MVP scope
- first-slice evidence exists under newer PBIs
- broad legacy scope remains for future hardening
- placeholder or frontend-local scope remains Planned
- commercial-readiness artifacts exist but require explicit review before closure

## PBIs Whose Statuses Changed

None.

Status changes were intentionally avoided because the existing statuses already matched the requested guardrails:

- broad parent features remain `Planned` or `Deferred`
- completed MVP slice rows remain `Completed`
- placeholder/follow-up rows remain `Planned` or `Ready for Refinement`
- commercial readiness governance rows remain `Planned`

## Final Status Summary by Area

### Escrow

`PBI-341` to `PBI-360` remain `Completed` for the supervisor-demo escrow first slice: accepted order or demo accepted-order reference to `escrowCreated`, lifecycle event, and proof metadata.

`PBI-006` remains `Planned` because the broader parent still includes release, settlement, dispute, and full lifecycle acceptance beyond the first slice.

`PBI-192` to `PBI-203` remain `Ready for Refinement` as future full lifecycle/release/settlement hardening unless Product Owner narrows the scope.

### PLS

`PBI-393` to `PBI-405` remain `Completed` for the restricted Shariah-governed PLS seedbed: review flow, activation gate, and distribution scenarios.

`PBI-007` remains `Planned` because the broader parent still needs explicit closure or narrowing for full PLS contract/distribution workflow acceptance.

`PBI-204` to `PBI-215` remain `Ready for Refinement` as future production-grade PLS calculation/read-model hardening unless narrowed.

### Regulator Export

`PBI-406` to `PBI-412` remain `Completed` for the export bundle MVP: request, manifest/integrity metadata, verification endpoint, and UAT evidence.

`PBI-015` remains `Planned` because production signing, download delivery, and broader integrity/export-delivery scope are not fully closed.

`PBI-216` to `PBI-227` remain `Ready for Refinement` for production signing/download/export-delivery hardening unless narrowed.

### Delivery Evidence

`PBI-018` remains `Deferred` because real signed IoT/QR delivery proof is not implemented.

`PBI-245` to `PBI-246` remain `Ready for Refinement` because real signed delivery proof submission and buyer verification review are not implemented.

`PBI-379` and `PBI-380` remain `Planned` because the supervisor demo uses metadata-only delivery evidence.

### Security Operator

`PBI-413`, `PBI-414`, `PBI-415`, and `PBI-417` remain `Completed` for read-only supervisor-demo security operator scope.

`PBI-416` remains `Planned` because the security alert read model is frontend-local/demo-level and backend persisted query/read model remains future work.

`PBI-025` remains `Deferred` because production monitoring dashboards and incident-management hooks are not implemented.

### Commercial Readiness Governance

`PBI-429` to `PBI-435` remain `Planned`.

Commercial-readiness planning artifacts now exist, including the canonical demo case, supervisor demo script, actor workflow matrix, scorecard, innovation backlog, and update evidence. Closure should happen only after the relevant artifact is reviewed and accepted.

## Areas Left for Future Grooming

- Decide whether broad parent PBIs should be narrowed to the completed supervisor-demo scope or retained as post-MVP production hardening.
- Split delivery evidence into metadata-only MVP documentation versus signed IoT/QR/upload/review implementation.
- Split security operator into read-only demo status versus backend persisted alert query/read model and incident hooks.
- Decide whether export bundle MVP rows satisfy any legacy signed/download rows, or whether those remain production signing/key-management work.
- Decide whether restricted PLS seedbed evidence should close any legacy PLS rows, or whether formal Shariah/legal/commercial hardening remains separate.
- Review and accept `PBI-429` to `PBI-435` artifacts before closing commercial readiness governance PBIs.

## Validation Commands and Results

```powershell
python CSV validation script for backlog/backlog.csv
git diff --check
```

Results:

```text
CSV validation passed: header matched, rows = 435, no duplicate PBI IDs, no invalid PBI IDs, statuses all allowed.
git diff --check: passed; Windows line-ending warning only for backlog/backlog.csv.
Status counts unchanged: Completed 340, Planned 13, Ready for Refinement 61, Deferred 21.
```

Application build/test commands were not run because no implementation code changed.
