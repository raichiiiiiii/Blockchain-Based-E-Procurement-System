# Persistence Capability Matrix

Status: MVP baseline
Owner: Architecture + Backend + QA
Last updated: 2026-05-30

## Purpose

This matrix classifies which modules have PostgreSQL runtime persistence, which remain in-memory or local-adapter only, and which areas need follow-up before stronger deployment claims.

PostgreSQL is the operational source of truth for MVP business state. Hyperledger Fabric is proof infrastructure only.

## Runtime Persistence Summary

Classification terms used in this matrix:

- PostgreSQL runtime-backed
- In-memory test/demo only
- Local adapter only
- External integration placeholder
- Unknown / needs inspection

| Capability | Module / path | Runtime mode | Current persistence | Persistence classification | Notes |
|---|---|---|---|---|---|
| Auth/session | `src/modules/auth/` | PostgreSQL wired in `src/app/server.ts` | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Demo accounts seeded by `scripts/db/seed-demo-data.ts`. |
| Membership | `src/modules/membership/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Organization status gates downstream actions. |
| Organization network | `src/modules/organization-network/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `018_organization_network_email_outbox.sql`; stores safe organization profile fields, network requests, relationships, graph proof metadata, local email outbox records, company dashboard summaries, organization users, private deal projections, and restricted Mudarabah workflow projections. |
| Company productivity | `src/modules/productivity/` | Backend read model | Derived from organization network/company ledger repositories + in-memory task/view state | Derived read model; process-local task/view persistence | Exposes money tracker, pipeline, action inbox, supplier scorecard, evidence checklist, saved views, local notification center, and lightweight ledger export manifest. Follow-up PostgreSQL persistence is optional if durable saved views become required. |
| Access-control | `src/modules/access-control/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Backend authorization remains authoritative. |
| Access audit | `src/modules/shared/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Feeds access history and security alert views. |
| KYC/AML onboarding | `src/modules/kyc-aml-onboarding/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `007_kyc_aml_onboarding_cases.sql`; seed includes eligible buyer, supplier, and financier demo cases. |
| Procurement orders | `src/modules/procurement/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Buyer/supplier procurement flow. |
| Delivery evidence | `src/modules/procurement/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Metadata and hashes only; no raw document payloads on-chain. |
| Transaction history | `src/modules/procurement/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Procure-to-pay lifecycle and proof basis. |
| Escrow | `src/modules/escrow/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Includes release/dispute state foundation. |
| Blockchain anchor metadata | `src/modules/blockchain/` | PostgreSQL wired | PostgreSQL metadata + in-memory/Fabric gateway modes | PostgreSQL runtime-backed | Anchor failures preserve business event. Fabric remains proof infrastructure only. |
| Documents | `src/modules/documents/` | PostgreSQL metadata wired | Local filesystem storage + PostgreSQL metadata/extraction repository | PostgreSQL runtime-backed; local adapter only for file storage | Migration `013_document_metadata.sql`; `.local-documents/` remains ignored and is not production object storage. |
| Contracts | `src/modules/contracts/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `014_procurement_contracts.sql`; stores indexed metadata and machine-readable aggregate JSON, with terms hash only for proof/reference use. |
| Payments | `src/modules/payments/` | PostgreSQL wired | PostgreSQL repository + sandbox/manual adapters + in-memory tests | PostgreSQL runtime-backed; local adapter only for settlement simulation | Migration `016_payment_instructions.sql`; durable instruction records only, not real payment execution. |
| PLS/financing | `src/modules/financing/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `009_pls_contracts_distributions.sql`; seed includes restricted PLS demo contract metadata. Keep seedbed/simulation language. |
| Shariah review | `src/modules/shariah-review/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `008_shariah_reviews.sql`; seed includes approved restricted PLS review metadata. |
| Shariah certificate | `src/modules/shariah-certification/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `012_shariah_certificates.sql`; tracks artifact metadata and certificate hash only, not external certification. |
| Export bundle | `src/modules/reporting/` | PostgreSQL wired | PostgreSQL repository + local software-key adapter | PostgreSQL runtime-backed; local adapter only for signing | Migration `010_export_bundles.sql`; local signing is not production key management. |
| Security alerts | `src/modules/security/` | Derived read model | Derived from access/proof/ops repositories | PostgreSQL runtime-backed through source repositories | Persistence depends on source repositories. |
| Ops incidents | `src/modules/ops/` | PostgreSQL wired | PostgreSQL + in-memory tests | PostgreSQL runtime-backed | Migration `011_operational_incidents.sql`; readiness incidents now survive backend restart in PostgreSQL mode. |
| External API | `src/modules/integration/` | PostgreSQL wired | PostgreSQL client/idempotency/audit repositories + in-memory tests | PostgreSQL runtime-backed; external integration placeholder | Migration `015_external_api_gateway.sql`; stores hashed local shared-secret material, idempotency records, and request audit only. |
| ERP/accounting | `src/modules/integration/` | PostgreSQL wired | Local JSON adapter + PostgreSQL job repository + in-memory tests | PostgreSQL runtime-backed; external integration placeholder | Migration `017_erp_integration_jobs.sql`; local JSON mapping artifacts only, not production ERP connectivity. |

## Required Follow-Up Before Pilot Claim

No required follow-up item remains in this section after operational incident persistence was added.

Recommended later persistence hardening:

- None identified for currently implemented MVP/pilot-hardening records. Future production-extension modules should add PostgreSQL adapters as they are introduced.

## Runtime Source-Of-Truth Rules

- Domain and application layers must not import database clients.
- PostgreSQL adapters belong in infrastructure folders.
- In-memory repositories remain for tests and explicitly documented local/demo paths.
- Fabric must not become the application database.
- Local document storage is off-chain and non-production.

## Validation References

- `docs/evidence/qa/POSTGRES_RUNTIME_PERSISTENCE_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_CERTIFICATE_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_DOCUMENT_METADATA_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_CONTRACT_NEGOTIATION_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_EXTERNAL_API_GATEWAY_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_PAYMENT_INSTRUCTION_VALIDATION.md`
- `docs/evidence/qa/PERSISTENCE_GAP_ERP_ACCOUNTING_JOB_VALIDATION.md`
- `docs/evidence/qa/PRODUCTION_EXTENSION_RELEASE_VALIDATION.md`
- `docs/runbooks/postgres-local-dev.md`
- `docs/runbooks/deployable-mvp.md`
