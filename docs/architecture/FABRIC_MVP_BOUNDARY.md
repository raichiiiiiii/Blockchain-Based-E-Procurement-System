# Fabric MVP Boundary

Status: Sprint 6 reference
Owner: Blockchain Engineer / Backend Engineer / Architecture
Related PBIs: PBI-309, PBI-323, PBI-333, PBI-006
Related requirements: R05, R06, R07, R08, R09, R10, R16, R18, R21, R22, R30
Related docs:

- `docs/report/srs-v3.tex`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/architecture/ARCHITECTURE.md`

## 1. Purpose

This document defines the MVP boundary for Hyperledger Fabric usage.

The project must be demonstrably blockchain-based, but the MVP must not attempt a full production consortium rollout. The MVP blockchain layer is used for selective proof anchoring, smart-contract state evidence, and verification. Operational workflows and sensitive business data remain off-chain.

## 2. Architecture position

The Sprint 6 blockchain baseline is hybrid:

```text
React frontend
-> Fastify backend
-> PostgreSQL operational state
-> Fabric gateway adapter
-> Hyperledger Fabric local test network
-> AuditAnchorContract chaincode
```

Fabric does not replace the application database. It provides tamper-evident proof for selected event hashes and selected smart-contract state transitions.

## 3. In scope for MVP Fabric baseline

In scope:

- local Fabric test network for demonstration
- one channel for MVP proof anchoring
- one AuditAnchorContract chaincode package
- anchor event hash and metadata
- verify event hash against on-chain proof
- return Fabric transaction reference to backend
- expose proof status in frontend
- document setup and demo runbook

## 4. Out of scope for Sprint 6 baseline

Out of scope:

- production-grade multi-organization Fabric deployment
- independent organization node hosting
- complex channel governance
- production certificate authority lifecycle
- private data collections in first slice
- full endorsement-policy automation
- public-chain interoperability
- on-chain storage of full business payloads
- on-chain KYC/AML documents
- on-chain personal data
- on-chain commercial terms in raw form
- on-chain payment credentials or bank details

These may be revisited after the proof anchoring and escrow first slice are stable.

## 5. Data placement rule

### Put on-chain

Only proof-level data may be written to chaincode:

```text
eventId
caseIdHash
eventType
payloadHash
schemaVersion
canonicalization
occurredAt
anchoredAt
anchorStatus
previousAnchorHash or previousEventHash where needed
```

### Keep off-chain

The following remain in PostgreSQL or other off-chain stores:

```text
full KYC/AML documents
full invoice payloads
full escrow terms
full payment details
full organization names
full actor names and emails
Shariah review rationale text
commercial negotiation data
uploaded evidence files
PII and sensitive operational data
```

### Hash before anchoring

Any business identifier that may reveal sensitive or commercially meaningful information should be hashed before going on-chain.

Examples:

```text
caseId -> caseIdHash
orderId -> orderIdHash
organizationId -> organizationHash
terms document -> termsHash
delivery proof -> proofHash
```

## 6. Canonicalization rule

Before a backend event is anchored, the backend must compute a canonical payload hash using a stable canonicalization rule.

Minimum metadata:

```json
{
  "canonicalization": "json-canonical-v1",
  "payloadHash": "sha256:<hex>",
  "schemaVersion": "1.0"
}
```

The chaincode verifies equality of supplied hashes. It does not recompute full business payload hashes because full business payloads are not sent to Fabric.

## 7. Smart-contract sequence

Sprint 6 smart-contract priority:

```text
1. AuditAnchorContract
2. EscrowContract boundary document
3. EscrowContract first implementation only after AuditAnchor baseline is stable
```

Future smart contracts:

```text
PLSContract
ReceivableTokenContract
GovernancePolicyContract
DeliveryProofContract
```

These future contracts should not be started until their business state models are stable.

## 8. AuditAnchorContract responsibility

AuditAnchorContract records that an off-chain event existed with a specific hash at the time of anchoring.

It should enforce:

- eventId uniqueness
- required payloadHash
- append-only anchor record
- no update of existing anchor
- deterministic verify result
- explicit notFound result

It does not decide business authorization. Authorization remains in the backend.

## 9. EscrowContract boundary

EscrowContract may later store selected escrow state transitions, but raw escrow terms remain off-chain.

On-chain escrow data should be limited to:

```text
escrowId
orderIdHash
buyerOrgHash
supplierOrgHash
financierOrgHash where applicable
termsHash
status
lastEventHash
createdAt
updatedAt
```

The first escrow blockchain slice should anchor `escrowCreated`. Later slices may add funded, releaseReady, released, disputed, and cancelled.

## 10. Failure handling

Blockchain anchoring failure must not silently corrupt the base business event.

Recommended backend behavior:

```text
Business event persisted
-> anchor attempted
-> if success: anchorStatus = anchored
-> if Fabric unavailable: anchorStatus = pending or failed
-> event remains queryable
-> retry can be added later
```

A failed anchor is not the same as a failed business event. The UI must show this distinction.

## 11. Demo expectation

The supervisor demo should show:

```text
1. User logs in.
2. User opens dashboard.
3. User opens an audit/procurement event.
4. Event shows blockchain anchor status.
5. Fabric transaction ID or proof reference is visible.
6. Auditor clicks verify.
7. UI shows verified or mismatch result.
```

## 12. ADR trigger

Create or update an ADR if any task proposes:

- storing raw sensitive data on-chain
- using Fabric as the primary application database
- adding private data collections
- changing endorsement assumptions
- introducing multiple independent Fabric organizations
- changing the on-chain/off-chain boundary for escrow or PLS
