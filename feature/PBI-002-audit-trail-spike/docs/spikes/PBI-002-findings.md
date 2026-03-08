# PBI-002 Findings
## Define hybrid anchoring approach for immutable audit trail

- **PBI-ID:** PBI-002
- **Type:** Spike
- **ReqID:** R05
- **Status:** Draft findings
- **Timebox:** 5 days
- **Owner:** Blockchain Developer

## 1. Objective

Select the lightest-weight audit-trail anchoring approach that provides credible tamper-evidence and can be implemented within the MVP constraints.

## 2. Constraints

- MVP delivery within 12 weeks
- low setup and ops cost
- centralized-first or hybrid architecture
- no full consortium rollout for MVP
- evidence must be reviewable by auditors / regulators

## 3. Options evaluated

1. Hyperledger Fabric private data collections (PDC) + on-ledger hashes
2. Public-chain Merkle-root anchoring
3. RFC 3161 trusted timestamping
4. WORM evidence bundle retention (e.g., S3 Object Lock)
5. Amazon QLDB (reviewed, then excluded)

## 4. Key findings

### 4.1 Fabric private data collections
Good technical fit for hybrid architecture:
- sensitive payload stays private to authorized orgs
- hash of the private payload is written to the ledger
- supports later multi-party attestation

But:
- requires Fabric setup and ops
- still expensive for MVP relative to simpler evidence methods

### 4.2 Public chain anchoring
Technically strong for external verification if using stable public infrastructure.

But:
- public **testnets** are not reliable long-term evidence anchors
- network deprecations create audit risk
- fee management and key management add overhead

### 4.3 RFC 3161 timestamping
Strong candidate for MVP:
- standards-based proof-of-existence
- low infrastructure burden
- suitable for daily or periodic anchoring of manifest root hash

### 4.4 WORM evidence storage
Useful companion control:
- prevents overwrite / deletion of evidence bundles
- strong for retention and audit-readiness

But:
- does not itself prove that pre-write logs were truthful
- should be paired with hashing and external timestamping

### 4.5 QLDB
Not recommended.
Reason:
- product discontinuation / end-of-support risk makes it unsuitable for new MVP adoption

## 5. Recommended MVP pattern (provisional)

Adopt a **centralized evidence pipeline**:
1. Canonicalize event JSON
2. Compute `SHA-256(event)`
3. Append hash to daily manifest
4. Compute daily Merkle root
5. Obtain RFC 3161 timestamp for the root
6. Store evidence bundle in WORM object storage
7. Keep Fabric anchoring as optional phase-2 enhancement

## 6. Why this is the preferred option

- lowest operational overhead
- no blockchain node hosting required for MVP
- auditable and reproducible
- aligns with centralized-first architecture constraint
- can be extended later with Fabric or public-chain anchoring if governance requires it

## 7. Comparison matrix

| Option | Setup cost | Ops complexity | External verifiability | Privacy fit | MVP suitability | Notes |
|---|---|---:|---:|---:|---:|---|
| Fabric PDC | High | High | Medium | High | Medium | Good future-state option, heavy for MVP |
| Public chain anchor | Medium | Medium | High | Medium | Low/Medium | Avoid testnet as long-term anchor |
| RFC 3161 TSA | Low | Low | Medium | High | High | Best lightweight anchor |
| WORM storage only | Low | Low | Low | High | Medium | Useful only with hashing/timestamping |
| QLDB | N/A | N/A | N/A | N/A | No | Excluded due to discontinuation risk |

## 8. Minimal PoC shape

The PoC should prove:
1. deterministic canonical hashing
2. creation of daily evidence manifest
3. Merkle-root generation
4. verification that a source event matches the stored hash

Optional later step:
- send Merkle root to TSA or later Fabric/public-chain anchor

## 9. Exit criteria mapping

- [x] evaluation of 3+ options
- [x] provisional recommendation
- [x] draft ADR
- [x] minimal PoC code
- [x] final Tech Lead / PO review

## 10. Recommended follow-up PBIs
- create canonical event hashing service
- add daily evidence manifest job
- integrate RFC 3161 timestamp provider
- store evidence bundles in immutable object storage
- add verification API for auditors

## 11. Source list
- Hyperledger Fabric private data:
  https://hyperledger-fabric.readthedocs.io/en/latest/private-data/private-data.html
- Hyperledger Fabric private data architecture:
  https://hyperledger-fabric.readthedocs.io/en/release-2.4/private-data-arch.html
- NIST blockchain terminology:
  https://nvlpubs.nist.gov/nistpubs/ir/2018/NIST.IR.8202.pdf
- Ethereum network docs:
  https://ethereum.org/developers/docs/networks/
- Goerli LTS update:
  https://blog.ethereum.org/2023/11/30/goerli-lts-update
- Holešky shutdown announcement:
  https://blog.ethereum.org/2025/09/01/holesky-shutdown-announcement
- RFC 3161:
  https://www.ietf.org/rfc/rfc3161.txt
- AWS S3 Object Lock:
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS S3 Object Lock overview:
  https://aws.amazon.com/s3/features/object-lock/
- InfoQ QLDB discontinuation coverage:
  https://www.infoq.com/news/2024/07/aws-kill-qldb/
  