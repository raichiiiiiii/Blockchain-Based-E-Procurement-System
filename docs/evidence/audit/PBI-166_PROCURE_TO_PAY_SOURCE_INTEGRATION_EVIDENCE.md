# PBI-166 Procure-to-Pay Source Integration Evidence

## Scope

PBI-166 integrates procure-to-pay source actions into the immutable lifecycle write path created in PBI-164 and hardened in PBI-165.

Parent story: PBI-143  
Feature: PBI-005  
ReqID: R05

## Implementation Approach

No full PO, delivery, invoice, or settlement business modules/routes were implemented in this task.

Instead, this task adds an application-layer source integration seam that maps source actions into the approved lifecycle event write path.

## Files Changed

- `src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.test.ts`

## Source Mapping Coverage

Supported source mappings:

- `purchaseOrderCreated` -> `purchaseOrder`
- `deliveryRecorded` -> `delivery`
- `invoiceIssued` -> `invoice`
- `settlementInitiated` -> `settlement`

The integration seam maps source data into:

- `requestId`
- `actorUserId`
- `correlationId`
- `caseId`
- `lifecycleStage`
- `eventType`
- `targetType`
- `targetId`
- `outcome`
- immutable reference fields

## Validation and Hardening Coverage

Validated behavior:

- purchase order source emits purchase-order lifecycle event
- delivery source emits delivery lifecycle event
- invoice source emits invoice lifecycle event
- settlement source emits settlement lifecycle event
- source references and `previousEventHash` are preserved
- unsupported source/action is rejected
- blank source identifier is rejected
- invalid correlation still rejects through existing lifecycle validation
- repository append-only/duplicate safeguards propagate through the source integration seam
- valid write remains successful
- undefined repository returns `null`

## Validation Evidence

Build passed:

```text
npm run build
```

Targeted and full tests passed:

```
node --loader ts-node/esm --test src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.test.ts

npm test
```

## Notes

This task integrates source mapping/wiring only.

Out of scope and not implemented:

- transaction-history retrieval API
- dashboard/UI
- regulator export packaging
- full PO/delivery/invoice/settlement business workflows
- PBI-143 story closure
