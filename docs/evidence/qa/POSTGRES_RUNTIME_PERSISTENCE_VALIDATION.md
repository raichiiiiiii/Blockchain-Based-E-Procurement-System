# PostgreSQL Runtime Persistence Validation

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This validation closes the runtime persistence gap for current commercial MVP procurement records by adding PostgreSQL-backed procurement order and delivery evidence repositories. It does not change the product claim beyond supervisor-demo readiness.

## Files Changed

- `migrations/005_procurement_orders_delivery_evidence.sql`
- `src/modules/procurement/infrastructure/postgres-procurement-order-repository.ts`
- `src/modules/procurement/infrastructure/postgres-delivery-evidence-repository.ts`
- `src/modules/procurement/infrastructure/postgres-procurement-runtime-repositories.test.ts`
- `src/app/server.ts`
- `scripts/db/seed-demo-data.ts`
- `docs/architecture/POSTGRES_PERSISTENCE_DECISION.md`
- `docs/runbooks/postgres-local-dev.md`
- `docs/runbooks/local-demo.md`

## Runtime Coverage

| Record area | PostgreSQL runtime status | Notes |
| --- | --- | --- |
| Auth/session | Covered | Existing PostgreSQL adapters remain wired in PostgreSQL mode. |
| Membership/RBAC | Covered | Existing PostgreSQL adapters remain wired in PostgreSQL mode. |
| Access audit | Covered | Existing access audit repository remains wired in PostgreSQL mode. |
| Procurement lifecycle events | Covered | Existing lifecycle event repository remains wired in PostgreSQL mode. |
| Procurement orders | Covered | Added `procurement_orders` migration and repository. |
| Delivery evidence | Covered | Added `delivery_evidence` migration and repository; only safe metadata and proof hashes are persisted. |
| Escrow | Covered | Existing escrow PostgreSQL adapter remains wired in PostgreSQL mode. |
| Blockchain anchor metadata | Covered | Existing anchor metadata repository remains wired in PostgreSQL mode. |
| Export bundles | In-memory for current demo | Documented limitation. |
| KYC/AML cases | In-memory for current demo | Documented limitation; eligibility endpoints remain governed by existing runtime composition. |
| Shariah reviews | In-memory for current demo | Documented limitation. |
| PLS contracts/distributions | In-memory for current demo | Documented limitation. |

## Validation Results

| Command | Result |
| --- | --- |
| `npm run build` | Passed. |
| `npm run db:migrate -- --dry-run` | Passed; validated 5 migration files including `005_procurement_orders_delivery_evidence.sql`. |
| `npm run db:seed -- --dry-run` | Passed; dry-run includes demo procurement order, delivery evidence, lifecycle events, anchor metadata, and escrow records. |
| `docker compose config` | Passed. |
| `npm test` | Passed; 687 tests, 0 failures. |
| `git diff --check` | Passed; line-ending warnings only. |

## Security And Privacy Notes

- Delivery evidence persistence stores safe metadata, proof hash, lifecycle reference, and proof status only.
- Raw delivery documents, IoT payloads, QR signing material, logistics feeds, and commercial documents are not persisted by this slice.
- Raw delivery evidence is not written on-chain.
- Blockchain proof availability remains explicit through existing proof status fields; unavailable proof is not displayed as verified.

## Known Limitations

- A live PostgreSQL container migration/seed run was not required for this checkpoint; dry-run and Compose validation passed.
- KYC/AML cases, export bundles, Shariah reviews, and PLS contracts/distributions remain in-memory for the current supervisor demo unless future persistence work closes them.
- This is not production HA persistence, backup hardening, ERP integration, payment settlement, or production Fabric consortium readiness.

## Recommended Next Step

Proceed to Fabric live smoke validation so the blockchain proof demo path has a repeatable prerequisite check and smoke-test runbook.
