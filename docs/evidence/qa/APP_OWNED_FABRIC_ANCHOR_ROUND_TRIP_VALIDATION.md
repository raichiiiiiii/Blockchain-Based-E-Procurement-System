# App-Owned Fabric Anchor Round Trip Validation

Date: 2026-05-31
Branch: `codex/issues-10-11-app-anchor-ops-gaps`
Commit inspected before change: `aa25caecbc30d32b2e214358e3ebce93ee7f238a`
Related issue: GitHub Issue #10

## Scope

Issue #10 requested one app-owned workflow that creates a lifecycle event,
anchors the canonical payload hash through the configured blockchain gateway,
persists application-owned anchor metadata, and proves that metadata lookup and
verification agree for the app-created event.

This pass uses controlled route-level tests with the existing in-memory gateway
double. It does not rerun the live PBI-438 Fabric lab and does not claim
commercial-ready or production-certified Fabric operations.

## Environment

Local repository validation on Windows / PowerShell from:

```text
C:\Users\User\dev\main
```

Safe readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening and production-like Fabric lab validation; not commercial-ready or production-certified.
```

## App Workflow Used

Selected workflow:

```text
escrowCreated
```

Reason:

- escrow creation already persists a business record
- the flow emits a `ProcureToPayLifecycleEvent`
- the flow already uses `anchorProcureToPayLifecycleEvent`
- the flow has clean proof metadata and failure behavior

## Lifecycle Event Created

The route-level regression test creates an accepted procurement order, submits:

```text
POST /api/v1/escrows
```

as a buyer, and verifies that the response contains a lifecycle event id for an
`escrowCreated` event. The shared lifecycle repository is then checked to prove
that the event exists after the route completes.

## Payload Hash / Canonicalization

The selected workflow uses the existing canonical lifecycle event hash path.
The test verifies that the persisted metadata has a payload hash matching:

```text
sha256:<64 lowercase hex characters>
```

No raw escrow terms, commercial documents, payment credentials, KYC data, or PII
are written to the blockchain gateway input.

## Fabric Anchor Result

The automated regression uses `InMemoryBlockchainAnchorGateway` as the
controlled gateway double. It verifies that a successful gateway response is
persisted as:

```text
anchorStatus: anchored
```

Live Fabric lab rerun status:

```text
Not rerun in this pass.
```

The existing live Fabric lab evidence remains:

```text
docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md
```

## PostgreSQL Anchor Metadata Result

The route-level test uses the existing `BlockchainAnchorMetadataRepository`
contract through the in-memory metadata repository. It verifies that the
app-owned metadata repository is populated for the app-created event. The same
route wiring is used by the server composition with the PostgreSQL metadata
repository when PostgreSQL runtime mode is configured.

## Proof API Result

The test registers the escrow routes and blockchain anchor routes on the same
Fastify app with shared gateway and metadata repository instances. It verifies:

- `GET /api/v1/blockchain/anchors/{eventId}` returns `anchorStatus = anchored`
  for the app-created event.
- `POST /api/v1/blockchain/anchors/{eventId}/verify` returns `verified` for
  the stored matching payload hash.
- A different hash returns `mismatch`.
- A missing event returns `notFound`.

This closes the consistency gap where direct gateway verification and
application metadata lookup could disagree for externally created CLI anchors.
The repository still does not backfill CLI-created external anchors into app
metadata by default.

## Frontend Proof UI Result

No frontend code changed in this pass. Existing auditor/regulator proof surfaces
consume the proof API and already avoid fabricated transaction ids or verified
states. This pass strengthens the backend route behavior those surfaces read.

## Failure Handling

The second regression test forces the gateway unavailable path and verifies:

- `POST /api/v1/escrows` still returns a created escrow.
- the `escrowCreated` lifecycle event remains persisted.
- anchor metadata is persisted with `anchorStatus = failed`.
- the failure reason is `blockchain_unavailable`.

This preserves the rule that blockchain anchoring failure must not corrupt or
delete the base business event.

## Files Changed

- `src/modules/blockchain/api/app-owned-anchor-round-trip.routes.test.ts`
- `docs/evidence/qa/APP_OWNED_FABRIC_ANCHOR_ROUND_TRIP_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Related documentation links added in the same branch:

- `docs/architecture/PRODUCTION_FABRIC_OPERATIONS_GAP_REGISTER.md`
- `docs/architecture/PRODUCTION_FABRIC_CONSORTIUM_ARCHITECTURE.md`
- `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
- `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md`
- `docs/evidence/qa/POST_PBI438_RELEASE_RECONCILIATION.md`
- `docs/runbooks/pbi-438-production-like-fabric-lab.md`
- `fabric/production-consortium/README.md`

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/blockchain/api/app-owned-anchor-round-trip.routes.test.ts` | Passed; 2 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm test` | Passed; 820 tests. |
| `npm run chaincode:audit-anchor:build` | Passed. |
| `npm run chaincode:audit-anchor:test` | Passed; 9 tests. |
| `npm run db:migrate -- --dry-run` | Passed; 17 migration files validated. |
| `npm run db:seed -- --dry-run` | Passed; 9 demo accounts and demo records validated. |
| `docker compose config` | Passed. |
| `docker compose -f docker-compose.app.yml config` | Passed. |
| PowerShell/Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed; no duplicate PBI IDs. |
| PowerShell tracked Fabric secret/artifact scan | Passed; no generated Fabric secret/artifact material detected. |
| `git diff --check` | Passed; line-ending warnings only. |

## Known Limitations

- The live Fabric lab was not rerun for this issue; this branch adds automated
  app-owned route-level consistency coverage.
- App-created proof metadata and verification now agree for the selected
  `escrowCreated` workflow. Other workflows should get equivalent route-level
  coverage before being claimed complete.
- CLI-created external anchors are not automatically backfilled into the
  application metadata repository.
- Production Fabric operations gaps remain tracked separately.

## Decision

The selected app-owned `escrowCreated` path now has regression evidence that
lifecycle event creation, anchor metadata persistence, proof lookup, and proof
verification agree for app-created events while preserving safe failure
behavior.
