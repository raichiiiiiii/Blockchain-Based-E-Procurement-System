# PBI-167 / PBI-143 Immutable Lifecycle Event Capture Closure Evidence

## Scope

PBI-167 validates and closes PBI-143: immutable procure-to-pay lifecycle event recording.

Feature: PBI-005  
Parent story: PBI-143  
Closure task: PBI-167  
ReqID: R05

## Completed Child Tasks

- PBI-164 — Implemented immutable procure-to-pay lifecycle event capture using the approved PBI-145 contract.
- PBI-165 — Added append-only persistence safeguards, correlation integrity, duplicate handling, and previous-hash validation.
- PBI-166 — Integrated procure-to-pay source mapping into the immutable lifecycle write path.

## Contract Validation

The implemented lifecycle event capture supports the approved PBI-145 fields:

- `eventId`
- `schemaVersion`
- `occurredAt`
- `recordedAt`
- `requestId`
- `correlationId`
- `caseId`
- `lifecycleStage`
- `eventType`
- `actorUserId`
- `actorSource`
- `targetType`
- `targetId`
- `outcome`
- `reason`
- `immutableReference`
- `metadata`

## Lifecycle Source Coverage

Validated lifecycle source mappings:

| Source Action | Lifecycle Stage | Target Type |
|---|---|---|
| `purchaseOrderCreated` | `purchaseOrder` | `purchaseOrder` |
| `deliveryRecorded` | `delivery` | `delivery` |
| `invoiceIssued` | `invoice` | `invoice` |
| `settlementInitiated` | `settlement` | `settlement` |

## Immutable Reference Evidence

Validated immutable reference behavior:

- `payloadHash` is generated for recorded lifecycle events.
- `canonicalization` is set to `json-stable-v1`.
- `previousEventHash` is preserved when provided.
- `sourcePayloadRef` is preserved when provided.
- `sourceRecordRef` is preserved when provided.
- append-only repository behavior rejects duplicate `eventId`.
- append-only repository behavior rejects duplicate `payloadHash`.
- previous-hash chaining requires the referenced hash to exist.
- previous-hash chaining requires matching `caseId` and `correlationId`.

## Representative Event Samples

### Purchase Order Event

```json
{
  "schemaVersion": "procure-to-pay-lifecycle-event.v1",
  "requestId": "req-test",
  "correlationId": "corr-test",
  "caseId": "ptp-case-test",
  "lifecycleStage": "purchaseOrder",
  "eventType": "purchaseOrderCreated",
  "actorUserId": "user-test",
  "actorSource": "actorContext",
  "targetType": "purchaseOrder",
  "targetId": "po-test",
  "outcome": "success",
  "immutableReference": {
    "payloadHash": "generated-sha256-hash",
    "canonicalization": "json-stable-v1"
  }
}
```

### Delivery Event With Previous Hash

```json
{
  "schemaVersion": "procure-to-pay-lifecycle-event.v1",
  "requestId": "req-delivery",
  "correlationId": "corr-test",
  "caseId": "ptp-case-test",
  "lifecycleStage": "delivery",
  "eventType": "deliveryRecorded",
  "actorUserId": "user-test",
  "actorSource": "actorContext",
  "targetType": "delivery",
  "targetId": "del-test",
  "outcome": "success",
  "immutableReference": {
    "payloadHash": "generated-sha256-hash",
    "canonicalization": "json-stable-v1",
    "previousEventHash": "previous-generated-sha256-hash",
    "sourcePayloadRef": "source-payload-ref",
    "sourceRecordRef": "source-record-ref"
  }
}
```

## Negative Path Validation

Validated negative-path behavior:

- invalid lifecycle stage is rejected.
- invalid lifecycle outcome is rejected.
- wrong event type for lifecycle stage is rejected.
- blank request/correlation/case/actor/event/target fields are rejected.
- unsupported source action is rejected.
- blank source identifier is rejected.
- duplicate event ID is rejected.
- duplicate payload hash is rejected.
- missing previous event hash is rejected.
- previous event hash from a different `caseId` or `correlationId` is rejected.

## Validation Commands

Build passed:

```text
npm run build
```

Targeted lifecycle capture tests passed:

```text
node --loader ts-node/esm --test src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.test.ts src/modules/procurement/application/record-procure-to-pay-lifecycle-event.test.ts src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.test.ts src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.test.ts
```

Full regression test suite passed:

```text
npm test
```

## Out of Scope

The following were not implemented in PBI-143 / PBI-167:

- ordered transaction-history retrieval API
- dashboard/UI
- regulator export packaging
- downstream reporting/consumer readiness
- PBI-144 read-side behavior

## Closure Decision

PBI-143 is ready to close after PBI-167 because:

- PBI-164 implemented the immutable lifecycle event capture seam.
- PBI-165 hardened append-only persistence and correlation integrity.
- PBI-166 integrated PO, delivery, invoice, and settlement source mappings.
- PBI-167 validation confirms lifecycle fields, immutable reference evidence, negative paths, and regression tests.
