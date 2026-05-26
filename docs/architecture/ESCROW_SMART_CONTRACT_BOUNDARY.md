# Escrow Smart Contract Boundary

Status: Sprint 6 reference
Owner: Blockchain Engineer / Backend Engineer / Product Owner
Related PBIs: PBI-006, PBI-341, PBI-342, PBI-343, PBI-344, PBI-345, PBI-346, PBI-355
Related requirements: R05, R06, R22
Related docs:

- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/contracts/ESCROW_WORKFLOW_CONTRACT.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`

## 1. Purpose

This document defines the on-chain/off-chain boundary for the PBI-006 escrow workflow.

The goal is to make escrow visibly smart-contract-backed without putting full commercial terms, personal data, or payment details on-chain.

## 2. MVP escrow architecture

The MVP escrow workflow is hybrid:

```text
Backend escrow service
-> PostgreSQL escrow and audit state
-> PBI-005 lifecycle event
-> Fabric AuditAnchorContract proof
-> later EscrowContract state transition proof
-> frontend proof/status view
```

The first escrow slice may anchor `escrowCreated` through AuditAnchorContract before implementing a full EscrowContract chaincode.

## 3. On-chain data

Allowed on-chain escrow data:

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
previousStateHash where applicable
```

All values that expose business identifiers should be hashed before chaincode submission.

## 4. Off-chain data

Keep these off-chain:

```text
full order details
full escrow terms
full invoice payload
payment account details
organization names
user names and emails
commercial negotiation text
delivery documents
KYC/AML documents
Shariah rationale text
```

Off-chain data may be stored in PostgreSQL and referenced by hashes or IDs.

## 5. Escrow state model

Minimum first-slice state model:

```text
accepted
escrowCreated
releasePending
releaseReady
released
cancelled
disputed
```

Recommended transitions:

```text
accepted -> escrowCreated
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

Pilot-hardening backend transitions now add off-chain release and dispute controls:

```text
escrowCreated -> funded
funded -> releaseRequested
releaseRequested -> settlementInstructionReady
escrowCreated|funded|releaseRequested -> onHold
escrowCreated|funded|onHold|releaseRequested -> disputeOpen
disputeOpen|onHold -> settlementInstructionReady
disputeOpen|onHold -> refunded
disputeOpen|onHold -> cancelled
```

`settlementInstructionReady` is an auditable release-instruction state for the later payment adapter. It is not external payment execution, ISO 20022 execution, or bank settlement.

## 6. First slice scope

Sprint 6 first escrow slice should prioritize:

```text
1. define state model and API contract
2. create escrow from accepted order or demo request
3. emit escrowCreated lifecycle event
4. anchor escrowCreated event to Fabric through AuditAnchorContract
5. show escrowCreated status and blockchain proof in UI
```

Full payment settlement, external arbitration integration, and PLS distribution execution remain later slices.

## 7. EscrowContract future function sketch

Future chaincode may expose:

```text
createEscrow(escrowId, orderIdHash, partiesHash, termsHash, eventHash)
markFunded(escrowId, fundingProofHash, eventHash)
markReleaseReady(escrowId, deliveryProofHash, eventHash)
releaseEscrow(escrowId, releaseProofHash, eventHash)
cancelEscrow(escrowId, reasonHash, eventHash)
markDisputed(escrowId, disputeHash, eventHash)
getEscrow(escrowId)
getEscrowHistory(escrowId)
```

Do not implement all of these in the first slice unless explicitly approved.

## 8. Smart-contract enforcement rules

When EscrowContract is implemented, it should enforce:

- escrowId uniqueness
- valid status transitions only
- terminal states cannot be mutated except through approved correction path
- every transition references an eventHash
- raw private data is not accepted in chaincode arguments
- released escrow cannot be cancelled
- cancelled escrow cannot be released

## 9. Backend responsibility

Backend remains responsible for:

- authentication and actor context
- authorization
- request validation
- terms canonicalization
- payload hash generation
- PostgreSQL persistence
- audit event emission
- Fabric gateway calls
- failure handling

Chaincode should not replace backend authorization in Sprint 6.

## 10. UI responsibility

Frontend should show:

```text
Escrow status
Order reference or safe demo reference
Terms hash
Blockchain proof status
Fabric transaction reference when available
Verification result
```

Frontend must not show raw Fabric implementation details as primary navigation labels.

## 11. Failure handling

If escrow creation succeeds but blockchain anchoring fails:

```text
escrow status = escrowCreated
anchor status = failed or pending
UI shows escrow exists but proof is not yet anchored
```

Do not silently roll back a valid escrow record only because Fabric is temporarily unavailable unless the business rule explicitly requires anchor-before-commit.

## 12. ADR trigger

Create or update an ADR if implementation proposes:

- requiring Fabric success before escrow record creation
- storing full escrow terms on-chain
- implementing payment movement through chaincode
- adding real bank transfer or wallet behavior
- changing PBI-006 from hybrid MVP to full on-chain workflow
