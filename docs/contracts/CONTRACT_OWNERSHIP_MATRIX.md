# Contract Ownership Matrix

Status: MVP baseline
Owner: Architecture + QA
Last updated: 2026-05-30

This matrix maps durable contract documents to owning modules, consumers, and validation evidence.

| Contract | Primary owner | Code owners / modules | Main consumers | Evidence / tests |
|---|---|---|---|---|
| `API_CONTRACTS.md` | Backend + Frontend + QA | `src/app/server.ts`, `src/modules/shared/` | all REST clients and route tests | `src/app/server.validation.test.ts`, module route tests |
| `AUTH_SESSION_CONTRACT.md` | Backend security | `src/modules/auth/`, `src/frontend/lib/auth-client.ts`, `src/frontend/lib/session-state.ts` | login, protected routes, dashboards | auth route tests, auth regression tests |
| `ACCESS_HISTORY_QUERY_CONTRACT.md` | Audit / Security | `src/modules/shared/`, `src/modules/security/` | auditor, administrator, security operator | access-history and security-alert tests |
| `ACCESS_AUDIT_EVENT_CONTRACT.md` | Audit / Backend | `src/modules/shared/application/access-audit-event-builder.ts` | protected actions and sensitive reads | access audit event tests |
| `ACCESS_AUDIT_EVENT_INSPECTION_CONTRACT.md` | Audit / QA | `src/modules/shared/api/access-history.routes.ts` | auditor inspection UI/API | access-history route tests |
| `ONBOARDING_ELIGIBILITY_CONTRACT.md` | Compliance | `src/modules/kyc-aml-onboarding/` | compliance dashboard, procurement gate, escrow gate | KYC/AML eligibility tests |
| `TRANSACTION_HISTORY_CONTRACT.md` | Procurement / Audit | `src/modules/procurement/` | auditor, proof viewer, export bundle | transaction history and lifecycle tests |
| `BLOCKCHAIN_ANCHOR_CONTRACT.md` | Blockchain / Backend | `src/modules/blockchain/`, `chaincode/audit-anchor/` | proof UI, auditor, regulator, security alerts | blockchain route, gateway, and chaincode tests |
| `ESCROW_WORKFLOW_CONTRACT.md` | Procurement / Escrow | `src/modules/escrow/`, `src/frontend/pages/Escrow*` | buyer, supplier, auditor, payment adapter | escrow route and service tests |
| `DOCUMENT_UPLOAD_EXTRACTION_CONTRACT.md` | Documents / Security | `src/modules/documents/`, `src/frontend/pages/DocumentWorkspacePage.tsx` | buyer, supplier, auditor, contract workflow | document route tests |
| `CONTRACT_NEGOTIATION_MODEL_CONTRACT.md` | Procurement contracts | `src/modules/contracts/`, `src/frontend/pages/ContractNegotiationPage.tsx` | buyer, supplier, financier | contract route tests |
| `PAYMENT_ADAPTER_CONTRACT.md` | Payments / Escrow | `src/modules/payments/`, `src/modules/escrow/` | escrow release-readiness, financier, auditor | payment route tests |
| `ISO20022_PAYMENT_MAPPING_CONTRACT.md` | Payments / Integrations | `src/modules/payments/application/iso20022-payment-mapper.ts` | payment export/review | ISO 20022 mapper tests |
| `EXPORT_SIGNING_KEY_MANAGEMENT_CONTRACT.md` | Reporting / Security | `src/modules/reporting/` | regulator, auditor | export bundle route tests |
| `EXTERNAL_API_GATEWAY_CONTRACT.md` | Integration / Security | `src/modules/integration/api/external-api.routes.ts` | external IoT/logistics/payment/proof clients | external API route tests |
| `IOT_QR_EPCIS_DELIVERY_PROOF_CONTRACT.md` | Delivery / Integration | `src/modules/integration/`, `src/modules/procurement/` | supplier, buyer, auditor | external delivery proof tests |
| `ERP_ACCOUNTING_ADAPTER_CONTRACT.md` | Integration / ERP | `src/modules/integration/api/erp-accounting.routes.ts` | administrator, auditor, integrator | ERP accounting route tests |
| `SHARIAH_CERTIFICATION_ARTIFACT_CONTRACT.md` | Shariah governance | `src/modules/shariah-certification/`, `src/modules/financing/` | Shariah reviewer, financier | certificate route and PLS tests |

## Ownership Rules

- Contract changes must be reviewed against the owning module and consuming frontend page/API client.
- If request or response fields change, update tests in the same task.
- If a contract changes proof, payment, PLS, or document claims, update related evidence and runbooks.
- Contracts may describe future adapter seams, but product UI must not imply unsupported production capability.

## Open Ownership Gaps

- KYC/AML persistence is still partly runtime in-memory according to current persistence evidence.
- Export bundles, Shariah reviews, PLS contracts, documents, contracts, payments, and integrations need explicit persistence classification before being called deployable beyond local demo.
