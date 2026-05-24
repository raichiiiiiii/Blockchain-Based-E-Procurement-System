# Blockchain Anchor Contract

Status: Sprint 6 reference
Owner: Blockchain Engineer / Backend Engineer
Related PBIs: PBI-309, PBI-323, PBI-333, PBI-006
Related requirements: R05, R06, R22
Related docs:

- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/contracts/API_CONTRACTS.md`

## 1. Purpose

This contract defines the MVP blockchain anchor capability.

The purpose is to anchor selected off-chain audit and procurement event hashes to Hyperledger Fabric so that an auditor can verify that the off-chain event payload still matches the on-chain proof.

This contract covers:

- Fabric AuditAnchorContract chaincode functions
- backend blockchain anchor gateway semantics
- API response shape for proof and verification
- UI-facing proof states

## 2. Boundary

Blockchain anchoring proves event integrity. It does not replace:

- backend authorization
- business workflow validation
- PostgreSQL operational state
- KYC/AML review
- escrow business logic
- Shariah review logic

The backend remains responsible for authentication, authorization, canonical payload construction, and deciding which events are anchorable.

## 3. Anchor states

Anchor status values:

```ts
export type BlockchainAnchorStatus =
  | 'notAnchored'
  | 'pending'
  | 'anchored'
  | 'failed';
```

Verification result values:

```ts
export type BlockchainVerificationStatus =
  | 'verified'
  | 'mismatch'
  | 'notFound'
  | 'unavailable';
```

Rules:

- `notAnchored`: no anchor attempt has been made.
- `pending`: event exists and anchor is queued or waiting for Fabric result.
- `anchored`: Fabric accepted the anchor transaction.
- `failed`: anchor attempt failed but the off-chain event may still be valid.
- `verified`: submitted payload hash matches on-chain payload hash.
- `mismatch`: submitted payload hash differs from on-chain payload hash.
- `notFound`: no on-chain anchor exists for the event id.
- `unavailable`: verification could not reach Fabric or proof service.

## 4. Anchor input

Backend anchor input:

```ts
export type AnchorEventInput = {
  eventId: string;
  caseIdHash: string;
  eventType: string;
  payloadHash: string;
  schemaVersion: string;
  canonicalization: 'json-canonical-v1';
  occurredAt: string;
  previousEventHash?: string;
};
```

Validation rules:

- `eventId` is required and must be unique on-chain.
- `caseIdHash` is required and must already be hashed before chaincode submission.
- `eventType` is required and should match an approved backend event vocabulary.
- `payloadHash` is required and must be a stable canonical hash.
- `schemaVersion` is required.
- `canonicalization` must be explicit.
- `occurredAt` must be an ISO-8601 timestamp.
- `previousEventHash` is optional for first event in a lifecycle chain.

## 5. Anchor result

Backend anchor result:

```ts
export type AnchorEventResult = {
  eventId: string;
  anchorStatus: 'anchored' | 'pending' | 'failed';
  payloadHash: string;
  blockchainNetwork: 'fabric-local' | 'fabric';
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
};
```

Rules:

- successful Fabric submission returns `anchorStatus = anchored`.
- Fabric transaction id should be stored when available.
- failure must not erase the original business event.
- failure reason must be safe to show to operators; do not expose secrets.

## 6. On-chain anchor record

AuditAnchorContract stores this semantic shape:

```ts
export type OnChainAnchorRecord = {
  eventId: string;
  caseIdHash: string;
  eventType: string;
  payloadHash: string;
  schemaVersion: string;
  canonicalization: 'json-canonical-v1';
  occurredAt: string;
  anchoredAt: string;
  previousEventHash?: string;
};
```

The chaincode record is append-only. Existing anchors must not be updated.

## 7. AuditAnchorContract functions

### 7.1 anchorEvent

```text
anchorEvent(anchorJson: string): AnchorEventResult
```

Required behavior:

- parse anchor input
- validate required fields
- reject duplicate `eventId`
- write anchor record to world state
- emit or return anchor metadata where available

Failure cases:

```text
VALIDATION_ERROR
DUPLICATE_ANCHOR
FABRIC_WRITE_ERROR
```

### 7.2 getAnchor

```text
getAnchor(eventId: string): OnChainAnchorRecord | null
```

Required behavior:

- return anchor when found
- return null or explicit notFound response when absent
- do not fabricate anchor details

### 7.3 verifyEvent

```text
verifyEvent(eventId: string, payloadHash: string): VerificationResult
```

Verification result:

```ts
export type VerificationResult = {
  eventId: string;
  verificationStatus: 'verified' | 'mismatch' | 'notFound';
  submittedPayloadHash: string;
  anchoredPayloadHash?: string;
  anchoredAt?: string;
};
```

Required behavior:

- return `verified` when stored payloadHash equals submitted payloadHash
- return `mismatch` when event exists but hash differs
- return `notFound` when event id has no anchor

### 7.4 listAnchorsByCase

```text
listAnchorsByCase(caseIdHash: string): OnChainAnchorRecord[]
```

Required behavior:

- return all anchors associated with a hashed case id
- preserve deterministic ordering when possible
- return empty list for no records

## 8. Backend API contract

### 8.1 Get proof by event id

```text
GET /api/v1/blockchain/anchors/{eventId}
```

Success response:

```json
{
  "data": {
    "eventId": "event-123",
    "anchorStatus": "anchored",
    "payloadHash": "sha256:abc123",
    "blockchainNetwork": "fabric-local",
    "channelName": "procurement-channel",
    "chaincodeName": "audit-anchor",
    "transactionId": "fabric-tx-123",
    "blockNumber": "42",
    "anchoredAt": "2026-05-24T10:00:00.000Z"
  }
}
```

Not anchored response:

```json
{
  "data": {
    "eventId": "event-123",
    "anchorStatus": "notAnchored"
  }
}
```

### 8.2 Verify proof

```text
POST /api/v1/blockchain/anchors/{eventId}/verify
```

Request:

```json
{
  "payloadHash": "sha256:abc123"
}
```

Success response:

```json
{
  "data": {
    "eventId": "event-123",
    "verificationStatus": "verified",
    "submittedPayloadHash": "sha256:abc123",
    "anchoredPayloadHash": "sha256:abc123",
    "anchoredAt": "2026-05-24T10:00:00.000Z"
  }
}
```

Mismatch response:

```json
{
  "data": {
    "eventId": "event-123",
    "verificationStatus": "mismatch",
    "submittedPayloadHash": "sha256:changed",
    "anchoredPayloadHash": "sha256:abc123",
    "anchoredAt": "2026-05-24T10:00:00.000Z"
  }
}
```

Not found response:

```json
{
  "data": {
    "eventId": "event-123",
    "verificationStatus": "notFound",
    "submittedPayloadHash": "sha256:abc123"
  }
}
```

## 9. Error handling

Use the standard error envelope from `API_CONTRACTS.md`.

Expected errors:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
BLOCKCHAIN_UNAVAILABLE
```

A Fabric outage should usually produce a safe application-level unavailable state, not a fabricated proof.

## 10. UI proof fields

The frontend proof panel may show:

```text
anchorStatus
verificationStatus
eventId
payloadHash
transactionId
blockNumber
channelName
chaincodeName
anchoredAt
failureReason where safe
```

The frontend proof panel must not show raw private payloads, KYC documents, commercial terms, or personal data.

## 11. Integration with transaction history

When a procure-to-pay lifecycle event is anchored, transaction history may include proof metadata as an optional child object:

```json
{
  "eventId": "event-123",
  "eventType": "purchaseOrderCreated",
  "immutableReference": {
    "payloadHash": "sha256:abc123"
  },
  "blockchainAnchor": {
    "anchorStatus": "anchored",
    "transactionId": "fabric-tx-123",
    "channelName": "procurement-channel",
    "chaincodeName": "audit-anchor",
    "anchoredAt": "2026-05-24T10:00:00.000Z"
  }
}
```

The absence of `blockchainAnchor` means the event is not anchored or anchor metadata has not been loaded. It must not imply the event is invalid.

## 12. Security notes

- backend must authenticate protected proof operations
- auditor-only or operator-only access rules remain backend-owned
- payload hashes do not authorize actions
- Fabric transaction id does not prove the caller is authorized
- do not trust frontend-submitted actor identity
- do not put private raw data into chaincode arguments
