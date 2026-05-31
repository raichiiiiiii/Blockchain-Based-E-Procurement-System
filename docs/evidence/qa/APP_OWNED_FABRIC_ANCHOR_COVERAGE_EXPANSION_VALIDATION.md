# App-Owned Fabric Anchor Coverage Expansion Validation

Date: 2026-05-31
Branch: `codex/issue-12-app-owned-anchor-coverage`
Commit inspected before change: `6304fc9b62cb28af2c9302b2eaab5579d597dd56`
Related issue: GitHub Issue #12

## Scope

Issue #12 extends the app-owned proof consistency coverage added for
`escrowCreated` in Issue #10. The goal is route-level proof consistency for at
least two additional core workflows that are created by the application, anchor
through the configured blockchain gateway, persist application-owned metadata,
and remain safe when anchoring fails.

This pass adds regression coverage only. It does not add new chaincode, change
`AuditAnchorContract` semantics, backfill external CLI anchors, or claim
commercial-ready or production-certified operation.

Safe readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening and production-like Fabric lab validation; not commercial-ready or production-certified.
```

## Workflows Selected

Selected additional workflows beyond `escrowCreated`:

1. `deliveryEvidenceSubmitted`
2. `escrowReleaseRequested`

## Reason For Selection

`deliveryEvidenceSubmitted` was selected because it is the next core procurement
proof point after supplier acknowledgement. It already has clean application
gateway wiring through `submitDeliveryEvidence` and is visible to buyer/auditor
proof workflows.

`escrowReleaseRequested` was selected because it is a distinct escrow lifecycle
transition after accepted order, delivery evidence, and eligibility checks are
satisfied. It already has clean application gateway wiring through
`transitionEscrow`.

`exportBundleGenerated` / `exportBundleSigned` was inspected but not selected
for this pass. Export bundles currently aggregate access history, lifecycle
events, and existing anchor metadata into an integrity manifest/signature. They
do not currently submit a new app-owned lifecycle proof to
`BlockchainAnchorGateway`, so using them for this specific issue would either
overstate current behavior or require a broader export anchoring feature change.

## Lifecycle Event and Payload Hash Path

`deliveryEvidenceSubmitted` route path:

```text
POST /api/v1/orders/:orderId/delivery-evidence
```

The route creates a delivery evidence record, emits a procure-to-pay lifecycle
event, computes the existing canonical lifecycle payload hash, calls
`anchorProcureToPayLifecycleEvent`, and saves anchor metadata.

`escrowReleaseRequested` route path:

```text
POST /api/v1/escrow/:escrowId/request-release
```

The route evaluates release conditions, emits an escrow lifecycle event,
computes the existing canonical lifecycle payload hash, calls
`anchorProcureToPayLifecycleEvent`, and saves anchor metadata.

The regression test uses a capturing gateway double to verify gateway input is
proof-level only:

- event id
- hashed case id
- event type
- canonical payload hash
- schema/canonicalization version
- occurred timestamp

The gateway input does not include raw delivery references, notes, accepted order
references, commercial terms, documents, KYC data, payment credentials, or PII.

## Anchor Metadata Result

For both selected workflows:

- successful route execution creates lifecycle event metadata
- metadata lookup by event id returns `anchorStatus = anchored`
- stored metadata payload hash matches the gateway-normalized lifecycle hash
- app metadata is created by the same app-owned route path that created the
  business event

## Proof API Result

For both selected workflows:

- `GET /api/v1/blockchain/anchors/{eventId}` returns anchored metadata for the
  app-created event
- `POST /api/v1/blockchain/anchors/{eventId}/verify` returns `verified` for the
  matching payload hash
- a different submitted payload hash returns `mismatch`
- a missing event id returns `notFound`

The proof API and application metadata lookup agree for both selected
app-created workflows.

## Failure Handling

For both selected workflows, an unavailable gateway is exercised with the
controlled gateway double.

Observed safe behavior:

- delivery evidence remains persisted when anchoring fails
- escrow release transition remains persisted when anchoring fails
- lifecycle event remains persisted when anchoring fails
- anchor metadata is saved with `anchorStatus = failed`
- failure reason is `blockchain_unavailable`

The base business event is not deleted, corrupted, or silently marked verified.

## Frontend Proof Surface Impact

No frontend code changed in this pass. Existing frontend proof surfaces continue
to consume backend proof metadata and must not fabricate transaction ids,
verified states, or Fabric availability. This pass strengthens backend route
coverage for the proof data those surfaces may display.

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/blockchain/api/app-owned-anchor-coverage-expansion.routes.test.ts` | Passed; 4 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm test` | Passed; 824 tests. |
| `npm run chaincode:audit-anchor:build` | Passed. |
| `npm run chaincode:audit-anchor:test` | Passed; 9 tests. |
| `npm run db:migrate -- --dry-run` | Passed; 17 migration files validated. |
| `npm run db:seed -- --dry-run` | Passed; 9 demo accounts and demo records validated. |
| `docker compose config` | Passed. |
| `docker compose -f docker-compose.app.yml config` | Passed. |
| PowerShell/Python CSV validation | Passed for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv`; no duplicate PBI IDs. |
| PowerShell tracked Fabric secret/artifact scan | Passed; no tracked generated Fabric secret/artifact material detected. |
| `git diff --check` | Passed with a line-ending warning for `docs/implementation/CODEX_TASK_LEDGER.md` only. |

## Known Limitations

- Live Fabric lab validation was not rerun in this pass.
- Export bundle app-owned anchoring is not claimed because export routes do not
  currently submit a new gateway anchor.
- Coverage now includes `escrowCreated`, `deliveryEvidenceSubmitted`, and
  `escrowReleaseRequested`; other future proof-bearing workflows should receive
  equivalent route-level regression coverage before broad app-owned proof
  consistency is claimed.
- Production Fabric operations gaps remain tracked in
  `docs/architecture/PRODUCTION_FABRIC_OPERATIONS_GAP_REGISTER.md`.

## Decision

Issue #12 acceptance is satisfied. Two additional core app-owned workflows now
have route-level proof consistency coverage, safe failure behavior, proof API
verification, and evidence documentation without changing chaincode or expanding
product readiness claims.
