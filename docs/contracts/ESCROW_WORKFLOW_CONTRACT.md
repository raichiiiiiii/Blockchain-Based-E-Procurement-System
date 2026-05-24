# Escrow Workflow Contract

Status: Sprint 6 reference
Owner: Backend Engineer / Blockchain Engineer / Product Owner
Related PBIs: PBI-006, PBI-341, PBI-342, PBI-343, PBI-344, PBI-345, PBI-346, PBI-355
Related requirements: R05, R06, R17, R22
Related docs:

- `docs/architecture/ESCROW_SMART_CONTRACT_BOUNDARY.md`
- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/contracts/API_CONTRACTS.md`

## 1. Purpose

This contract defines the first executable scope for PBI-006 order acceptance and escrow workflow.

The first slice creates a controlled escrow state, emits a procure-to-pay lifecycle event, and exposes blockchain proof for the `escrowCreated` event.

## 2. Scope

In scope for first slice:

- escrow state model
- create escrow from accepted order or demo order reference
- retrieve escrow status
- retrieve escrow event/proof metadata
- emit lifecycle event for `escrowCreated`
- anchor `escrowCreated` event through blockchain gateway when available
- show safe proof metadata to frontend

Out of scope for first slice:

- real settlement execution
- external bank integration
- full settlement automation
- complete dispute arbitration
- full PLS distribution
- tokenized receivable lifecycle
- full multi-party Fabric consortium operations

## 3. Escrow states

```ts
export type EscrowStatus =
  | 'accepted'
  | 'escrowCreated'
  | 'releasePending'
  | 'releaseReady'
  | 'released'
  | 'cancelled'
  | 'disputed';
```

State meaning:

| State | Meaning |
|---|---|
| `accepted` | Order has been accepted but escrow record has not been created. |
| `escrowCreated` | Escrow terms and parties are recorded. |
| `releasePending` | Escrow exists but release proof conditions are not complete. |
| `releaseReady` | Required release proof conditions are satisfied. |
| `released` | Escrow has reached terminal released state. |
| `cancelled` | Escrow has reached terminal cancelled state. |
| `disputed` | Escrow is paused for dispute handling. |

## 4. First-slice transition

The first implementation slice only needs to support:

```text
accepted -> escrowCreated
```

Later slices may add:

```text
escrowCreated -> releasePending
releasePending -> releaseReady
releaseReady -> released
escrowCreated -> cancelled
releasePending -> disputed
releaseReady -> disputed
disputed -> released
disputed -> cancelled
```

Unsupported transitions must be rejected.

## 5. Escrow record shape

Semantic backend shape:

```ts
export type EscrowRecord = {
  escrowId: string;
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId?: string;
  termsHash: string;
  status: EscrowStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lifecycleEventId?: string;
  blockchainAnchor?: {
    anchorStatus: 'notAnchored' | 'pending' | 'anchored' | 'failed';
    transactionId?: string;
    channelName?: string;
    chaincodeName?: string;
    anchoredAt?: string;
  };
};
```

Do not expose raw private commercial terms as part of the default escrow response.

## 6. Create escrow request

```text
POST /api/v1/escrows
```

Request:

```json
{
  "orderId": "order-123",
  "buyerOrganizationId": "org-buyer-1",
  "supplierOrganizationId": "org-supplier-1",
  "financierOrganizationId": "org-financier-1",
  "termsHash": "sha256:terms-hash",
  "acceptedOrderReference": "accepted-order-demo-123"
}
```

Rules:

- authenticated actor context is required
- buyer and supplier organizations are required
- termsHash is required
- duplicate active escrow for the same order should be rejected
- accepted order reference may be demo/scaffolded in first slice
- raw escrow terms should not be required in this endpoint

Success response:

```json
{
  "data": {
    "escrowId": "escrow-123",
    "orderId": "order-123",
    "status": "escrowCreated",
    "termsHash": "sha256:terms-hash",
    "lifecycleEventId": "event-123",
    "blockchainAnchor": {
      "anchorStatus": "anchored",
      "transactionId": "fabric-tx-123",
      "channelName": "procurement-channel",
      "chaincodeName": "audit-anchor",
      "anchoredAt": "2026-05-24T10:00:00.000Z"
    }
  }
}
```

If anchoring is unavailable but escrow creation succeeds, return `status = escrowCreated` and `blockchainAnchor.anchorStatus = failed`.

## 7. Get escrow

```text
GET /api/v1/escrows/{escrowId}
```

The response returns escrow identifiers, organization ids, terms hash, status, timestamps, lifecycle event id, and blockchain anchor metadata when present.

## 8. Lifecycle event integration

Creating escrow must emit a procure-to-pay lifecycle event with:

```text
lifecycleStage = escrow
eventType = escrowCreated
targetType = escrow
targetId = escrowId
outcome = success
```

The lifecycle event payload hash is the preferred value to anchor to Fabric.

## 9. Blockchain anchoring behavior

After lifecycle event creation:

```text
create escrow
-> persist escrow
-> emit lifecycle event
-> compute or reuse lifecycle payloadHash
-> anchor event through BlockchainAnchorGateway
-> store anchor metadata
-> return escrow with anchor status
```

Anchor failure must not silently delete the escrow. The response must distinguish escrow status from anchor status.

## 10. Authorization expectations

First slice authorization may remain simple but must use trusted actor context from PBI-253.

Rules:

- unauthenticated create request is rejected
- actor identity must not come from request body
- backend authorization remains authoritative
- frontend role labels must not grant escrow privileges

## 11. UI expectations

Frontend escrow page should show:

```text
Escrow status
Order reference
Buyer/Supplier safe identifiers or labels
Terms hash
Lifecycle event id
Blockchain proof panel
```

UI must not show raw private commercial terms.

## 12. Error cases

Expected errors:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
BLOCKCHAIN_UNAVAILABLE
```

Where escrow creation succeeds but anchoring fails, prefer success response with `blockchainAnchor.anchorStatus = failed` rather than failing the whole business operation.

## 13. Acceptance criteria for first slice

- authenticated actor can create escrow from accepted/demo order reference
- created escrow enters `escrowCreated`
- lifecycle event is recorded
- lifecycle event hash is sent to blockchain anchor gateway when enabled
- escrow response includes blockchain anchor status
- auditor or buyer UI can display escrow status and blockchain proof status
- invalid input is rejected
- duplicate active escrow for same order is rejected
- tests and evidence are recorded
