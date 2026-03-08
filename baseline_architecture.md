# Baseline Architecture Design for Digital Procurement + PLS MVP

This document describes the baseline architecture for the MVP of the Digital Procurement and PLS Seedbed platform, as refined by the approved Architecture Decision Records (ADR‑2026‑001 and ADR‑2026‑002). It serves as the technical foundation for all implementation PBIs.

---

## 1. Architectural Philosophy

The MVP follows a **centralized‑first** approach with a **hybrid evidence pipeline** that provides cryptographic immutability without requiring a full permissioned blockchain in the initial release. This satisfies the project constraints (12‑week timeline, low cost, minimal operational complexity) while preserving a clear path toward later blockchain integration (e.g., Hyperledger Fabric).

Key principles:

- **Core business logic and data** reside in a conventional relational database.
- **Audit trail immutability** is achieved through a deterministic evidence pipeline that hashes events, builds daily Merkle trees, and anchors the root via RFC 3161 timestamping, storing bundles in Write‑Once‑Read‑Many (WORM) storage.
- **Shariah‑compliant PLS** is implemented as a simplified restricted *mudarabah* model with explicit profit‑share formulas and manual governance workflows.
- **Identity and roles** use conventional JWT authentication, with DID/VC capabilities deferred to later phases.

---

## 2. Technology Stack Summary

| Layer                  | Technology Choices                                                                 |
|------------------------|------------------------------------------------------------------------------------|
| **Frontend**           | React 19 + TypeScript (role‑based dashboards for SME, Buyer, Bank)                |
| **Backend API**        | Node.js + Express/NestJS (TypeScript) – RESTful, with optional GraphQL later      |
| **Primary Database**   | PostgreSQL 14+ (with Prisma ORM for type‑safe access and migrations)              |
| **Caching / Sessions** | Redis (session store, rate limiting)                                               |
| **File Storage**       | AWS S3 (or compatible) – for KYC documents, invoice attachments, evidence bundles |
| **Identity & Auth**    | JWT (with role claims) + OAuth2 (optional); manual KYC approval in MVP            |
| **Evidence Pipeline**  | Custom Node.js services: canonicalization, hashing (SHA‑256), manifest assembly, Merkle root computation, RFC 3161 timestamp client, WORM storage (S3 Object Lock or equivalent) |
| **Timestamp Authority**| External RFC 3161 compliant service (can be a test/stub in MVP)                   |
| **Deployment**         | Containerized (Docker) on cloud VM or Kubernetes (simplified for MVP)             |

---

## 3. Component Architecture (from ADR‑2026‑002)

The system is logically divided into the following components, as illustrated in `centralized-evidence-pipeline-mvp.puml`:

```plaintext
┌─────────────────┐     ┌──────────────────────────────────────┐     ┌─────────────────┐
│                 │     │          Evidence Service              │     │                 │
│ Procure‑to‑Pay  │────▶│  ┌────────────┐  ┌────────────┐      │────▶│  RFC 3161 TSA   │
│   Application   │     │  │Canonicalizer│  │   Hasher   │      │     │   (External)    │
│                 │     │  └────────────┘  └────────────┘      │     └─────────────────┘
└─────────────────┘     │         │               │             │              │
                        │         ▼               ▼             │              │
                        │  ┌─────────────────────────────┐     │              │
                        │  │    Daily Manifest Builder   │     │              │
                        │  └───────────────┬─────────────┘     │              │
                        │                  │                   │              │
                        │                  ▼                   │              │
                        │  ┌─────────────────────────────┐     │              │
                        │  │    Merkle Root Component    │─────│──────────────┘
                        │  └───────────────┬─────────────┘     │
                        │                  │                   │
                        │                  ▼                   │
                        │  ┌─────────────────────────────┐     │     ┌─────────────────┐
                        │  │  Evidence Bundle Assembler  │─────│────▶│  WORM Storage   │
                        │  └─────────────────────────────┘     │     │   (Immutable)   │
                        └──────────────────────────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────────────────────────┐
│    Auditor      │────▶│      Verification Component         │
│                 │     │  (API / CLI / Library)              │
└─────────────────┘     └──────────────────────────────────────┘
```

### Component Responsibilities

- **Procure‑to‑Pay Application** – Generates audit events for every state change (PO creation, delivery, invoice approval, PLS distribution).  
- **Canonicalization Component** – Transforms each event into a deterministic JSON representation (field order, whitespace, etc.) so that hashing is reproducible.  
- **Hashing Component** – Computes SHA‑256 hash of the canonical JSON.  
- **Daily Manifest Builder** – Collects all event hashes for a calendar day into a manifest (list). At day’s end, it triggers finalization.  
- **Merkle Root Component** – Builds a Merkle tree from the manifest hashes and computes the root hash.  
- **RFC 3161 Timestamp Authority** – External service that returns a signed timestamp token for the Merkle root.  
- **Evidence Bundle Assembler** – Packages the manifest, Merkle root, timestamp token, and metadata into a single bundle and stores it in WORM storage.  
- **WORM Storage** – Immutable object store (e.g., S3 with Object Lock) that prevents deletion or modification.  
- **Verification Component** – Provides an API or CLI for auditors to verify the integrity of any event by recomputing its hash, checking inclusion in the manifest, and validating the timestamped root.

---

## 4. Data Flow Walkthroughs

### 4.1 Procure‑to‑Pay Event Generation

1. A user (SME, Buyer) performs an action that changes state (e.g., creates a PO).  
2. The backend records the change in PostgreSQL and simultaneously emits an **audit event** to the Evidence Service.  
3. The event contains: `eventType`, `entityId`, `timestamp`, `userId`, `changedFields`, and a unique `eventId`.  
4. The Evidence Service processes the event asynchronously (queue or direct call).

### 4.2 Evidence Pipeline (Daily Bundle Creation)

As shown in `evidence-generator-flow.puml` and `bundle-creation-and-retention.puml`:

1. **Canonicalize** the event to a strict JSON representation (sorted keys, no extra spaces).  
2. **Hash** the canonical JSON with SHA‑256, yielding a 32‑byte hash.  
3. **Append** the hash to the current day’s manifest (held in memory or a temporary store).  
4. At the end of the day (or when a threshold is reached), **finalize** the manifest:  
   - Build a Merkle tree from all hashes in the manifest.  
   - Compute the Merkle root.  
   - Send the Merkle root to an RFC 3161 Timestamp Authority; receive a timestamp token.  
   - Assemble the **evidence bundle** (manifest, Merkle tree proofs, timestamp token, bundle metadata).  
   - Store the bundle in WORM storage (e.g., S3 bucket with Object Lock enabled).  
5. After storage, the manifest can be purged from temporary storage.

### 4.3 Audit Verification (from `auditor-verification.puml`)

1. An auditor requests verification for a specific event (by `eventId` or `bundleId`).  
2. The Verification Component:  
   - Retrieves the corresponding evidence bundle from WORM storage.  
   - Re‑canonicalizes the original event data (if available) or uses a stored copy.  
   - Recomputes the SHA‑256 hash.  
   - Checks that the hash exists in the manifest and that the Merkle path leads to the timestamped root.  
   - Validates the timestamp token with the TSA.  
3. Returns a pass/fail result with details.

---

## 5. PLS Implementation (per ADR‑2026‑001)

The MVP implements a **restricted single‑venture mudarabah** model with the following characteristics:

- One *rabb al‑mal* (capital provider) and one *mudarib* (entrepreneur) per contract.  
- Contract tied to a single procurement reference.  
- Profit sharing based on a pre‑agreed ratio (PSR), with total = 100%.  
- Losses borne solely by the *rabb al‑mal* unless negligence/misconduct by the *mudarib* is proven.  
- No guarantee of principal or profit.  

**Data model** (minimum fields, stored in PostgreSQL):

| Field                          | Description                                          |
|--------------------------------|------------------------------------------------------|
| `contract_id`                  | Unique identifier                                   |
| `procurement_reference_id`     | Links to the related PO/invoice                     |
| `rabb_al_mal_party_id`         | Capital provider (bank)                             |
| `mudarib_party_id`             | Entrepreneur (SME)                                  |
| `capital_amount`               | Amount of capital provided                           |
| `currency`                      |                                                      |
| `profit_sharing_ratio_rabb_al_mal`    | e.g., 0.60                                          |
| `profit_sharing_ratio_mudarib` | e.g., 0.40                                          |
| `approved_profit_definition`    | Reference to policy defining “realized profit”      |
| `deductible_cost_policy_version`|                                                      |
| `loss_allocation_rule`          | “negligence” flag logic                              |
| `shariah_pronouncement_reference`     | Link to approval document                           |
| ... (other fields from ADR)     |                                                      |

**Profit calculation** (Node.js service):

```
distributable_profit = realized_profit - approved_deductible_costs
rabb_al_mal_profit = distributable_profit * profit_sharing_ratio_rabb_al_mal
mudarib_profit = distributable_profit * profit_sharing_ratio_mudarib
```

- If `distributable_profit <= 0`, no profit is distributed; loss rules apply.

**Governance workflow**:  
- A Shariah Board member manually reviews and approves each contract template before activation.  
- Approval is recorded in the database (field `shariah_pronouncement_reference`).  
- Later phases may automate parts of this workflow.

---

## 6. Deployment View (from `centralized-mvp-deployment.puml`)

The MVP is deployed in a **single environment** (e.g., AWS cloud) with the following nodes:

- **Application Node**: Hosts the Procure‑to‑Pay application (backend + frontend).  
- **Evidence Service Node**: Hosts the evidence pipeline components (can be same node for MVP).  
- **Database Node**: PostgreSQL (managed service like RDS).  
- **Redis Node**: ElastiCache or similar.  
- **WORM Storage**: S3 bucket with Object Lock enabled.  
- **Timestamp Authority**: External service (could be a test TSA mock for development).  

All components are containerised and orchestrated via Docker Compose (MVP) or a lightweight Kubernetes setup.

---

## 7. Future Extensibility

The architecture explicitly accommodates later enhancements:

- **Full permissioned blockchain** (Hyperledger Fabric) can be added by replacing or augmenting the evidence pipeline with on‑chain anchoring of Merkle roots. The existing bundle format and verification interface remain unchanged, ensuring a smooth transition.  
- **DID/VC identity** can be integrated alongside JWT without disrupting core flows.  
- **Musharakah and more complex PLS variants** can be added by extending the PLS data model and calculation service, versioning the contract templates.

---

## 8. Compliance with Project Constraints

| Constraint (SRS Section 4)          | How Architecture Addresses It                              |
|--------------------------------------|------------------------------------------------------------|
| 12‑week MVP                          | Uses familiar, productive stack; simple evidence pipeline. |
| Low cost                             | No expensive blockchain nodes; uses commodity services.    |
| Minimal operational complexity       | Centralised services; no distributed consensus to manage.  |
| Centralised‑first                    | Core logic in PostgreSQL; blockchain anchoring deferred.   |
| Hybrid if blockchain needed          | Evidence pipeline can later anchor to Fabric without replacement. |
| Limited integration                   | Mock KYC, simple file‑based exports for audit.             |

---

## 9. References

- ADR‑2026‑001: Restricted single‑venture mudarabah as MVP PLS baseline  
- ADR‑2026‑002: Centralized evidence pipeline with deterministic hashing, daily manifest, TSA timestamping, and WORM retention  
- UML diagrams:  
  - `auditor-verification.puml`  
  - `bundle-creation-and-retention.puml`  
  - `centralized-evidence-pipeline-mvp.puml`  
  - `centralized-mvp-deployment.puml`  
  - `evidence-generator-flow.puml`

This architecture provides a solid, compliant, and extensible foundation for the MVP, directly derived from the validated spikes and approved ADRs.