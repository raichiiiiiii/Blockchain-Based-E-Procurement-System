# PostgreSQL Persistence Decision

Status: Sprint 6 reference
Owner: Backend Engineer / Architecture
Related PBIs: PBI-296, PBI-297, PBI-298, PBI-299, PBI-300, PBI-301, PBI-302, PBI-303, PBI-304, PBI-305, PBI-306, PBI-307, PBI-308
Related requirements: R02, R03, R05, R06, R15, R22
Related docs:

- `docs/architecture/ARCHITECTURE.md`
- `docs/contracts/AUTH_SESSION_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`

## 1. Purpose

This document defines the Sprint 6 persistence direction.

The current application has many in-memory repositories that are useful for unit tests and early feature slices. Sprint 6 introduces PostgreSQL for demo-stable workflows so that login/session, audit, procurement, and blockchain proof metadata can survive backend restart.

## 2. Decision

Use PostgreSQL as the MVP operational database.

PostgreSQL stores application state. Hyperledger Fabric stores selective proof and smart-contract state only. Fabric is not the primary application database.

## 3. Design rules

1. Domain models must not import database libraries.
2. Application services depend on repository interfaces or gateway ports.
3. PostgreSQL adapters live in infrastructure folders.
4. In-memory adapters remain for fast tests.
5. Migrations must be explicit and repeatable.
6. Demo seed data must be documented.
7. Sensitive business data must not be copied to Fabric raw.

## 4. Initial database scope

Sprint 6 target schemas:

```text
auth users
sessions
member organizations
platform users
roles
role assignments
KYC/AML onboarding cases where adapter work is pulled in
access audit events
procure-to-pay lifecycle events
procurement orders
delivery evidence metadata
blockchain anchor metadata
escrow first-slice tables if PBI-006 starts
```

## 5. Migration strategy

Use a simple migrations folder and a migration runner script.

Recommended folder:

```text
migrations/
  001_auth_membership.sql
  002_audit_procurement.sql
  003_blockchain_anchors.sql
  004_escrow_first_slice.sql
  005_procurement_orders_delivery_evidence.sql
```

Recommended script names:

```text
scripts/db/migrate.ts
scripts/db/seed-demo-data.ts
```

If package dependencies are added, document the reason in the implementation evidence.

## 6. Configuration

Required environment variables:

```text
DATABASE_URL
DATABASE_SSL_MODE
DB_MIGRATIONS_ENABLED
DEMO_SEED_ENABLED
```

Local development may use `.env.local`, but `.env.local` must remain ignored and must not be committed.

`.env.example` should document safe placeholder values.

## 7. Repository adapter pattern

Preferred pattern:

```text
src/modules/<module>/domain
src/modules/<module>/application
src/modules/<module>/infrastructure/in-memory-*.ts
src/modules/<module>/infrastructure/postgres-*.ts
```

Application service example:

```ts
export interface AuthSessionRepository {
  save(session: AuthSession): Promise<AuthSession>;
  findByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  revoke(sessionId: string, revokedAt: string): Promise<AuthSession | null>;
}
```

Infrastructure adapter example:

```ts
export class PostgresAuthSessionRepository implements AuthSessionRepository {
  // database implementation hidden behind repository interface
}
```

## 8. Blockchain anchor metadata table

Minimum semantic fields:

```text
event_id
payload_hash
case_id_hash
anchor_status
blockchain_network
channel_name
chaincode_name
transaction_id
block_number
anchored_at
failure_reason
created_at
updated_at
```

Rules:

- event id should be unique
- payload hash should be indexed
- anchor status should be explicit
- failed anchor attempts should preserve safe failure reason
- anchor metadata should not contain raw private business data

## 9. Demo seed accounts

Demo seed should support the frontend product journey:

| Username | Role | Purpose |
|---|---|---|
| `admin.demo` | administrator | Member, role, assignment demo. |
| `auditor.demo` | auditor | Audit trail and blockchain proof verification. |
| `compliance.demo` | complianceReviewer | KYC/AML review. |
| `shariah.demo` | shariahReviewer | Shariah workflow. |
| `buyer.demo` | buyer | Order and escrow first slice. |
| `supplier.demo` | supplier | Supplier status placeholder. |
| `financier.demo` | financier | Financing/PLS placeholder. |
| `security.demo` | securityOperator | Security investigation placeholder. |

Credentials must be demo-only and documented in `docs/runbooks/local-demo.md`, not treated as production security guidance.

## 10. Testing expectations

Persistence tasks should include:

- migration applies cleanly
- seed script is idempotent or safely repeatable
- repository adapter unit/integration tests where feasible
- existing in-memory tests remain valid
- build passes
- full regression passes after adapter integration

## 11. Runtime coverage after commercial-readiness persistence pass

The local `PERSISTENCE_ADAPTER=postgres` runtime composition currently wires PostgreSQL adapters for:

| Area | Runtime Postgres coverage | Notes |
|---|---|---|
| Auth/session | Covered | Demo credentials and sessions persist after migration/seed. |
| Membership/RBAC | Covered | Member organizations, platform users, roles, memberships, and assignments persist. |
| Access audit | Covered | Shared access audit events persist and feed access-history/security-alert reads. |
| Procurement lifecycle events | Covered | Procure-to-pay lifecycle events persist. |
| Procurement orders | Covered | Buyer-created and supplier-acknowledged order records persist. |
| Delivery evidence | Covered | Metadata-only delivery evidence, evidence hash, lifecycle reference, and proof status persist. |
| Blockchain anchor metadata | Covered | Proof metadata and failed/pending/anchored status persist. |
| Escrow | Covered | Escrow first-slice records and proof metadata persist. |
| KYC/AML cases | In-memory | Compliance review UI remains local/demo-level until a Postgres onboarding case adapter is added. |
| Export bundles | In-memory | Export bundle generation is persisted only in memory unless a reporting adapter is added. |
| Shariah reviews | In-memory | Shariah review records remain in memory in runtime composition. |
| PLS contracts/distributions | In-memory | Restricted seedbed records remain in memory in runtime composition. |

Delivery evidence persistence remains metadata-only. Raw delivery documents, IoT feeds, QR signatures, and external logistics payloads are outside MVP scope and must not be stored on-chain.

## 12. Non-goals

Sprint 6 PostgreSQL work does not need to implement:

- production HA database setup
- managed cloud database provisioning
- advanced migration rollback framework
- encrypted field-level storage
- database sharding
- full reporting warehouse

These can be future hardening tasks.

## 13. ADR trigger

Create or update an ADR if implementation proposes:

- replacing repository seams with direct DB access from domain code
- using Fabric as primary data store
- storing private data in blockchain anchor metadata
- introducing a large ORM that changes module boundaries significantly
- requiring production database infrastructure before MVP demo
