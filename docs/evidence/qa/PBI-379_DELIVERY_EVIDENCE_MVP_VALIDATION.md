# PBI-379/PBI-380 Delivery Evidence MVP Validation

Date: 2026-05-26
Branch: `feature/PBI-379-delivery-evidence-mvp`
Base commit inspected before change: `ae57ed8e48021011e0928ba34be777c7028cd792`

## Scope

This evidence covers the MVP delivery evidence workflow for:

- `PBI-379` Delivery evidence placeholder
- `PBI-380` Buyer delivery review page

The slice upgrades the supervisor-demo placeholder into a real metadata/hash workflow. It does not implement IoT hardware, QR signing infrastructure, external logistics APIs, EPCIS compatibility, document upload storage, document rendering, production signature verification, or automatic escrow release.

## Files Changed

- `backlog/backlog.csv`
- `docs/architecture/STATE_MODELS.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md`
- `docs/evidence/qa/COMMERCIAL_READINESS_SCORECARD.md`
- `docs/evidence/qa/PBI-379_DELIVERY_EVIDENCE_MVP_VALIDATION.md`
- `docs/runbooks/supervisor-demo-script.md`
- `src/app/server.ts`
- `src/frontend/api/delivery-evidence.ts`
- `src/frontend/components/procurement/DeliveryEvidenceList.tsx`
- `src/frontend/pages/BuyerDashboard.tsx`
- `src/frontend/pages/SupplierDashboard.tsx`
- `src/frontend/styles.css`
- `src/frontend/types/delivery-evidence.ts`
- `src/modules/procurement/api/delivery-evidence.routes.test.ts`
- `src/modules/procurement/api/delivery-evidence.routes.ts`
- `src/modules/procurement/application/delivery-evidence-repository.ts`
- `src/modules/procurement/application/list-delivery-evidence.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.ts`
- `src/modules/procurement/application/submit-delivery-evidence.ts`
- `src/modules/procurement/domain/delivery-evidence.ts`
- `src/modules/procurement/infrastructure/in-memory-delivery-evidence-repository.ts`

## API Routes Added

- `POST /api/v1/orders/:orderId/delivery-evidence`
- `GET /api/v1/orders/:orderId/delivery-evidence`

Both routes require authenticated server-derived actor context through the existing auth pre-handler.

## Backend Behavior

- Supplier can submit delivery evidence only for an assigned accepted order.
- Unrelated supplier receives `FORBIDDEN`.
- Missing order receives `NOT_FOUND`.
- Unaccepted order receives `CONFLICT`.
- Anonymous requests receive `UNAUTHORIZED`.
- Invalid evidence payloads return the standard `VALIDATION_ERROR` envelope.
- Buyer can read evidence for their own order.
- Unrelated buyer cannot read evidence.
- Auditor, regulator, administrator, and security operator read access is available through the application read policy.

## Audit Event Behavior

Submitting evidence emits a procure-to-pay lifecycle event:

```text
lifecycleStage = delivery
eventType = deliveryEvidenceSubmitted
targetType = delivery
targetId = evidenceId
```

The lifecycle event stores safe metadata only: order id, buyer/supplier organization ids, evidence id, evidence type, evidence hash, and `metadataRecorded` status.

## Blockchain Proof Behavior

- The delivery evidence lifecycle event hash is passed through the existing blockchain anchoring seam when gateway dependencies are available.
- Successful in-memory anchoring returns `anchored`.
- Unavailable anchoring returns `failed` on the evidence proof metadata without deleting the evidence record.
- UI proof panels distinguish `pending`, `failed`, `notAnchored`, and `anchored`.
- No raw delivery note, document, payment data, or commercial payload is written on-chain.
- No Fabric transaction ID or verified state is fabricated.

## Frontend Screens Updated

Supplier:

- `Delivery Evidence` now shows accepted orders.
- Supplier can submit evidence type, safe reference, and notes.
- Submitted evidence shows evidence hash, lifecycle event id/hash, and proof state.

Buyer:

- `Orders` detail now includes a delivery evidence panel.
- Buyer can view supplier-submitted evidence metadata, evidence hash, lifecycle event id/hash, and proof state.
- Failed proof is visibly distinct and is not treated as verified.

## Validation Commands and Results

```powershell
node --test --loader ts-node/esm src/modules/procurement/api/delivery-evidence.routes.test.ts
```

Result: passed, 9 tests.

```powershell
npm run build
```

Result: passed.

```powershell
npm run frontend:build
```

Result: passed after fixing one frontend type narrowing issue in the local demo delivery evidence submit path.

```powershell
npm test
```

Result: passed, 677 tests.

Browser smoke check:

```text
http://127.0.0.1:5175/
```

Result: passed.

- Supplier demo account reached Delivery Evidence.
- Supplier submitted evidence metadata.
- Supplier saw submitted evidence plus failed and pending proof states.
- Buyer demo account reached Orders.
- Buyer saw delivery evidence recorded and proof state on order detail.

```powershell
git diff --check
```

Result: passed. Git reported Windows LF-to-CRLF working-copy warnings only; no whitespace errors.

```powershell
python backlog CSV validation script
```

Result: passed, 435 rows, no duplicate PBI IDs, allowed statuses only, `PBI-379` and `PBI-380` marked `Completed`.

## Backlog Status

- `PBI-379`: `Planned` -> `Completed`
- `PBI-380`: `Planned` -> `Completed`

The broad signed IoT/QR delivery proof feature remains out of scope and post-MVP.

## Known Limitations

- No IoT hardware integration.
- No QR signing infrastructure.
- No external logistics API integration.
- No EPCIS compatibility.
- No document upload storage.
- No image/PDF rendering.
- No production signature verification.
- No automatic escrow release based on delivery evidence.
- Runtime PostgreSQL persistence for delivery evidence is not added in this slice; the MVP path uses the in-memory repository seam like the current procurement order slice.
