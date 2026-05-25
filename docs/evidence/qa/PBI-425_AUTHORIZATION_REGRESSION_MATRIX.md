# PBI-425 Authorization Regression Matrix

Date: 2026-05-25  
Status: Release baseline

## Scope

This matrix records the authorization checks exercised across the actor-ready MVP waves and the expected release behavior for supervisor review.

## Wave 2 Executed Checks

| Actor | Attempt | Expected | Evidence |
|---|---|---|---|
| Administrator | List member organizations with bearer session | Allowed | `src/modules/membership/api/routes.test.ts` |
| Administrator | Inspect member organization detail with bearer session | Allowed | `src/modules/membership/api/routes.test.ts` |
| Administrator | Update member organization status with bearer session | Allowed and audited | `src/modules/membership/api/routes.test.ts` |
| Administrator | Create role with canonical `administrator` role | Allowed | `src/modules/access-control/api/routes.roles.post.test.ts` |
| Administrator | Create role with backend bearer session | Allowed | `src/modules/access-control/api/routes.roles.post.test.ts` |
| Administrator | Query access history | Allowed read-only | `src/modules/shared/api/access-history.administrator-access.test.ts` |
| Buyer | List member organizations | Denied with `FORBIDDEN` | `src/modules/membership/api/routes.test.ts` |
| Buyer | Update member organization status | Denied with `FORBIDDEN` | `src/modules/membership/api/routes.test.ts` |
| Anonymous user | List member organizations | Denied with `UNAUTHORIZED` | `src/modules/membership/api/routes.test.ts` |
| Administrator | Update organization to invalid status | Denied with `VALIDATION_ERROR` | `src/modules/membership/api/routes.test.ts` |

## Wave 3 Executed Checks

| Actor | Attempt | Expected | Evidence |
|---|---|---|---|
| Buyer | Create order with eligible organization | Allowed and lifecycle event recorded | `src/modules/procurement/api/procurement-order.routes.test.ts` |
| Buyer | Create order with unknown eligibility | Denied with `FORBIDDEN` | `src/modules/procurement/api/procurement-order.routes.test.ts` |
| Supplier | List assigned orders | Allowed for assigned supplier organization | `src/modules/procurement/api/procurement-order.routes.test.ts` |
| Supplier | Accept assigned order | Allowed and lifecycle event recorded | `src/modules/procurement/api/procurement-order.routes.test.ts` |
| Supplier | Acknowledge unrelated order | Denied with `FORBIDDEN` | `src/modules/procurement/api/procurement-order.routes.test.ts` |
| Anonymous user | List orders | Denied with `UNAUTHORIZED` | `src/modules/procurement/api/procurement-order.routes.test.ts` |
| Compliance Reviewer | Record decision for authorized case | Allowed by KYC/AML route tests | `src/modules/kyc-aml-onboarding/api/routes.test.ts` |
| Unauthorized reviewer | Record compliance decision | Denied with `FORBIDDEN` and case not mutated | `src/modules/kyc-aml-onboarding/api/routes.test.ts` |
| Unauthorized user | Retrieve eligibility/status history | Denied with `FORBIDDEN` | `src/modules/kyc-aml-onboarding/api/eligibility.routes.test.ts`; `src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts` |

## Wave 4 Executed Checks

| Actor | Attempt | Expected | Evidence |
|---|---|---|---|
| Regulator | Create combined audit export bundle | Allowed with manifest and integrity metadata | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Auditor | Create and retrieve export bundle | Allowed with read-only bundle detail | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Buyer | Create export bundle | Denied with `FORBIDDEN` | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Regulator | Submit invalid export scope | Denied with `VALIDATION_ERROR` | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Regulator | Verify bundle with matching hash | Returns `verified` | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Regulator | Verify bundle with changed hash | Returns `mismatch` | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Regulator | Verify missing bundle | Returns `notFound` | `src/modules/reporting/api/export-bundle.routes.test.ts` |
| Security Operator | Inspect access alerts and proof failures | Allowed read-only in demo UI | Browser smoke in `docs/evidence/qa/PBI-413_SECURITY_OPERATOR_VALIDATION.md` |
| Security Operator | Admin/compliance/finance mutation controls | Hidden from security navigation | Browser smoke in `docs/evidence/qa/PBI-413_SECURITY_OPERATOR_VALIDATION.md` |

## Wave 5 Executed Checks

| Actor | Attempt | Expected | Evidence |
|---|---|---|---|
| Buyer | Create escrow from accepted persisted order | Allowed and lifecycle event/proof metadata recorded | `src/modules/escrow/application/create-escrow.test.ts`; `src/modules/escrow/api/escrow.routes.test.ts` |
| Buyer | Create escrow from order that is not accepted | Denied with `CONFLICT` | `src/modules/escrow/application/create-escrow.test.ts`; `src/modules/escrow/api/escrow.routes.test.ts` |
| Buyer | Create escrow for a different buyer organization than the signed-in session | Denied with `FORBIDDEN` | `src/modules/escrow/application/create-escrow.test.ts` |
| Buyer | Create escrow with buyer or supplier organization not eligible | Denied with `FORBIDDEN` | `src/modules/escrow/application/create-escrow.test.ts`; `src/modules/escrow/api/escrow.routes.test.ts` |
| Auditor / Security Operator | Read escrow record | Allowed read-only when authenticated | `src/modules/escrow/api/escrow.routes.test.ts` |
| Non-buyer | Create escrow | Denied with `FORBIDDEN` | `src/modules/escrow/api/escrow.routes.test.ts` |
| Anonymous user | Create escrow | Denied with `UNAUTHORIZED` | `src/modules/escrow/api/escrow.routes.test.ts` |

## Wave 6 Executed Checks

| Actor | Attempt | Expected | Evidence |
|---|---|---|---|
| Financier | Activate PLS contract with approved Shariah reference | Allowed | `src/modules/financing/application/pls-contract-service.test.ts`; `src/modules/financing/api/pls.routes.test.ts` |
| Financier | Activate PLS contract without approved Shariah reference | Denied with `CONFLICT` | `src/modules/financing/application/pls-contract-service.test.ts`; `src/modules/financing/api/pls.routes.test.ts` |
| Financier | Activate PLS contract when a party is not eligible | Denied with `FORBIDDEN` / `notEligible` result | `src/modules/financing/application/pls-contract-service.test.ts` |
| Shariah Reviewer | Inspect PLS contracts | Allowed read-only | `src/modules/financing/api/pls.routes.test.ts` |
| Shariah Reviewer | Activate PLS contract | Denied with `FORBIDDEN` | `src/modules/financing/api/pls.routes.test.ts` |
| Financier | Record distribution scenario for active contract | Allowed | `src/modules/financing/application/pls-contract-service.test.ts`; `src/modules/financing/api/pls.routes.test.ts` |
| Financier | Record distribution before activation | Denied with `CONFLICT` | `src/modules/financing/application/pls-contract-service.test.ts`; `src/modules/financing/api/pls.routes.test.ts` |

## Release Matrix

| Actor | Must Not Access | Current Status |
|---|---|---|
| Administrator | Regulator-only export approval unless explicitly allowed | Export routes limited to regulator/auditor in Wave 4 |
| Buyer | Admin member and role management | Wave 2 covered for member governance |
| Supplier | Unrelated buyer orders | Wave 3 backend ownership check covered |
| Compliance Reviewer | Unrestricted admin and RBAC mutation | Dashboard hides admin actions; backend RBAC denial remains covered by Wave 2 non-admin checks |
| Shariah Reviewer | KYC/AML, admin, or financing activation functions | Wave 6 route tests deny activation; dashboard exposes Shariah Review only |
| Financier | Shariah approval mutation unless explicitly allowed | Wave 6 UI separates financier activation from Shariah decision controls |
| Auditor | Mutation actions except verified read-only review | Wave 4 export bundle flow is read-only after generation |
| Regulator | Internal admin management | Wave 4 dashboard hides admin surfaces; export route denial for non-export roles covered |
| Security Operator | Admin, compliance, and finance mutation | Wave 4 security dashboard is read-only and navigation-limited |
| Anonymous user | Protected pages and APIs | Wave 1 dashboard, Wave 2 member governance, and Wave 5 escrow create covered |

## Commands

```powershell
node --loader ts-node/esm --test src/modules/membership/api/routes.test.ts src/modules/access-control/api/routes.roles.post.test.ts src/modules/shared/api/access-history.administrator-access.test.ts
node --loader ts-node/esm --test src/modules/procurement/api/procurement-order.routes.test.ts
node --loader ts-node/esm --test src/modules/kyc-aml-onboarding/api/routes.test.ts src/modules/kyc-aml-onboarding/api/eligibility.routes.test.ts src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts
node --loader ts-node/esm --test src/modules/reporting/api/export-bundle.routes.test.ts
node --loader ts-node/esm --test src/modules/escrow/application/create-escrow.test.ts src/modules/escrow/api/escrow.routes.test.ts
node --loader ts-node/esm --test src/modules/financing/application/pls-contract-service.test.ts src/modules/financing/api/pls.routes.test.ts
```

Result:

```text
Wave 2 focused set: pass, 33 tests
Wave 3 procurement focused set: pass, 5 tests
Wave 3 KYC/AML focused set: pass, 59 tests
Wave 4 export focused set: pass, 5 tests
Wave 5 escrow focused set: pass, 18 tests
Wave 6 PLS focused set: pass, 10 tests
Full npm test: pass, 668 tests
```

## Release Closure

- Backend persistent security alert read model remains post-MVP; current security operator scope is read-only demo metadata.
- Complete matrix is included in Wave 7 release validation.
- UI hiding is treated as product ergonomics only; backend tests remain the authoritative authorization evidence.
