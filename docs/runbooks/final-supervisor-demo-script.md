# Final Supervisor Demo Script

Status: Deployment-ready MVP baseline  
Audience: Supervisor / Scrum Master / Demo Operator

## Goal

Demonstrate a credible end-to-end procurement MVP with role-specific dashboards, governed workflows, audit evidence, and honest blockchain proof states.

## Setup

```powershell
.\scripts\start-local-demo.ps1
```

Open:

```text
http://localhost:5173
```

## Walkthrough

1. Landing and sign in  
   Show the landing page, open Sign in, and explain that demo accounts represent real product actors.

2. Administrator governance  
   Sign in as `admin.demo`. Open Members, inspect an organization, change status, open Roles, submit a role action, and inspect Access History.

3. Buyer order  
   Sign in as `buyer.demo`. Open Orders, create or inspect a procurement order, and show lifecycle hash metadata.

4. Supplier acknowledgement  
   Sign in as `supplier.demo`. Open Received Orders, accept an assigned order, and show that delivery evidence is metadata-only in the MVP.

5. Escrow creation  
   Return as Buyer, open Escrow, create escrow from an accepted order, and show `escrowCreated` status plus lifecycle proof metadata.

6. Blockchain proof  
   Sign in as `auditor.demo`. Open Blockchain Proof or an event detail proof panel. Verify a proof and show distinct states for verified, mismatch, missing, and unavailable evidence when available.

7. Compliance review and eligibility  
   Sign in as `compliance.demo`. Open Compliance, inspect safe KYC/AML metadata, record a decision, and show downstream eligibility. Explain that raw KYC/AML documents are not exposed in dashboard cards.

8. Shariah governance  
   Sign in as `shariah.demo`. Open Shariah Review, inspect PLS review metadata and checklist, record a decision, and show how conditional or rejected decisions block activation.

9. Financier PLS seedbed  
   Sign in as `financier.demo`. Open Financing, inspect a PLS contract, activate only an approved contract, and record profit/loss scenario distributions. State clearly that this is a seedbed simulation and not external payment execution.

10. Regulator export bundle  
    Sign in as `regulator.demo`. Open Export Bundle, request a scoped export, inspect manifest hashes, and verify bundle integrity metadata.

11. Security status  
    Optionally sign in as `security.demo`. Show read-only Access Alerts, Proof Failures, and Denied Actions.

12. Known limitations  
    Close by showing the limitations document and explaining what is MVP-local versus post-MVP.

## Expected Demo Assertions

```text
Root route opens landing page.
Sign in precedes dashboard access.
Each actor sees role-specific navigation.
Unauthorized routes and actions are hidden or rejected.
Blockchain proof does not fabricate transaction IDs.
Eligibility blocks transaction workflows.
PLS activation requires approved Shariah review.
Export bundle integrity metadata is inspectable.
Known limitations are explicit.
```

## Evidence Files

```text
docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
docs/evidence/qa/ACTOR_UAT_RESULTS.md
docs/evidence/qa/RELEASE_VALIDATION_RESULTS.md
docs/sprint-planning/KNOWN_LIMITATIONS_AND_POST_MVP_ROADMAP.md
```
