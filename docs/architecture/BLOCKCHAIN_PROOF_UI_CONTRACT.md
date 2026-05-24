# Blockchain Proof UI Contract

Status: Sprint 6 reference
Owner: Frontend Engineer / Blockchain Engineer
Related PBIs: PBI-333, PBI-334, PBI-335, PBI-336, PBI-337, PBI-338, PBI-339, PBI-340
Related requirements: R05, R06, R17, R22
Related docs:

- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/architecture/FRONTEND_PRODUCT_JOURNEY.md`

## 1. Purpose

This document defines how blockchain proof should appear in the frontend.

The proof UI must make Fabric anchoring visible to a supervisor, auditor, or operator without exposing private business data or internal backlog terminology.

## 2. Product language

Use product language:

```text
Blockchain Proof
Proof status
Verified
Mismatch
Pending anchoring
Anchoring failed
Fabric transaction
Audit event hash
```

Do not use backlog language:

```text
PBI-333
Task PBI-339
Sprint artifact
Enabler proof
```

## 3. Proof panel states

The reusable proof panel must support these states:

| State | Meaning | UI behavior |
|---|---|---|
| `notAnchored` | No anchor exists or was not attempted | Show neutral explanation. |
| `pending` | Anchor queued or awaiting Fabric result | Show pending badge. |
| `anchored` | Fabric anchor exists | Show transaction reference and verify action. |
| `failed` | Anchor attempt failed | Show safe failure message and retry note if available. |
| `verifying` | Verification request in progress | Disable verify button and show progress. |
| `verified` | Submitted hash matches anchor | Show success result. |
| `mismatch` | Submitted hash differs from anchor | Show warning and investigation copy. |
| `notFound` | Fabric has no record for event | Show not-found state. |
| `unavailable` | Proof service or Fabric unavailable | Show safe unavailable state. |

## 4. Visible fields

The proof panel may show:

```text
Proof status
Verification result
Event ID
Payload hash
Fabric transaction ID
Block number
Channel
Chaincode
Anchored timestamp
Safe failure reason
```

The proof panel must not show:

```text
raw KYC/AML data
raw invoice payload
full escrow terms
personal email or name unless already part of authorized screen
raw commercial terms
private documents
chaincode private keys or credentials
```

## 5. Component contract

Recommended component props:

```ts
export type BlockchainProofPanelProps = {
  eventId: string;
  payloadHash?: string;
  anchorStatus: 'notAnchored' | 'pending' | 'anchored' | 'failed';
  verificationStatus?: 'verified' | 'mismatch' | 'notFound' | 'unavailable';
  transactionId?: string;
  blockNumber?: string;
  channelName?: string;
  chaincodeName?: string;
  anchoredAt?: string;
  failureReason?: string;
  onVerify?: (eventId: string, payloadHash?: string) => Promise<void> | void;
};
```

## 6. Placement rules

Place proof panel in:

- audit event detail page
- procure-to-pay event detail or transaction history row detail
- escrow detail page once PBI-006 first slice exists
- regulator export detail in a later PBI-015 flow

Do not place proof panel on landing page as if a real event proof exists. The landing page may explain blockchain proof conceptually, but it must not fabricate real proof data.

## 7. Verify action

The verify action calls the backend proof endpoint from `BLOCKCHAIN_ANCHOR_CONTRACT.md`.

Expected UX:

```text
User clicks Verify proof
-> button enters verifying state
-> backend returns verified/mismatch/notFound/unavailable
-> result appears in panel
```

Rules:

- verification must not mutate the underlying event
- mismatch must be visually prominent
- unavailable must not be shown as verified
- absence of a proof must not imply the business event is invalid unless backend explicitly says so

## 8. Empty and partial states

If a page has an event but no blockchain proof:

```text
Show: This event has not been anchored to Fabric yet.
Do not show fake transaction IDs.
```

If proof has transaction ID but no block number:

```text
Show transaction ID and omit block number.
Do not fabricate block metadata.
```

If proof is pending:

```text
Show: Blockchain anchoring is pending.
```

## 9. Visual baseline

Minimum presentation:

- badge for proof status
- monospace wrapping for hashes and transaction IDs
- clear verify button
- timestamp section
- short explanation of what is being verified
- warning style for mismatch
- neutral style for not anchored and pending
- success style for verified

## 10. Accessibility

Proof states must not rely on color only. Include text labels such as:

```text
Verified
Mismatch
Pending
Failed
Not anchored
```

Hashes and transaction IDs should wrap rather than overflow.

## 11. Validation checklist

A proof UI task is complete when evidence confirms:

- proof panel renders all supported states
- verify button calls the backend proof client or documented stub
- no fake Fabric transaction IDs are shown
- no private business payload is rendered
- frontend build passes
- product copy avoids PBI/task/sprint labels
