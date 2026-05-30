# Canonical Actor UAT Runbook

Status: MVP baseline
Owner: QA + Scrum Master + Product Owner
Last updated: 2026-05-30

## Purpose

This runbook defines the canonical actor UAT path for the Digital Procurement and PLS Seedbed MVP. It should be run against the single Amanah-Barakah-Mabrur procurement case where possible.

Readiness boundary:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

## Prerequisites

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the local demo:

   ```powershell
   .\scripts\start-local-demo.ps1
   ```

3. Open:

   ```text
   http://localhost:5173
   ```

4. Use seeded credentials from `README.md`. All demo users use `demo-password`.

## UAT Script

### Visitor

- Open landing page.
- Confirm the product is presented as a procurement evidence platform, not a generic blockchain demo.
- Confirm sign-in is credential-only.

Expected result: visitor can understand the procurement workflow and proceed to sign in.

### Administrator

- Sign in as `admin.demo`.
- Open Dashboard, Members, Roles, and Access History.
- Confirm organization/member state and role assignment surfaces are visible.
- Confirm non-admin-only actions remain hidden or protected for other roles during negative testing.

Expected result: administrator can govern organization and role setup.

### Compliance Reviewer

- Sign in as `compliance.demo`.
- Open Compliance and Eligibility Status.
- Review a KYC/AML case.
- Approve, reject, flag, or block using safe reason codes.

Expected result: eligibility state is visible and downstream workflows respect blocked or non-eligible states.

### Buyer / Procurement Officer

- Sign in as `buyer.demo`.
- Open Orders.
- Create or inspect a procurement order.
- Confirm accepted order can link to escrow.
- Open Delivery Evidence and Escrow surfaces.

Expected result: buyer can manage the procurement case without seeing unauthorized admin or regulator controls.

### SME / Supplier

- Sign in as `supplier.demo`.
- Open Received Orders.
- Accept or respond to the assigned order.
- Submit delivery evidence metadata.

Expected result: supplier can act only on assigned orders and cannot submit evidence for unrelated orders.

### Buyer Delivery Review

- Return as `buyer.demo`.
- Review submitted delivery evidence.
- Accept, reject, or request clarification where supported.

Expected result: delivery evidence state is visible and feeds escrow release-readiness.

### Escrow

- As buyer, create or inspect escrow for the accepted order.
- Move through supported release-readiness states where available.
- Confirm no real payment execution is claimed.

Expected result: escrow reaches release-readiness or settlement-instruction boundary without implying money movement.

### Shariah Reviewer

- Sign in as `shariah.demo`.
- Open Shariah Review.
- Inspect PLS terms and checklist metadata.
- Approve, conditionally approve, or reject.
- Inspect certificate artifact coverage where present.

Expected result: PLS activation stays blocked until Shariah and eligibility gates pass.

### Bank / Financier

- Sign in as `financier.demo`.
- Open Financing.
- Inspect PLS contract readiness, Shariah reference, and distribution scenario.

Expected result: financier can review readiness and scenarios without payment execution or guaranteed-profit claims.

### Auditor

- Sign in as `auditor.demo`.
- Open Audit Trail and Blockchain Proof.
- Inspect transaction history and selected proof states.
- Verify proof where anchored metadata exists.

Expected result: auditor sees honest proof states and no raw sensitive payloads.

### Regulator / Reporting User

- Sign in as `regulator.demo`.
- Open Export Bundle.
- Request or inspect export bundle manifest.
- Inspect hash/signature metadata and verification result.

Expected result: regulator sees scoped evidence metadata without production-signing overclaims.

### Security Operator

- Sign in as `security.demo`.
- Open Security Status and Access Alerts.
- Confirm denied actions, proof failures, and readiness incidents are visible.

Expected result: security operator has read-only monitoring surfaces and cannot mutate business workflows.

### Platform Operator

- Run:

  ```powershell
  npm run build
  npm run frontend:build
  npm test
  npm run db:migrate -- --dry-run
  npm run db:seed -- --dry-run
  docker compose config
  git diff --check
  ```

- Run deployable smoke when Docker is available:

  ```powershell
  .\scripts\smoke\deployable-smoke-test.ps1
  ```

Expected result: validation passes or environment blockers are documented.

## Negative Checks

- Anonymous users cannot access protected workflows.
- Role navigation does not grant authorization.
- Client-supplied actor identity does not override bearer session actor context.
- Proof mismatch is not displayed as verified.
- Missing Fabric proof does not fabricate transaction IDs.
- Raw KYC, payment, document, and commercial payloads are not displayed to unauthorized users.

## Evidence Output

Record final results in:

- `docs/evidence/qa/CANONICAL_ACTOR_UAT_RESULTS.md`
- `docs/evidence/qa/DEPLOYABLE_MVP_FINAL_VALIDATION.md`

If a step is blocked, record:

- actor
- route or action
- expected behavior
- actual behavior
- command/browser evidence
- whether it blocks supervisor demo or only pilot hardening
