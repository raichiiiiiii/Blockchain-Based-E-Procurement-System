# Documented Summary of Audit-Trail Integrity Options

## Purpose
Summarize the audit-trail integrity options reviewed during PBI-002 and record the rationale for the MVP recommendation.

## Scope
This document is a spike output for MVP architecture and governance review. It is not a production security specification. Final implementation remains subject to approved ADRs and follow-up PBIs.

## Source basis
This summary is based on:
- `PBI-002-findings.md`
- `ADR-2026-002`
- the source pack reviewed during the spike:
  - Hyperledger Fabric private data documentation
  - RFC 3161
  - AWS S3 Object Lock documentation
  - Ethereum network documentation and deprecation notices
  - QLDB discontinuation reporting

## 1. Problem being solved
ReqID R05 requires an immutable audit trail for procure-to-pay events.

For MVP, the solution must:
- provide credible tamper-evidence
- be reviewable by auditors and regulators
- fit a centralized-first or hybrid architecture
- avoid full consortium blockchain rollout
- remain low-cost and low-ops within a 12-week delivery window

## 2. Integrity options reviewed
The following audit-trail integrity options were evaluated:

1. Hyperledger Fabric private data collections (PDC) with on-ledger hashes
2. Public-chain Merkle-root anchoring
3. RFC 3161 trusted timestamping
4. WORM evidence bundle retention
5. Amazon QLDB

## 3. Summary of each option

### 3.1 Hyperledger Fabric private data collections
**What it provides**
- private payload distribution to authorized organizations
- ledger-level hash anchoring of private data
- a credible path to later multi-party attestation

**Strengths**
- strong privacy fit
- good future-state hybrid architecture option
- supports later consortium-grade verification

**Limitations for MVP**
- requires Fabric network setup and operational support
- introduces higher infrastructure and governance overhead
- too heavy relative to simpler evidence controls for the MVP timebox

**Assessment**
- technically strong
- not preferred as MVP baseline
- suitable as a later enhancement

### 3.2 Public-chain anchoring
**What it provides**
- external verifiability through public blockchain publication
- strong independent proof if anchored on stable production infrastructure

**Strengths**
- high external verifiability
- useful for public proof of integrity

**Limitations for MVP**
- testnets are not reliable long-term anchors
- chain/network deprecations create audit continuity risk
- wallet, fee, and key-management overhead increase complexity
- privacy and operational handling require care

**Assessment**
- technically viable in some contexts
- not preferred for MVP baseline
- testnet-based anchoring should be avoided for long-term evidence claims

### 3.3 RFC 3161 trusted timestamping
**What it provides**
- standards-based proof that a hash existed at or before a given time
- external timestamp evidence without running blockchain infrastructure

**Strengths**
- low setup burden
- standards-based and auditor-friendly
- works well for periodic anchoring of a manifest root
- compatible with centralized evidence pipelines

**Limitations**
- trust model depends partly on the timestamp authority
- does not itself provide full distributed-ledger semantics

**Assessment**
- strong MVP option
- best lightweight external proof mechanism among reviewed options

### 3.4 WORM evidence bundle retention
**What it provides**
- protection against deletion or overwrite of stored evidence bundles
- strong retention and audit-readiness control

**Strengths**
- low setup burden
- strong companion control for evidence preservation
- supports retention governance well

**Limitations**
- does not prove pre-storage truthfulness by itself
- must be paired with hashing and preferably timestamping

**Assessment**
- useful supporting control
- not sufficient alone
- should be combined with event hashing and timestamp evidence

### 3.5 Amazon QLDB
**What it provides**
- ledger-style managed database capabilities

**Limitations**
- discontinuation or end-of-support risk makes it unsuitable for new MVP adoption

**Assessment**
- excluded from recommendation

## 4. Comparison summary

| Option | Setup cost | Ops complexity | External verifiability | Privacy fit | MVP suitability | Summary |
|---|---:|---:|---:|---:|---:|---|
| Fabric PDC | High | High | Medium | High | Medium | Strong future-state hybrid option, too heavy for MVP |
| Public-chain anchoring | Medium | Medium | High | Medium | Low/Medium | Useful in principle, but testnet and ops risks reduce MVP fit |
| RFC 3161 timestamping | Low | Low | Medium | High | High | Best lightweight integrity anchor for MVP |
| WORM retention only | Low | Low | Low | High | Medium | Valuable companion control, insufficient by itself |
| QLDB | N/A | N/A | N/A | N/A | No | Excluded due to discontinuation risk |

## 5. Key conclusion from the option review
No single lightweight control fully satisfies audit-trail integrity needs on its own.

The most suitable MVP pattern is therefore a combined approach:
- deterministic event hashing
- daily manifest construction
- Merkle-root generation
- RFC 3161 timestamping of the manifest root
- WORM retention of the evidence bundle

This combination provides:
- reproducible integrity verification
- timestamp-backed proof-of-existence
- immutable retention characteristics
- lower cost and lower operational complexity than full blockchain rollout

## 6. Recommended MVP integrity pattern
The spike recommends a centralized evidence pipeline with the following flow:

1. canonicalize each audit event into deterministic JSON
2. compute `SHA-256(event)`
3. append each event hash to a daily evidence manifest
4. compute a Merkle root for the daily manifest
5. obtain an RFC 3161 timestamp over the manifest root
6. store the evidence bundle in WORM-capable object storage
7. expose verification logic for auditors

## 7. Why this option is preferred
This option is preferred because it:
- has the lowest practical operational burden
- avoids MVP blockchain node hosting
- aligns with centralized-first architecture constraints
- supports reviewable and reproducible verification
- keeps a migration path open for later Fabric or public-chain anchoring if justified

## 8. MVP boundary implication
For MVP, integrity verification should focus on:
- tamper-evident audit records
- deterministic verification
- retention control
- auditor reviewability

The MVP does not need:
- full distributed consensus for all business events
- consortium-grade node governance
- blockchain-based execution of all application logic

## 9. Minimal proof-of-concept expectation
A minimal PoC should demonstrate:
- deterministic canonical hashing
- daily evidence manifest generation
- Merkle-root generation
- verification that a source event matches a stored hash

A later enhancement may add:
- TSA integration in production form
- Fabric anchoring
- public-chain anchoring, if governance later requires it

## 10. Relation to ADR-2026-002
This summary supports:
- `ADR-2026-002 — Adopt centralized evidence pipeline with deterministic hashing, daily manifest, TSA timestamping, and WORM retention`

This document makes the spike output `documented summary of audit-trail integrity options` explicit as a standalone artifact.