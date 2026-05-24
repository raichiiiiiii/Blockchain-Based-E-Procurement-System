# PBI-164 Procure-to-Pay Lifecycle Capture Evidence

## Scope

PBI-164 implements the procure-to-pay lifecycle event capture seam using the approved PBI-145 transaction-history contract.

Parent story: PBI-143  
Feature: PBI-005  
ReqID: R05

## Files Changed

- `src/modules/procurement/application/procure-to-pay-lifecycle-event.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-repository.ts`
- `src/modules/procurement/application/record-procure-to-pay-lifecycle-event.ts`
- `src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.test.ts`
- `src/modules/procurement/application/record-procure-to-pay-lifecycle-event.test.ts`
- `src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.test.ts`

## Contract Coverage

Implemented lifecycle capture fields:

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

Supported lifecycle stages:

- `purchaseOrder`
- `delivery`
- `invoice`
- `settlement`

Implemented immutable reference evidence:

- `payloadHash`
- `canonicalization`
- `previousEventHash`
- `sourcePayloadRef`
- `sourceRecordRef`
- `anchorRef`

## Validation Evidence

Targeted tests passed:

```text
node --loader ts-node/esm --test src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.test.ts src/modules/procurement/application/record-procure-to-pay-lifecycle-event.test.ts src/modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.test.ts
