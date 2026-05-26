# Payment Adapter Contract

Status: pilot-hardening reference
Owner: Backend Engineer / Product Owner
Related PBIs: PBI-439, PBI-441
Related requirements: R06, R11, R12, R22

## 1. Purpose

This contract defines the sandbox/manual payment instruction boundary for the Digital Procurement and PLS Seedbed MVP.

The payment adapter records auditable settlement instruction state after escrow release approval. It does not execute real bank transfers, ISO 20022 payment rails, payment credentials, or production settlement.

## 2. In Scope

- `PaymentPort` application boundary
- `ManualSettlementAdapter`
- `LocalSandboxPaymentAdapter`
- payment instruction record
- payment status reconciliation
- lifecycle events for settlement status
- backend routes for create, read, and reconcile
- frontend payment instruction surface on escrow detail

## 3. Out of Scope

- real payment execution
- bank connectivity
- ISO 20022 message generation
- payment credentials storage
- automatic escrow settlement finality
- production reconciliation files

## 4. Payment Instruction Shape

```ts
type PaymentInstruction = {
  paymentInstructionId: string;
  escrowId: string;
  amount: string;
  currency: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  status: 'pending' | 'accepted' | 'failed' | 'settled' | 'cancelled';
  paymentReference: string;
  adapterName: 'manualSettlement' | 'localSandbox';
  adapterReference?: string;
  failureReason?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  lifecycleEventIds: string[];
};
```

## 5. API Routes

```text
POST /api/v1/payments/instructions
GET /api/v1/payments/instructions/{paymentInstructionId}
POST /api/v1/payments/instructions/{paymentInstructionId}/reconcile
```

Create request:

```json
{
  "escrowId": "escrow-123",
  "amount": "68000.00",
  "currency": "MYR",
  "paymentReference": "settlement:escrow-123",
  "adapterName": "localSandbox"
}
```

Reconcile request:

```json
{
  "status": "settled"
}
```

## 6. Rules

- authenticated actor context is required
- escrow must exist
- escrow must be in `settlementInstructionReady`
- duplicate active payment instructions for the same escrow are rejected
- buyer or financier may create a payment instruction for their escrow
- financier, buyer debtor, or administrator may reconcile sandbox/manual status
- auditor, regulator, security operator, and related parties may read according to route authorization
- failed payment status must not corrupt escrow state

## 7. Lifecycle Events

Payment instruction actions emit settlement lifecycle events:

- `settlementInitiated`
- `settlementCompleted`
- `settlementFailed`

Lifecycle metadata must state that the adapter is sandbox/manual only.

## 8. Claim Boundary

Product UI may say:

- Payment Instruction
- Sandbox settlement status
- Manual settlement status
- Payment status evidence

Product UI must not claim:

- payment has moved through bank rails
- ISO 20022 execution is complete
- payment confirmation was received from an external bank
- production settlement occurred
