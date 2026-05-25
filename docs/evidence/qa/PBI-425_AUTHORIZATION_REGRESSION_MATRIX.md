# PBI-425 Authorization Regression Matrix

Date: 2026-05-25  
Status: Active baseline

## Scope

This matrix records the authorization checks exercised during Wave 2 and the expected release behavior for later actor waves.

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

## Release Matrix

| Actor | Must Not Access | Current Status |
|---|---|---|
| Administrator | Regulator-only export approval unless explicitly allowed | Pending Wave 4 |
| Buyer | Admin member and role management | Wave 2 covered for member governance |
| Supplier | Unrelated buyer orders | Pending Wave 3 |
| Compliance Reviewer | Unrestricted admin and RBAC mutation | Pending Wave 3 |
| Shariah Reviewer | KYC/AML or admin functions | Pending Wave 6 |
| Financier | Shariah approval mutation unless explicitly allowed | Pending Wave 6 |
| Auditor | Mutation actions except verified read-only review | Partially covered by Sprint 6 proof baseline |
| Regulator | Internal admin management | Pending Wave 4 |
| Security Operator | Admin, compliance, and finance mutation | Pending Wave 4 optional workflow |
| Anonymous user | Protected pages and APIs | Wave 1 dashboard and Wave 2 member governance covered |

## Commands

```powershell
node --loader ts-node/esm --test src/modules/membership/api/routes.test.ts src/modules/access-control/api/routes.roles.post.test.ts src/modules/shared/api/access-history.administrator-access.test.ts
```

Result:

```text
pass, 33 tests
```

## Remaining Regression Work

- Add procurement order ownership negative cases in Wave 3.
- Add compliance eligibility mutation negative cases in Wave 3.
- Add regulator export negative cases in Wave 4.
- Add PLS/Shariah activation negative cases in Wave 6.
- Run the complete matrix during Wave 7 release validation.
