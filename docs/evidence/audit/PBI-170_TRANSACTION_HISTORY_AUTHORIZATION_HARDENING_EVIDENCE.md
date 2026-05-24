# PBI-170 Transaction History Authorization and Negative-Path Hardening Evidence

## Scope

PBI-170 adds authorization and negative-path hardening to procure-to-pay transaction-history retrieval.

Parent story: PBI-144  
Feature: PBI-005  
ReqID: R05

## Implementation Approach

This task hardens the PBI-169 transaction-history API route.

The route now requires an authorized auditor-style actor context before returning procure-to-pay transaction-history data.

## Files Changed

- `src/modules/procurement/api/transaction-history.routes.ts`
- `src/modules/procurement/api/transaction-history.routes.test.ts`

If touched by implementation:

- `src/app/server.ts`

## Route Hardened

```text
GET /api/v1/procurement/transactions/:caseId/history
```

## Authorization Behavior

The route requires:

- authenticated actor context
- actor role includes `auditor`

Forbidden requests return:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query transaction history"
  }
}
```

Forbidden responses do not include transaction-history `data` or lifecycle event details.

## Negative-Path Coverage

Validated behavior:

- missing actor context / unauthenticated request is rejected
- authenticated non-auditor actor is rejected
- authorized auditor can retrieve ordered transaction history
- authorized auditor receives empty successful history for no-event cases
- blank `caseId` returns `VALIDATION_ERROR`
- blank `correlationId` returns `VALIDATION_ERROR`
- unsupported query parameters return `VALIDATION_ERROR`
- forbidden responses do not leak lifecycle event details

## Preserved Behavior

The hardened route preserves existing PBI-169 behavior:

- success response uses `{ data: ... }`
- ordered history is returned by `occurredAt` ascending
- `eventId` remains the stable tie-breaker
- optional `correlationId` filtering still works
- empty histories return HTTP 200 with `items: []`
- completeness metadata remains explicit and does not overstate completeness

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

This task implements PBI-170 only.

Out of scope and not implemented:

- PBI-171 closure evidence
- dashboard/UI
- regulator export packaging
- new lifecycle event write behavior
- new persistence behavior
- transaction-history consumer readiness
