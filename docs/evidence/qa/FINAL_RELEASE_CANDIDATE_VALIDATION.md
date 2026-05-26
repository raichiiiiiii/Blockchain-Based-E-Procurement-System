# Final Release Candidate Validation

Date: 2026-05-26

Branch: main

Commit inspected before this evidence: 02d31a9

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This validation closes the current supervisor-ready release candidate for the Digital Procurement and PLS Seedbed MVP. It verifies the commercial demo path, build/test health, local PostgreSQL dry-run path, Fabric chaincode baseline, and final UI smoke coverage after the delivery evidence, security alert, proof timeline, regulator viewer, smart onboarding, and PLS simulator slices.

This is not a pilot-readiness, production-readiness, payment-execution, production Islamic finance, or production Fabric consortium certification.

## Files Inspected

- backlog/backlog.csv
- docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md
- docs/runbooks/supervisor-demo-script.md
- docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md
- docs/evidence/qa/COMMERCIAL_READINESS_SCORECARD.md
- docs/evidence/qa/SUPERVISOR_REHEARSAL_RESULTS.md
- docs/evidence/qa/SUPERVISOR_REHEARSAL_FIXES_VALIDATION.md
- docs/evidence/qa/PBI-379_DELIVERY_EVIDENCE_MVP_VALIDATION.md
- docs/evidence/qa/PBI-416_SECURITY_ALERT_READ_MODEL_VALIDATION.md
- docs/evidence/qa/PBI-421_FABRIC_SMOKE_VALIDATION.md
- docs/evidence/qa/GUIDED_DEMO_MODE_VALIDATION.md
- docs/evidence/qa/BLOCKCHAIN_PROOF_TIMELINE_VALIDATION.md
- docs/evidence/qa/REGULATOR_EVIDENCE_VIEWER_VALIDATION.md
- docs/evidence/qa/SMART_ONBOARDING_CHECKLIST_VALIDATION.md
- docs/evidence/qa/PLS_SCENARIO_SIMULATOR_VALIDATION.md

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed; Vite built 75 modules. |
| `npm test` | Passed; 691 tests, 0 failures. |
| `npm run db:migrate -- --dry-run` | Passed; validated migrations 001 to 005, including procurement orders and delivery evidence. |
| `npm run db:seed -- --dry-run` | Passed; validated 9 demo accounts plus procurement order, delivery evidence, lifecycle events, anchor metadata, and escrow records. |
| `npm run chaincode:audit-anchor:build` | Passed. |
| `npm run chaincode:audit-anchor:test` | Passed; 9 tests, 0 failures. |
| `docker compose config` | Passed; PostgreSQL service configuration rendered successfully. |
| `git diff --check` | Passed before evidence updates. |

## Browser Smoke

Target: `http://127.0.0.1:5173`

Result: Passed.

The in-app browser smoke covered:

| Actor or mode | Surfaces checked | Result |
| --- | --- | --- |
| Administrator | Dashboard, Members, Roles, Access History | Passed. |
| Compliance Reviewer | Compliance workspace and checklist/eligibility language | Passed. |
| Buyer / Procurement Officer | Orders, Delivery Evidence, Escrow, Blockchain Proof | Passed. |
| SME / Supplier | Received Orders and Delivery Evidence | Passed. |
| Auditor | Audit Trail, Proof Timeline, Blockchain Proof | Passed. |
| Shariah Reviewer | Shariah Review and decision/checklist surfaces | Passed. |
| Bank / Financier | Financing and PLS Scenario Simulator | Passed. |
| Regulator / Reporting User | Export Bundle, manifest hash, bundle hash, proof boundaries | Passed. |
| Security Operator | Security Status, Access Alerts, Proof Failures, Denied Actions | Passed. |
| Guided demo mode | Landing walkthrough panel | Passed. |

Sampled product pages did not expose PBI, sprint, backlog, feature-lane, implementation-slice, or user-story labels. Browser console error logs were empty during the smoke.

## Current Release Candidate Summary

- Mandatory actor sign-in and dashboard routing are demonstrable.
- Delivery evidence now supports an MVP metadata/hash workflow with supplier submission and buyer review.
- Security operator alert visibility is backend-backed and read-only.
- PostgreSQL migration and seed dry-runs cover current MVP demo records.
- Fabric AuditAnchor chaincode build/test passes, with live-network smoke documented as prerequisite-dependent.
- Auditor/regulator proof comprehension is improved through proof panel and proof timeline surfaces.
- Regulator export bundle detail explains manifest/hash integrity and claim boundaries.
- Smart onboarding checklist improves compliance/supplier eligibility visibility without exposing raw KYC documents.
- PLS scenario simulator explains restricted seedbed allocation without payment execution or profit/principal guarantees.

## Known Limitations

- The product remains supervisor demo ready, not pilot-ready or commercial-ready.
- Fabric live deployment depends on local Fabric sample prerequisites and is not a production consortium.
- PostgreSQL validation here used dry-runs plus compose configuration; live local database startup should be checked before presenting.
- Delivery evidence is metadata/hash only and excludes IoT, QR signing, EPCIS compatibility, external logistics APIs, document upload storage, and image/PDF rendering.
- Escrow remains an MVP workflow slice and does not execute settlement, real payment release, arbitration, or dispute resolution.
- PLS remains a restricted seedbed and does not imply formal Shariah certification, guaranteed profit, guaranteed principal, or payment execution.
- Export bundle verification uses MVP manifest/hash integrity and does not claim production signing/key management or external regulator portal integration.
- ERP, accounting, and ISO20022 payment execution integrations remain post-MVP.

## Recommended Demo Command Sequence

```powershell
npm install
docker compose up -d postgres
npm run db:migrate
npm run db:seed
.\scripts\start-local-demo.ps1
```

Open:

```text
http://localhost:5173
```

Optional Fabric confidence checks:

```powershell
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
.\scripts\fabric\smoke-audit-anchor.ps1 -PrerequisiteCheck
```

## Go / No-Go

Go for supervisor demo, provided the presenter uses the documented local demo path and repeats environment checks before the session.

No-go remains for pilot, commercial, or production deployment until live environment operations, formal compliance/retention policy, production signing/key management, formal Shariah/legal review, and stakeholder validation are completed.
