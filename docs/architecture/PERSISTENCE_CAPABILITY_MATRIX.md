# Persistence Capability Matrix

Status: MVP baseline
Owner: Architecture + Backend + QA
Last updated: 2026-05-30

## Purpose

This matrix classifies which modules have PostgreSQL runtime persistence, which remain in-memory or local-adapter only, and which areas need follow-up before stronger deployment claims.

PostgreSQL is the operational source of truth for MVP business state. Hyperledger Fabric is proof infrastructure only.

## Runtime Persistence Summary

| Capability | Module / path | Runtime mode | Current persistence | MVP classification | Notes |
|---|---|---|---|---|---|
| Credentials and sessions | `src/modules/auth/` | PostgreSQL wired in `src/app/server.ts` | PostgreSQL + in-memory tests | MVP-critical persistent | Demo accounts seeded by `scripts/db/seed-demo-data.ts`. |
| Member organizations | `src/modules/membership/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Organization status gates downstream actions. |
| Roles and role assignments | `src/modules/access-control/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Backend authorization remains authoritative. |
| Access audit events | `src/modules/shared/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Feeds access history and security alert views. |
| Procure-to-pay lifecycle events | `src/modules/procurement/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Case lifecycle and proof basis. |
| Procurement orders | `src/modules/procurement/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Buyer/supplier procurement flow. |
| Delivery evidence metadata | `src/modules/procurement/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Metadata and hashes only; no raw document payloads on-chain. |
| Blockchain anchor metadata | `src/modules/blockchain/` | PostgreSQL wired | PostgreSQL + in-memory gateway | MVP-critical persistent | Anchor failures preserve business event. |
| Escrow records | `src/modules/escrow/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Includes release/dispute state foundation. |
| KYC/AML onboarding cases | `src/modules/kyc-aml-onboarding/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Migration `007_kyc_aml_onboarding_cases.sql`; seed includes eligible buyer, supplier, and financier demo cases. |
| Shariah reviews | `src/modules/shariah-review/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Migration `008_shariah_reviews.sql`; seed includes approved restricted PLS review metadata. |
| Shariah certificate artifacts | `src/modules/shariah-certification/` | Routes registered in runtime | In-memory repository in runtime composition | Pilot-hardening gap | Tracks artifact metadata, not external certification. |
| PLS contracts and distributions | `src/modules/financing/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP-critical persistent | Migration `009_pls_contracts_distributions.sql`; seed includes restricted PLS demo contract metadata. Keep seedbed/simulation language. |
| Export bundles and signing metadata | `src/modules/reporting/` | PostgreSQL wired | PostgreSQL repository + local software-key adapter | MVP/pilot persistent | Migration `010_export_bundles.sql`; local signing is not production key management. |
| Operational incidents | `src/modules/ops/` | PostgreSQL wired | PostgreSQL + in-memory tests | MVP/pilot persistent | Migration `011_operational_incidents.sql`; readiness incidents now survive backend restart in PostgreSQL mode. |
| Security alert read model | `src/modules/security/` | Derived read model | Derived from access/proof/ops repositories | MVP-critical read model | Persistence depends on source repositories. |
| Documents | `src/modules/documents/` | Routes registered in runtime | Local filesystem storage + in-memory metadata repository | Pilot-hardening gap | `.local-documents/` is ignored; not production object storage. |
| Machine-readable contracts | `src/modules/contracts/` | Routes registered in runtime | In-memory repository | Pilot-hardening gap | Terms hash exists; durability requires adapter. |
| External API gateway | `src/modules/integration/` | Routes registered in runtime | In-memory client/idempotency/audit repositories | Production-extension foundation | Requires durable secrets/idempotency before real external use. |
| ERP/accounting adapter jobs | `src/modules/integration/` | Routes registered in runtime | Local JSON adapter + in-memory job state | Production-extension foundation | Not production ERP connectivity. |
| Payment instructions | `src/modules/payments/` | Routes registered in runtime | In-memory repository + sandbox/manual adapters | Production-extension foundation | Not real payment execution. |

## Required Follow-Up Before Pilot Claim

No required follow-up item remains in this section after operational incident persistence was added.

Recommended later persistence hardening:

- documents metadata repository
- machine-readable contracts repository
- external API clients, idempotency keys, and external request audit
- payment instructions
- ERP/accounting jobs

## Runtime Source-Of-Truth Rules

- Domain and application layers must not import database clients.
- PostgreSQL adapters belong in infrastructure folders.
- In-memory repositories remain for tests and explicitly documented local/demo paths.
- Fabric must not become the application database.
- Local document storage is off-chain and non-production.

## Validation References

- `docs/evidence/qa/POSTGRES_RUNTIME_PERSISTENCE_VALIDATION.md`
- `docs/evidence/qa/PRODUCTION_EXTENSION_RELEASE_VALIDATION.md`
- `docs/runbooks/postgres-local-dev.md`
- `docs/runbooks/deployable-mvp.md`
