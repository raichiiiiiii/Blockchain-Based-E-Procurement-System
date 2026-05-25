# PBI-424 Actor UAT Scripts

Date: 2026-05-25  
Status: Active baseline

## Purpose

This file records executable actor UAT scripts for the deployment-ready MVP. Wave 2 completes the administrator script and keeps the remaining actor scripts visible for later waves.

## Administrator

Preconditions:

- Demo account `admin.demo` exists.
- Password is `demo-password`.
- Frontend opens on the landing page.
- Backend bearer session is used when the backend is available; local demo mode may use safe preview data.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Administrator.
4. Confirm Dashboard loads with administrator navigation only.
5. Open Members.
6. Select a member organization.
7. Change organization status to Active, Suspended, Inactive, or Pending review.
8. Confirm the selected organization status changes visibly.
9. Open Roles.
10. Review available roles.
11. Submit assign, change, or revoke role action.
12. Confirm the role action returns a saved state or approved error envelope.
13. Open Access History.
14. Confirm event metadata is visible without private payloads.
15. Sign out.
16. Reopen `/dashboard` and confirm sign-in is required.
```

Expected result:

```text
Administrator can complete member governance review, status action, role action, access history inspection, and logout. Non-administrator roles do not see Members or Roles navigation.
```

Evidence:

```text
docs/evidence/qa/PBI-364_ADMIN_RBAC_WORKFLOW_VALIDATION.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## Buyer / Procurement Officer

Status: Pending Wave 3 procurement completion.

## SME / Supplier

Status: Pending Wave 3 procurement completion.

## Compliance Reviewer

Status: Pending Wave 3 compliance completion.

## Shariah Reviewer

Status: Pending Wave 6 PLS and Shariah completion.

## Bank / Financier

Status: Pending Wave 6 PLS and Shariah completion.

## Auditor

Status: Sprint 6 proof baseline exists; full audit/export closure continues in Wave 4.

## Regulator / Reporting User

Status: Pending Wave 4 export workflow completion.

## Platform Operator

Status: Local demo, PostgreSQL, and Fabric runbooks exist; release hardening continues in Wave 7.

## Developer / Integrator

Status: API quickstart pending Wave 7.
