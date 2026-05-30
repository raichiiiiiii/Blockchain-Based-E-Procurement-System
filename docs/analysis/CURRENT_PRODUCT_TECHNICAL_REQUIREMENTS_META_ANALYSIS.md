# Current Product and Technical Requirements Meta-Analysis

> Supersession note, 2026-05-31: This analysis was written before the live
> PBI-438 lab. PBI-438 was later completed for a production-like local Fabric
> lab and runtime Fabric Gateway validation. See
> `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md` and
> `docs/evidence/qa/POST_PBI438_RELEASE_RECONCILIATION.md` for current status.
> The broader claim boundary remains unchanged: not commercial-ready or
> production-certified.

Date: 2026-05-30  
Repository: `raichiiiiiii/Blockchain-Based-E-Procurement-System`  
Branch/ref analysed: `main` / requested `origin/main`  
Project: Blockchain-Based E-Procurement System / Digital Procurement & PLS Seedbed  
Status position: supervisor-demo and selected pilot-hardening foundation, not a production Fabric consortium rollout.

## 1. Executive assessment

The repository is best described as a **centralized-first digital procurement platform with selective permissioned-blockchain proof anchoring**.

The current implementation and documentation support a credible supervisor demo and an internal pilot-hardening foundation. They do not support claims of production-grade Hyperledger Fabric consortium operation, production payment execution, ERP integration, ISO 20022 bank certification, EPCIS network integration, formal Shariah certification, or bank/regulator-certified deployment.

The strongest product position is:

> A centralized procurement and PLS seedbed platform that preserves operational workflows in Fastify/PostgreSQL and selectively anchors proof-level event hashes to a local or future Fabric network for audit verification.

The product should not be positioned as:

> A full decentralized procurement consortium, production Fabric network, bank-integrated payment platform, or formally certified Islamic finance system.

## 2. Evidence base reviewed

Primary evidence used for this analysis:

- `README.md`
- `package.json`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/architecture/PRODUCTION_FABRIC_CONSORTIUM_ARCHITECTURE.md`
- `docs/contracts/API_CONTRACTS.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/report/srs-v3.tex`
- `docs/runbooks/deployable-mvp.md`
- `docs/runbooks/fabric-local-network.md`
- `docs/evidence/qa/PBI-309_FABRIC_BASELINE_VALIDATION.md`
- `docs/evidence/qa/PBI-421_FABRIC_SMOKE_VALIDATION.md`
- `docs/evidence/qa/PBI-437_438_PRODUCTION_FABRIC_CONSORTIUM_VALIDATION.md`
- `docs/evidence/qa/ACTOR_UAT_RESULTS.md`
- `src/app/server.ts`
- `src/modules/blockchain/application/blockchain-anchor-gateway.ts`
- `src/modules/blockchain/application/blockchain-anchor-metadata-repository.ts`
- `src/modules/blockchain/application/blockchain-proof-service.ts`
- `src/modules/blockchain/api/blockchain-anchor.routes.ts`
- `src/modules/blockchain/infrastructure/fabric-blockchain-anchor-gateway.ts`
- `src/modules/blockchain/infrastructure/in-memory-blockchain-anchor-gateway.ts`

## 3. Product capability summary

The current product includes the following capability families.

| Capability area | Current observed implementation | Maturity assessment |
| --- | --- | --- |
| Authentication and demo access | Credential-based demo login with seeded users. | Demo/pilot foundation. |
| Role-based user model | Admin, buyer, supplier, compliance, Shariah reviewer, financier, auditor, regulator, security operator, and related demo flows. | Useful for demo and UAT. Needs hardened identity source before pilot. |
| Membership and RBAC | Member organization lifecycle, role catalog, role assignment, deactivation-aware checks. | One of the stronger backend areas. Identity and actor source remain unresolved risks. |
| KYC/AML onboarding | Onboarding case flow and eligibility checks used by procurement and financing gates. | Pilot scaffold. Not real provider or regulatory integration. |
| Procure-to-pay | Procurement order, delivery evidence, lifecycle history, escrow readiness. | Good supervisor-demo foundation. Needs persistence and integration hardening for pilot. |
| Audit and access history | Access audit events, history routes, event detail, sequence views, export linkage. | Valuable, but not full cryptographic non-repudiation. |
| Blockchain anchoring | AuditAnchorContract, metadata repository, proof routes, in-memory gateway, Fabric gateway adapter, local Fabric scripts. | Proof-capable. Not Fabric-operational by default in runtime. |
| PLS financing | Restricted PLS seedbed contract, Shariah review/certificate references, distribution simulation. | Simulation only. Requires formal Shariah/legal review before real use. |
| Payments | Local sandbox and manual settlement adapters. | Not real payment execution. |
| ERP/accounting | Local JSON adapter. | Demonstration stub, not production ERP integration. |
| Documents/contracts | Document storage/extraction/signature metadata adapters, contract routes. | MVP utility layer. Needs production storage, signatures, retention, and redaction policy. |
| Operations | Health/readiness endpoints, Docker Compose stack, smoke scripts, incident/readiness hooks. | Internal pilot foundation. Not production operations. |

## 4. Architectural interpretation

### 4.1 Accepted architecture

The accepted architecture should be treated as:

```text
React frontend
-> Fastify backend
-> PostgreSQL operational state
-> Fabric gateway adapter
-> Hyperledger Fabric local test network
-> AuditAnchorContract chaincode
```

This means Fabric is not the operational system of record. PostgreSQL and backend services own business state. Fabric is used only for selective proof anchoring and later verification.

### 4.2 Data placement boundary

The Fabric MVP boundary is directionally correct. On-chain data should remain restricted to proof metadata, such as:

- `eventId`
- `caseIdHash`
- `eventType`
- `payloadHash`
- `schemaVersion`
- `canonicalization`
- `occurredAt`
- `anchoredAt`
- `anchorStatus`
- `previousAnchorHash` or `previousEventHash` where needed

Off-chain data should include:

- full KYC/AML documents
- full invoice payloads
- full escrow terms
- payment details
- organization names
- actor names and emails
- Shariah review rationale text
- negotiation data
- uploaded evidence files
- PII and sensitive operational data

This boundary should remain strict for pilot and production phases.

### 4.3 Failure model

The documented failure model is sound:

```text
Business event persisted
-> anchor attempted
-> if success: anchorStatus = anchored
-> if Fabric unavailable: anchorStatus = pending or failed
-> event remains queryable
-> retry can be added later
```

This is the correct hybrid-system behavior. A failed anchor is not equivalent to a failed business event.

### 4.4 Current runtime gap

A real Fabric gateway adapter exists in `src/modules/blockchain/infrastructure/fabric-blockchain-anchor-gateway.ts`, but the default runtime path still appears to use `InMemoryBlockchainAnchorGateway` unless dependencies are explicitly injected in tests or custom bootstrapping.

In `src/app/server.ts`, the server defaults to an in-memory blockchain anchor gateway. The PostgreSQL runtime branch wires PostgreSQL repositories for several modules, including blockchain anchor metadata, but does not appear to wire the Fabric gateway as the runtime blockchain adapter.

Therefore, the current state is:

> The codebase is Fabric-proof capable, but not Fabric-operational by default.

## 5. Effectiveness assessment

### 5.1 Supervisor demo effectiveness

Effectiveness is high for supervisor demonstration. The repository provides:

- local startup paths
- containerized startup path
- seeded demo users
- credential-based login
- frontend and backend surfaces
- role-based flows
- proof panel expectations
- smoke commands
- chaincode build/test scripts
- actor UAT evidence

The product can demonstrate the intended narrative: procurement workflow, governance, auditability, and blockchain proof anchoring boundaries.

### 5.2 Pilot-hardening effectiveness

Effectiveness is medium. The architecture and modules provide a useful base, but the repository still contains demo scaffolds, partial persistence, local adapters, and incomplete production-equivalent evidence.

Pilot readiness requires stronger evidence for:

- persistent runtime state across all pilot-critical modules
- live local Fabric anchoring and verification
- stable actor identity and authorization enforcement
- canonical hash generation and verification vectors
- operator-visible anchor failure and retry handling
- clearer compliance and Shariah boundaries

### 5.3 Production effectiveness

Production effectiveness is low in the current state. This is expected and acceptable if the repository remains positioned as a demo/pilot-hardening foundation.

Production adoption would require a separate readiness programme covering:

- production identity provider
- MFA and privileged access management
- production Fabric consortium governance
- CA/MSP lifecycle
- endorsement policies
- private data collections
- real peer/orderer endpoints
- bank/payment integration
- ERP/accounting integration
- formal Shariah/legal approval
- key management and signing infrastructure
- privacy impact assessment
- operational monitoring, backup, incident response, and disaster recovery

## 6. Conflicts, gaps, stale assumptions, and drift

### 6.1 Sprint 1 architecture vs current Fabric MVP boundary

`docs/architecture/ARCHITECTURE.md` is still labeled as a Sprint 1 baseline and states that optional blockchain anchoring or hybrid patterns are out of Sprint 1 scope unless later pulled in.

`docs/architecture/FABRIC_MVP_BOUNDARY.md` later pulls Fabric proof anchoring into scope as the Sprint 6 blockchain baseline.

This is not a fatal contradiction, but it is documentation drift. The architecture folder should clearly distinguish:

- historical Sprint 1 baseline
- current accepted MVP/pilot-hardening baseline
- future production consortium architecture

### 6.2 SRS ambition vs actual MVP scope

`docs/report/srs-v3.tex` still contains broad requirements for DID/VC identity, EPCIS-compatible event capture, tokenized receivables, ISO 20022 payment messaging, private data collections, endorsement policies, smart-contract escrow, tokenization, and consortium governance.

The current runbooks and QA evidence explicitly disclaim many of these as production capabilities.

The SRS should be reframed as one of the following:

- `roadmap requirements`, if it remains broad and aspirational; or
- `current MVP requirements`, if reduced to the implemented/pilot-hardening scope.

Currently it mixes both.

### 6.3 Canonicalization mismatch

`docs/contracts/TRANSACTION_HISTORY_CONTRACT.md` uses `json-stable-v1` for immutable references.

`docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md` uses `json-canonical-v1` for anchor input.

This can create hash mismatch risk. Before pilot, the project should define one canonicalization profile or a documented mapping between transaction-history hashing and blockchain-anchor hashing.

Required corrective artifact:

```text
docs/contracts/CANONICAL_PAYLOAD_HASHING.md
```

This artifact should include:

- canonicalization name
- included fields
- excluded fields
- field ordering
- timestamp normalization
- Unicode normalization
- number/string handling
- sample payloads
- expected SHA-256 hashes
- verification examples

### 6.4 Runtime Fabric wiring gap

The runtime server uses an in-memory gateway by default. The Fabric adapter exists but is not clearly wired through environment-based runtime configuration.

Required improvement:

```text
BLOCKCHAIN_ANCHOR_ADAPTER=disabled|in-memory|fabric-local|fabric
```

Readiness output should report:

- configured blockchain adapter
- gateway availability
- channel name
- chaincode name
- proof mode: simulated or live
- last anchor attempt result

### 6.5 Actor-source and identity risk

`API_CONTRACTS.md` still flags the identity provider and user provisioning model as not frozen. It also notes that temporary client-supplied actor scaffolding may exist in local/transitional implementations.

This is a high-risk area because audit, authorization, and proof access depend on trusted actor attribution.

Before pilot, protected flows should derive actor identity only from authenticated server-side context. Temporary actor headers should be removed or restricted to explicit local-demo mode.

### 6.6 API contract and route error consistency

The standard error envelope is documented in `API_CONTRACTS.md`, but some route-level errors still use minimal ad hoc shapes.

The blockchain proof route should align with the shared error helper pattern and include request IDs where the standard envelope requires them.

### 6.7 Production Fabric consortium remains staged only

The production Fabric consortium artifacts are useful design scaffolds, but the repository does not yet contain live CA/MSP material, real peer/orderer endpoints, production channel artifacts, lifecycle commit evidence, or cross-organization live smoke evidence.

This is correctly recorded as not production-ready and should remain a release-blocking limitation for any production consortium claim.

## 7. Lifetime risk analysis

| Risk | Severity | Description | Mitigation |
| --- | --- | --- | --- |
| Trust-model overclaim | High | Blockchain proof can be misunderstood as proving business truth, Shariah validity, KYC validity, or payment settlement. It only proves hash anchoring. | Add explicit proof semantics to UI, docs, export bundles, and demo script. |
| Actor identity spoofing | High | If transitional actor headers remain authoritative anywhere, audit and authorization evidence can be compromised. | Remove client-authored actor authority; use authenticated session/JWT-derived actor context. |
| Fabric runtime gap | High | Current runtime can look blockchain-enabled while using in-memory proof behavior. | Add explicit adapter mode and readiness disclosure. |
| Hash/canonicalization mismatch | High | Different canonicalization names can produce unverifiable anchors. | Publish canonical hash contract and test vectors. |
| Shariah/legal overclaim | High | PLS simulation can be mistaken for certified Islamic finance functionality. | Keep `simulation-only` labeling until formal approval and legal review exist. |
| Privacy leakage through hashes | Medium-high | Predictable identifiers hashed without salt/key can leak business relationships. | Use HMAC or keyed pseudonymization for sensitive identifiers before anchoring. |
| Incomplete non-repudiation | Medium-high | MVP excludes real signatures, certificates, external timestamping, and production key management. | Add production signing/key-management plan before pilot expansion. |
| Persistence inconsistency | Medium | Some modules still default to in-memory repositories. | Classify module persistence status and migrate pilot-critical modules to PostgreSQL. |
| Integration overclaim | Medium | ERP, payment, ISO 20022, EPCIS, QR/IoT are not production integrations. | Keep adapters explicitly labeled local/demo until certified. |
| Operational fragility | Medium | Compose and health checks exist, but production operations are absent. | Add backup/restore drills, SLOs, monitoring, incident response, and load tests. |

## 8. Recommended improvements before pilot

### P0: Claim control and requirements consolidation

Create a single current requirements baseline:

```text
docs/requirements/CURRENT_PRODUCT_BASELINE.md
```

This should classify each major requirement as:

- implemented
- demo scaffold
- pilot candidate
- roadmap
- out of scope

It should explicitly cover:

- DID/VC identity
- KYC/AML
- membership/RBAC
- procurement order
- delivery evidence
- transaction history
- blockchain proof anchoring
- escrow
- PLS simulation
- payments
- ERP/accounting
- export bundles
- Shariah certification
- production Fabric consortium

### P0: Canonical hash contract

Create:

```text
docs/contracts/CANONICAL_PAYLOAD_HASHING.md
```

Resolve `json-stable-v1` vs `json-canonical-v1` and add implementation tests.

### P0: Runtime blockchain adapter configuration

Add explicit runtime configuration:

```text
BLOCKCHAIN_ANCHOR_ADAPTER=disabled|in-memory|fabric-local|fabric
FABRIC_CHANNEL_NAME=...
FABRIC_CHAINCODE_NAME=...
FABRIC_CONNECTION_PROFILE=...
FABRIC_WALLET_PATH=...
```

The readiness endpoint should disclose whether proof verification is simulated or live.

### P0: Durable anchor outbox and retry

Add persistent anchor queue/outbox behavior:

```text
business event committed
-> anchor job created
-> anchor attempt recorded
-> success updates metadata
-> failure records safe reason
-> retry policy applies
```

Do not silently lose failed anchor attempts.

### P1: Remove transitional actor trust

Protected routes should rely only on authenticated actor context. Any local-demo actor scaffolding should be explicitly feature-gated and disabled in pilot mode.

### P1: API envelope consistency

Ensure all routes, including blockchain proof routes, use shared error helpers and standardized error envelopes.

### P1: Persistence capability matrix

Create:

```text
docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md
```

Classify each repository/module as:

- PostgreSQL runtime-backed
- in-memory demo only
- local adapter only
- external integration placeholder

### P1: Live Fabric local smoke evidence

Run live Fabric smoke once prerequisites exist:

```powershell
.\scripts\fabric\smoke-audit-anchor.ps1
```

Record evidence for:

- deploy chaincode
- submit anchor
- verify matching hash
- verify mismatch
- verify notFound
- restart/reconnect behavior
- metadata persistence behavior

### P2: Pilot-specific threat model

Create:

```text
docs/security/PILOT_THREAT_MODEL.md
```

Minimum scenarios:

- actor spoofing
- anchor poisoning
- proof replay
- hash mismatch caused by canonicalization drift
- unauthorized proof access
- off-chain DB tampering
- export bundle tampering
- PII leakage through anchor metadata
- failed anchor retry abuse

### P2: Shariah and legal boundary note

Create or update a Shariah/legal scope note stating:

- PLS is simulation-only
- no real investment account or payment execution exists
- no guaranteed profit or principal should be implied
- loss-allocation logic is not formal legal advice
- formal Shariah board/legal review is required before real pilot adoption

## 9. Recommended improvements before production

Production adoption requires a separate programme beyond the current MVP.

Minimum production gates:

1. Production identity provider, MFA, lifecycle management, and privileged-access controls.
2. Production Fabric consortium lab with separate MSPs, CA lifecycle, peers, orderers, channel artifacts, endorsement policies, and private data collections.
3. Cross-organization chaincode lifecycle approval and commit evidence.
4. Real Fabric gateway runtime path and production readiness checks.
5. Formal cryptographic key management for export signing, hash HMAC keys, signing keys, rotation, and revocation.
6. External integration certification for ERP/accounting and bank/payment flows.
7. Formal Shariah and legal approval of PLS templates, distribution logic, loss allocation, negligence handling, and dispute process.
8. Data protection impact assessment, retention/legal-hold policy, redaction policy, and jurisdictional privacy controls.
9. Operational readiness with SLOs, monitoring, alerting, backup/restore drills, disaster recovery, incident response, and load tests.
10. Security testing including dependency audit, route authorization review, penetration test, and threat-model validation.

## 10. Capability claim matrix

| Claim | Current supported wording | Unsafe wording |
| --- | --- | --- |
| Architecture | Centralized-first procurement platform with selective Fabric proof anchoring. | Fully decentralized blockchain procurement system. |
| Blockchain | Local/test Fabric proof anchoring baseline with AuditAnchorContract and verification semantics. | Production Fabric consortium. |
| Procurement | Demo/pilot procure-to-pay lifecycle tracking with order, delivery, escrow, and history flows. | Production-grade enterprise procurement suite. |
| PLS | Restricted PLS seedbed simulation with Shariah workflow references. | Certified Islamic financing platform. |
| Payments | Local sandbox/manual payment adapters. | Real bank payment execution. |
| ERP | Local JSON accounting adapter / integration placeholder. | Certified ERP integration. |
| Audit | MVP audit history, event hashes, proof metadata, and export bundle metadata. | Full legal non-repudiation with production signatures and external timestamping. |
| Compliance | Compliance workflow scaffolding and documentation. | Regulatory-approved compliance system. |
| Operations | Local compose/deployable demo stack with health/readiness checks. | Production HA/SLA platform. |

## 11. Bottom line

The current product is technically coherent if it is framed as a **Digital Procurement and PLS Seedbed** rather than a production blockchain consortium.

The strongest near-term direction is not to add more high-scope features. The priority should be:

1. consolidate current requirements;
2. classify capability maturity;
3. wire blockchain adapter modes explicitly;
4. fix canonicalization drift;
5. remove transitional actor trust;
6. add durable anchor retry/outbox behavior;
7. record live Fabric smoke evidence;
8. keep PLS and production claims tightly bounded.

This will make the repository safer for supervisor review, clearer for pilot stakeholders, and less vulnerable to overclaiming during future production-readiness discussions.
