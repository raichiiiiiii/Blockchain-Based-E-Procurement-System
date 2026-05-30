# Canonical Payload Hashing

Status: MVP baseline
Owner: Backend + Architecture + Blockchain
Last updated: 2026-05-30

## Purpose

This document defines the repository-wide hashing expectations for audit evidence, procure-to-pay lifecycle events, documents, contracts, blockchain anchors, export manifests, and proof UI.

The goal is stable integrity evidence without putting raw sensitive business payloads on-chain.

## Hash Format

Preferred public hash format:

```text
sha256:<64 lowercase hex characters>
```

Some legacy internal event builders store the raw 64-character lowercase hex digest while also carrying `canonicalization: json-stable-v1`. New external/API-facing proof metadata should prefer the `sha256:` prefix unless the existing contract explicitly states otherwise.

## Canonicalization Profiles

### json-stable-v1

Current profile for access audit events and procure-to-pay lifecycle events.

Rules:

- Objects are serialized with keys sorted lexicographically.
- Arrays preserve order.
- Strings, numbers, booleans, and null use JSON serialization semantics.
- Undefined values are omitted when the local builder already omits them.
- The hash input excludes fields that would make the evidence non-repeatable, such as generated `eventId`, `payloadHash`, and `previousEventHash` where existing builders already exclude them.

Current implementations:

- `src/modules/shared/application/access-audit-event-builder.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.ts`

### json-canonical-v1

Blockchain anchor contract profile for the proof payload submitted to Fabric gateway or chaincode.

Rules:

- The backend computes the payload hash before anchoring.
- Fabric stores and compares hashes; it does not receive raw private business payloads.
- Chaincode verifies equality of submitted and anchored hash values.

Current consumers:

- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `src/modules/blockchain/`
- `chaincode/audit-anchor/`

### document-bytes-v1

Profile for uploaded documents and local storage adapters.

Rules:

- Hash raw document bytes with SHA-256.
- Store raw document off-chain.
- Return metadata and hash in normal API responses, not raw content.

Current consumers:

- `src/modules/documents/infrastructure/local-document-storage-adapter.ts`
- `src/modules/documents/infrastructure/in-memory-document-storage-adapter.ts`

### contract-terms-v1

Profile for machine-readable contract terms.

Rules:

- Sort object keys recursively.
- Preserve array order.
- Hash the canonical JSON string with SHA-256.
- Return `sha256:<hex>`.

Current consumer:

- `src/modules/contracts/application/contract-hashing.ts`

## Sensitive Data Boundary

Never write the following raw data to Fabric or blockchain metadata:

- KYC/AML documents
- full invoice payloads
- full escrow terms
- full payment details
- organization names
- actor names or email addresses
- Shariah review rationale
- commercial negotiation data
- uploaded evidence files
- PII
- secrets, bearer tokens, credentials, or private keys

Allowed proof-level data:

- `eventId`
- `caseIdHash`
- `eventType`
- `payloadHash`
- `schemaVersion`
- `canonicalization`
- `occurredAt`
- `anchoredAt`
- `anchorStatus`
- `previousEventHash`

## Verification Semantics

Proof verification answers this question:

```text
Does the submitted off-chain payload hash match the hash previously anchored for this event id?
```

It does not prove:

- real-world delivery truth
- KYC truth
- payment execution
- Shariah validity
- legal signature validity
- ERP/accounting certification

## Required Tests For New Hash Producers

Every new hash producer should test:

- stable hash for equivalent object key order
- changed hash for changed business payload
- array order is preserved
- no raw sensitive field is included in blockchain payload
- output format matches the expected profile

## Migration Note

Do not rename existing canonicalization strings casually. If a future profile is needed, introduce a new explicit version such as `json-stable-v2` and document compatibility rules.
