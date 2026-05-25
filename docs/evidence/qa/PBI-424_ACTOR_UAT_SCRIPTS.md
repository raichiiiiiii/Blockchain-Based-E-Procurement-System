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

Preconditions:

- Demo account `buyer.demo` exists.
- Password is `demo-password`.
- Buyer organization eligibility is `eligible`.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Buyer.
4. Confirm Dashboard loads with buyer navigation only.
5. Open Orders.
6. Create an order assigned to the supplier organization.
7. Confirm the order appears with Awaiting supplier status and lifecycle hash metadata.
8. Select an accepted order.
9. Open Escrow.
10. Confirm the accepted order reference is shown for escrow creation.
11. Create escrow from the accepted order.
12. Confirm escrow status, lifecycle hash, and blockchain proof panel are visible.
13. Confirm pending, blocked, or unknown eligibility prevents escrow creation with a forbidden response.
14. Sign out.
```

Expected result:

```text
Buyer can create and inspect orders, see supplier acknowledgement status, create escrow from an accepted order, and is blocked from escrow when organization eligibility is not approved.
```

Evidence:

```text
docs/evidence/qa/PBI-372_PROCUREMENT_WORKFLOW_VALIDATION.md
docs/evidence/qa/PBI-006_ESCROW_FIRST_SLICE_VALIDATION.md
```

## SME / Supplier

Preconditions:

- Demo account `supplier.demo` exists.
- Password is `demo-password`.
- At least one order is assigned to `demo-supplier-org`.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Supplier.
4. Confirm Dashboard loads with supplier navigation only.
5. Open Received Orders.
6. Select an assigned order.
7. Accept the order.
8. Confirm accepted status and lifecycle evidence message.
9. Open Delivery Evidence.
10. Confirm only metadata-safe evidence readiness is shown.
11. Open Escrow.
12. Confirm accepted order escrow readiness is visible without buyer-only create action.
13. Sign out.
```

Expected result:

```text
Supplier can inspect assigned orders, acknowledge an order, and view delivery/escrow readiness without buyer-only controls.
```

Evidence:

```text
docs/evidence/qa/PBI-372_PROCUREMENT_WORKFLOW_VALIDATION.md
```

## Compliance Reviewer

Preconditions:

- Demo account `compliance.demo` exists.
- Password is `demo-password`.
- Compliance case queue contains submitted and final-state cases.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Compliance Reviewer.
4. Confirm Dashboard loads with compliance navigation only.
5. Open Compliance.
6. Select a pending case.
7. Review safe evidence metadata.
8. Record approve, reject, flag, or block decision.
9. Confirm eligibility changes visibly.
10. Open Eligibility Status.
11. Confirm blocked/pending/non-eligible states are distinct from eligible.
12. Sign out.
```

Expected result:

```text
Compliance reviewer can record a decision and inspect eligibility without viewing raw KYC/AML documents.
```

Evidence:

```text
docs/evidence/qa/PBI-383_COMPLIANCE_WORKFLOW_VALIDATION.md
```

## Shariah Reviewer

Preconditions:

- Demo account `shariah.demo` exists.
- Password is `demo-password`.
- PLS review records are available in the Shariah Review workspace.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Shariah Reviewer.
4. Confirm Dashboard loads with Shariah Review navigation only.
5. Open Shariah Review.
6. Select a PLS review record.
7. Inspect profit ratio, loss allocation, approval reference, and checklist metadata.
8. Record Approve, Conditional approval, or Reject.
9. Confirm approved records become ready for financing activation.
10. Confirm conditional or rejected records remain blocked from activation.
11. Sign out.
```

Expected result:

```text
Shariah reviewer can inspect PLS seedbed contract metadata and record a governance decision without seeing financing activation controls.
```

Evidence:

```text
docs/evidence/qa/PBI-393_PLS_SHARIAH_WORKFLOW_VALIDATION.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## Bank / Financier

Preconditions:

- Demo account `financier.demo` exists.
- Password is `demo-password`.
- At least one PLS contract has an approved Shariah review reference.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Financier.
4. Confirm Dashboard loads with Financing navigation only.
5. Open Financing.
6. Select a PLS contract.
7. Inspect procurement reference, capital amount, profit ratio, loss allocation, and Shariah approval reference.
8. Attempt activation on a contract without approved Shariah reference and confirm it is blocked.
9. Activate an approved contract.
10. Record profit scenario.
11. Record loss scenario.
12. Confirm distribution records show allocation basis and do not imply external payment execution.
13. Sign out.
```

Expected result:

```text
Financier can activate only approved PLS contracts and inspect profit/loss scenario allocations without Shariah decision controls.
```

Evidence:

```text
docs/evidence/qa/PBI-393_PLS_SHARIAH_WORKFLOW_VALIDATION.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## Auditor

Preconditions:

- Demo account `auditor.demo` exists.
- Password is `demo-password`.
- Audit/proof demo events are available.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Auditor.
4. Confirm Dashboard loads with auditor navigation only.
5. Open Export Bundle.
6. Request an export bundle.
7. Confirm manifest and integrity metadata are visible.
8. Verify the bundle hash.
9. Open Blockchain Proof.
10. Confirm proof states remain honest and no fake transaction reference is shown for missing proof.
11. Sign out.
```

Expected result:

```text
Auditor can request a scoped evidence bundle, inspect manifest hashes, and verify available proof metadata without mutation controls.
```

Evidence:

```text
docs/evidence/qa/PBI-406_EXPORT_WORKFLOW_VALIDATION.md
```

## Regulator / Reporting User

Preconditions:

- Demo account `regulator.demo` exists.
- Password is `demo-password`.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Regulator.
4. Confirm Dashboard loads with regulator navigation only.
5. Open Export Bundle.
6. Request a combined audit export for the default date range.
7. Confirm bundle detail, manifest record counts, bundle hash, and manifest hash are visible.
8. Verify the bundle.
9. Confirm verified result is shown.
10. Open Blockchain Proof.
11. Verify the selected anchored event proof.
12. Sign out.
```

Expected result:

```text
Regulator can request and verify a scoped export bundle without seeing admin, buyer, compliance, or finance mutation actions.
```

Evidence:

```text
docs/evidence/qa/PBI-406_EXPORT_WORKFLOW_VALIDATION.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## Security Operator

Preconditions:

- Demo account `security.demo` exists.
- Password is `demo-password`.

Script:

```text
1. Open landing page.
2. Select Sign in.
3. Continue as Security Operator.
4. Confirm Dashboard loads with security navigation only.
5. Open Access Alerts.
6. Confirm denied-action alert metadata is visible.
7. Open Proof Failures.
8. Confirm failed, mismatch, and unavailable proof anomalies are distinct.
9. Open Denied Actions.
10. Confirm review is read-only.
11. Sign out.
```

Expected result:

```text
Security operator can inspect access and proof anomalies without administrator, compliance, or finance mutation controls.
```

Evidence:

```text
docs/evidence/qa/PBI-413_SECURITY_OPERATOR_VALIDATION.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## Platform Operator

Status: Local demo, PostgreSQL, and Fabric runbooks exist; release hardening continues in Wave 7.

## Developer / Integrator

Status: API quickstart pending Wave 7.
