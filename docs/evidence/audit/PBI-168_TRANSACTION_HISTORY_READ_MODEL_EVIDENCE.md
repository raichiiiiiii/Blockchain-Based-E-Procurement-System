# PBI-168 Transaction History Read Model Evidence

## Scope

PBI-168 implements the ordered transaction-history read model for procure-to-pay cases.

Parent story: PBI-144  
Feature: PBI-005  
ReqID: R05

## Implementation Approach

This task adds an application-layer read model only.

No HTTP/API route, authorization behavior, dashboard/UI, regulator export, or incomplete/gap signaling API behavior was implemented in this task.

## Files Changed

- `src/modules/procurement/application/procure-to-pay-transaction-history-read-model.ts`
- `src/modules/procurement/application/procure-to-pay-transaction-history-read-model.test.ts`

## Read Model Behavior

The read model:

- retrieves lifecycle events by `caseId`
- optionally filters by `correlationId`
- orders events by `occurredAt` ascending
- uses `eventId` ascending as a stable tie-breaker
- returns an empty successful read-model result when no events exist for the case
- preserves immutable-reference fields in returned projections
- does not mutate stored lifecycle events

## Response Shape

The application read model returns:

```ts
{
  caseId: string;
  correlationId?: string;
  ordering: {
    primary: 'occurredAt';
    secondary: 'eventId';
    direction: 'ascending';
  };
  items: ProcureToPayLifecycleEvent[];
}
```

## Validation Coverage

Validated behavior:

- related lifecycle events are returned for a `caseId`
- events from other `caseId` values are excluded
- optional `correlationId` filter narrows results
- ordering follows `occurredAt` ascending
- identical `occurredAt` values are ordered by `eventId` ascending
- empty result returns `items: []` without error
- blank `caseId` is rejected
- projected lifecycle event fields are preserved
- immutable-reference fields are preserved

## Validation Evidence

Targeted read-model tests passed:

```text
node --loader ts-node/esm --test src/modules/procurement/application/procure-to-pay-transaction-history-read-model.test.ts
```

Procurement regression tests passed:

```text
node --loader ts-node/esm --test src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.test.ts src/modules/procurement/application/record-procure-to-pay-lifecycle-event.test.ts src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.test.ts src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.test.ts src/modules/procurement/application/procure-to-pay-transaction-history-read-model.test.ts
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

This task implements PBI-168 only.

Out of scope and not implemented:

- transaction-history API
- incomplete/gap signaling API behavior
- authorization hardening
- dashboard/UI
- regulator export packaging
- PBI-144 story closure
