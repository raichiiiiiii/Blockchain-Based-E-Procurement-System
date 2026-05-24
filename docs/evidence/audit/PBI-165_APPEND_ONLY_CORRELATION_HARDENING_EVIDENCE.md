# PBI-165 Append-Only and Correlation Hardening Evidence

## Scope

PBI-165 hardens the procure-to-pay lifecycle event write path created in PBI-164.

Parent story: PBI-143  
Feature: PBI-005  
ReqID: R05

## Files Changed

- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.test.ts`
- `src/modules/procurement/application/record-procure-to-pay-lifecycle-event.test.ts`
- `src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.ts`
- `src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.test.ts`

## Safeguards Implemented

- Duplicate `eventId` is rejected.
- Duplicate `immutableReference.payloadHash` is rejected.
- First event in a case/correlation sequence may omit `previousEventHash`.
- Chained event is accepted only when `previousEventHash` points to an existing stored event.
- Chained event is rejected when the previous hash belongs to a different `caseId` or `correlationId`.
- Repository remains append-only; no update/delete methods were added.
- Defensive cloning remains in place for saved and listed events.
- Record use case allows validation/persistence errors to propagate.

## Negative Path Coverage

Validated rejection behavior for:

- invalid lifecycle stage
- invalid outcome
- blank request/correlation/case/actor/event/target fields
- duplicate event ID
- duplicate payload hash
- missing previous event hash
- previous event hash correlation mismatch

## Validation Evidence

Build passed:

```text
npm run build
