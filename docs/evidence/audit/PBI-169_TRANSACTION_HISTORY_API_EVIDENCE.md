# PBI-169 Transaction History API Evidence

## Scope

PBI-169 exposes the ordered procure-to-pay transaction-history read model through an API route with explicit completeness signaling.

Parent story: PBI-144  
Feature: PBI-005  
ReqID: R05

## Implementation Approach

This task adds a thin Fastify API route around the PBI-168 transaction-history read model.

The route validates request parameters, calls the application read model, and returns the approved transaction-history response shape.

## Files Changed

- `src/modules/procurement/api/transaction-history.routes.ts`
- `src/modules/procurement/api/transaction-history.routes.test.ts`
- `src/app/server.ts`

## Route Implemented

```text
GET /api/v1/procurement/transactions/:caseId/history
```

Supported query parameters:

```text
correlationId
```

## Response Behavior

The route returns responses wrapped in the standard success envelope:

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
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
    "items": []
  }
}
```

## Completeness Signaling

Implemented completeness behavior:

- empty history returns HTTP 200 with `items: []`
- empty history includes `completeness.status = "unknown"`
- empty history includes `completeness.reason = "no_events_recorded"`
- non-empty history does not overstate completeness as `complete`
- non-empty history includes explicit `unknown` completeness when completeness cannot be proven

## Validation Coverage

Validated route behavior:

- successful retrieval of lifecycle events by `caseId`
- exclusion of events from other `caseId` values
- optional `correlationId` filtering
- `occurredAt` ascending ordering
- `eventId` ascending tie-breaker ordering
- empty result handling
- empty result when no repository is provided
- blank `caseId` validation
- blank `correlationId` validation
- unsupported query parameter validation
- lifecycle event field projection
- immutable-reference field preservation

## Error Envelope Coverage

Validation failures use the standard validation error envelope through `createApplicationValidationError`.

Covered validation failures:

- blank `caseId`
- blank `correlationId`
- unsupported query parameters

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

## Notes

This task implements PBI-169 only.

Out of scope and not implemented:

- PBI-170 authorization hardening
- dashboard/UI
- regulator export packaging
- PBI-171 closure evidence
- new lifecycle event write behavior
- new persistence behavior
