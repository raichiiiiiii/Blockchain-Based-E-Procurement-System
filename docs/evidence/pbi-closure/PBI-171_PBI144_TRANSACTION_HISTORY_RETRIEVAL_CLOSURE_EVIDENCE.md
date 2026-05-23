# PBI-171 / PBI-144 Transaction History Retrieval Closure Evidence

## Scope

PBI-171 validates and closes PBI-144: ordered transaction-history retrieval for procure-to-pay cases.

Feature: PBI-005  
Parent story: PBI-144  
Closure task: PBI-171  
ReqID: R05

## Completed Child Tasks

- PBI-168 — Implemented the ordered transaction-history read model for procure-to-pay cases.
- PBI-169 — Exposed the transaction-history API with explicit completeness signaling.
- PBI-170 — Added authorization and negative-path hardening for transaction-history retrieval.

## Contract Validation

The transaction-history retrieval implementation follows the approved PBI-145 contract:

- results are grouped by `caseId`
- optional `correlationId` filtering is supported
- lifecycle events are ordered by `occurredAt` ascending
- `eventId` is used as the stable tie-breaker
- empty histories return a successful response with `items: []`
- completeness metadata is explicit
- completeness is not overstated as `complete` when it cannot be proven
- validation failures use the standard validation error envelope
- forbidden access does not leak lifecycle event details

## Implemented Route

```text
GET /api/v1/procurement/transactions/:caseId/history
```

Supported query parameters:

```text
correlationId
```

## Successful Ordered History Response Sample

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "completeness_not_proven",
      "message": "Available events are returned, but the repository cannot prove the sequence is complete."
    },
    "items": [
      {
        "eventId": "event-1",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2023-01-01T10:00:00.000Z",
        "recordedAt": "2023-01-01T10:00:05.000Z",
        "requestId": "req-1",
        "correlationId": "corr-1",
        "caseId": "ptp-case-123",
        "lifecycleStage": "purchaseOrder",
        "eventType": "purchaseOrderCreated",
        "actorUserId": "user-1",
        "actorSource": "actorContext",
        "targetType": "purchaseOrder",
        "targetId": "po-1",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "generated-sha256-hash",
          "canonicalization": "json-stable-v1"
        }
      },
      {
        "eventId": "event-2",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2023-01-02T10:00:00.000Z",
        "recordedAt": "2023-01-02T10:00:05.000Z",
        "requestId": "req-2",
        "correlationId": "corr-1",
        "caseId": "ptp-case-123",
        "lifecycleStage": "delivery",
        "eventType": "deliveryRecorded",
        "actorUserId": "user-2",
        "actorSource": "actorContext",
        "targetType": "delivery",
        "targetId": "del-1",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "generated-sha256-hash",
          "canonicalization": "json-stable-v1",
          "previousEventHash": "previous-generated-sha256-hash"
        }
      }
    ]
  }
}
```

## Empty Result Response Sample

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "no_events_recorded",
      "message": "No events have been recorded for this case"
    },
    "items": []
  }
}
```

## Validation Error Response Sample

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "issues": [
        {
          "path": "correlationId",
          "message": "correlationId cannot be blank"
        }
      ]
    }
  }
}
```

## Forbidden Response Sample

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query transaction history"
  }
}
```

## Validation Coverage

Validated behavior:

- authorized auditor can retrieve ordered transaction history
- unauthorized request is rejected with `FORBIDDEN`
- authenticated non-auditor request is rejected with `FORBIDDEN`
- forbidden responses do not include transaction-history `data`
- related lifecycle events are returned for a `caseId`
- events from other `caseId` values are excluded
- optional `correlationId` filtering narrows results
- ordering follows `occurredAt` ascending
- identical `occurredAt` values are ordered by `eventId` ascending
- empty result returns HTTP 200 with `items: []`
- empty result includes explicit `unknown` completeness
- blank `caseId` returns `VALIDATION_ERROR`
- blank `correlationId` returns `VALIDATION_ERROR`
- unsupported query parameters return `VALIDATION_ERROR`
- immutable-reference fields are preserved in returned projections

## Child Task Evidence

- `docs/evidence/audit/PBI-168_TRANSACTION_HISTORY_READ_MODEL_EVIDENCE.md`
- `docs/evidence/audit/PBI-169_TRANSACTION_HISTORY_API_EVIDENCE.md`
- `docs/evidence/audit/PBI-170_TRANSACTION_HISTORY_AUTHORIZATION_HARDENING_EVIDENCE.md`

## Validation Evidence

Targeted route tests passed:

```text
node --loader ts-node/esm --test src/modules/procurement/api/transaction-history.routes.test.ts
```

Read-model and API regression tests passed:

```text
node --loader ts-node/esm --test src/modules/procurement/application/procure-to-pay-transaction-history-read-model.test.ts src/modules/procurement/api/transaction-history.routes.test.ts
```

Build passed:

```text
npm run build
```

Full regression test suite passed:

```text
npm test
```

## Out of Scope

The following were not implemented in PBI-144 / PBI-171:

- dashboard/UI consumption
- regulator export packaging
- downstream consumer readiness
- PBI-149 consumer readiness validation
- new lifecycle event write behavior
- new persistence behavior

## Closure Decision

PBI-144 is ready to close after PBI-171 because:

- PBI-168 implemented ordered transaction-history read-model behavior.
- PBI-169 exposed the transaction-history API with explicit completeness signaling.
- PBI-170 hardened authorization and negative-path behavior.
- PBI-171 validation confirms ordered retrieval, empty-result behavior, completeness signaling, authorization, and error-envelope behavior.
