# Issue 25 Actor Usefulness Validation

Date: 2026-06-01
Branch: codex/issue-25-actor-use-case-validation
Commit inspected before change: 61dfd7c
Source issue: https://github.com/raichiiiiiii/Blockchain-Based-E-Procurement-System/issues/25

Final readiness statement:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

Final Issue 25 verdict:

```text
Most actors are executable and useful; named gaps remain.
```

## Files And Evidence Inspected

- `backlog/backlog.csv`
- `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md`
- `docs/evidence/qa/COMMERCIAL_READINESS_SCORECARD.md`
- `docs/evidence/qa/FINAL_RELEASE_CANDIDATE_VALIDATION.md`
- `docs/evidence/qa/PBI-456_DATABASE_SEEDED_DEMO_ACCOUNTS_VALIDATION.md`
- `docs/evidence/qa/PBI-457_DEMONSTRATIVE_FALLBACK_REMOVAL_VALIDATION.md`
- `docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/supervisor-demo-script.md`
- `README.md`
- `src/frontend/lib/role-navigation.ts`
- `src/frontend/app/dashboard-renderer.tsx`
- `src/modules/**/api/*.ts`
- `scripts/db/seed-demo-data.ts`
- `C:\Users\User\Downloads\eprocurement_blockchain_ieee_paper.pdf`
- `C:\Users\User\Downloads\procurement_thesis_final.pdf`
- `C:\Users\User\Downloads\mudarabah_procurement_thesis.pdf`

The three PDF attachments were inspected by extracting text into a temporary local analysis folder. That extraction folder was not committed.

## Academic Baseline Summary

The procurement blockchain paper baseline describes a source-to-pay blockchain procurement lifecycle with 15 use cases:

1. Vendor onboarding
2. Purchase requisition
3. Requisition approval
4. RFQ creation
5. Supplier quotation
6. Quote evaluation and award
7. Purchase order and supplier acceptance
8. Contract creation and approval
9. Delivery confirmation
10. Invoice submission
11. Invoice verification and three-way match
12. Payment approval or instruction
13. Audit and compliance review
14. Dispute or exception handling
15. Supplier performance and closeout

The procurement productivity thesis baseline emphasizes reduced manual handoffs, stronger spend visibility, reduced maverick buying, reduced contract leakage, and fewer invoice exceptions or duplicate payments.

The mudarabah procurement thesis baseline emphasizes opportunity identification, SME funding need, due diligence, Shariah/compliance review, mudarabah approval, funding visibility, execution/delivery, buyer payment/accounting, profit/loss calculation, distribution, governance/audit, and risk controls. The attached thesis materials also reinforce conservative claims: no guaranteed profit, no guaranteed principal, and no external Shariah certification claim without evidence.

## Actor Findings

Detailed actor-level findings are recorded in:

- `docs/evidence/qa/ACTOR_USE_CASE_VALIDATION_MATRIX.md`

Summary:

| Actor | Finding |
|---|---|
| Visitor | Executable entry path exists through landing and credential-only sign-in. |
| Administrator | Executable governance workflow exists for members, roles, and access history. |
| Buyer / Procurement Officer | Executable order, delivery review, escrow, proof, and productivity workflow exists; full source-to-award is missing. |
| SME / Supplier | Executable received-order acknowledgement and delivery evidence workflow exists; supplier closeout is not first-class. |
| Compliance Reviewer | Executable KYC/AML eligibility workflow exists and gates transactions. |
| Shariah Reviewer | Partial. Backend read access exists for PLS contracts, but visible decision action remains local-fallback oriented for backend sessions. |
| Bank / Financier | Executable restricted PLS and payment-sandbox review exists within honest claim boundaries. |
| Auditor | Executable audit history and proof verification workflow exists. |
| Regulator / Reporting User | Executable export bundle workflow exists when a bundle is requested; no pre-existing `demo-export-bundle-001` was found in smoke. |
| Security Operator | Executable read-only security alert workflow exists. |
| Platform Operator | Executable runbook and health/readiness path exists. |
| Developer / Integrator | Executable OpenAPI and credential-authenticated API path exists. |

## Implemented Versus Simulated Versus Missing

Implemented and backend-backed:

- credential-only login and database-seeded demo accounts
- administrator member/RBAC/access-history inspection
- buyer order list/detail and supplier acknowledgement
- delivery evidence metadata/hash workflow
- KYC/AML eligibility and downstream gates
- escrow creation and release/dispute transition API
- blockchain proof metadata lookup and verification states
- export bundle creation, verification, and local signing metadata
- PLS contract read, activation gate, distribution records, and payment sandbox APIs
- security alert read model
- company productivity/money tracker/action inbox read model
- OpenAPI 3.1 contract and local API collection

Simulated or adapter-foundation scope:

- payment settlement is sandbox/manual only
- ISO 20022 is mapping-only and not bank execution
- ERP/accounting integration is local JSON adapter only
- Shariah certificates are artifact tracking only and not external certification
- Fabric is local/lab proof anchoring and not a production consortium
- delivery proof supports safe metadata and external intake patterns, not production logistics device infrastructure

Missing or materially partial:

- source-to-award workflow: requisition, approval, RFQ, quotation, evaluation, award
- invoice submission and three-way matching
- supplier performance and procurement closeout
- backend-backed Shariah reviewer decision/checklist execution from the main visible Shariah workspace

## API Smoke Results

Local backend smoke was run against:

- `http://127.0.0.1:3100/health`
- `http://127.0.0.1:3100/ready`
- `http://127.0.0.1:3100/api/v1/*`

Readiness result:

- `/ready` returned `data.status = ready`
- database mode: `postgres`, reachable `true`
- fabric mode: `local`, proof adapter `in-memory`, simulated `true`
- payment mode: `notConfigured`
- demo seed enabled: `true`
- `/health` returned `data.status = ok`

Seeded credential/API checks:

| Account | Result |
|---|---|
| `admin.demo` | Login passed; member organization list, roles, and access history returned 200. |
| `buyer.demo` | Login passed; orders, order detail, delivery evidence, escrow, and productivity summary returned 200. |
| `supplier.demo` | Login passed; assigned orders, order detail, delivery evidence, and action inbox returned 200. |
| `compliance.demo` | Login passed; supplier eligibility and productivity summary returned 200. |
| `shariah.demo` | Login passed; PLS contracts returned 200; direct review history for `review-demo-approved` returned 403 because authorization checks role assignment on the review organization. |
| `financier.demo` | Login passed; PLS contracts and distribution list returned 200. |
| `auditor.demo` | Login passed; access history and delivery proof lookup returned 200; seeded export bundle detail for `demo-export-bundle-001` returned 404. |
| `regulator.demo` | Login passed; escrow proof lookup returned 200; seeded export bundle detail for `demo-export-bundle-001` returned 404. |
| `security.demo` | Login passed; security alerts and productivity summary returned 200. |

Negative checks:

- `buyer.demo` requesting `/api/v1/member-organizations` returned 403.
- Anonymous request to `/api/v1/orders` returned 401.

## Browser Smoke Results

Browser smoke was attempted against `http://127.0.0.1:5173/login`.

Observed:

- login page exposed a username input, password input, `Sign in`, and `Back to overview`
- DOM snapshot did not expose `Continue as`
- role-card login was not visible

Limitation:

- The in-app browser virtual clipboard was unavailable for text entry, so visual credential submission was not completed through browser automation. API credential login smoke above validates the backend session path and actor context.

Screenshots:

- No screenshot file was committed. The browser check used DOM snapshots to avoid adding binary artifacts to the evidence set.

## Backlog Updates

Four planned backlog rows were added because the gaps are concrete against the academic baseline and current code:

- PBI-498 Source-to-award workflow closure
- PBI-499 Invoice and three-way matching workflow
- PBI-500 Supplier performance and procurement closeout workflow
- PBI-501 Backend-backed Shariah decision workspace closure

No existing completed PBI was downgraded. The new rows are Planned and scoped as pilot-hardening follow-ups.

## Validation Commands And Results

| Command | Result |
|---|---|
| Python CSV validation for `backlog/backlog.csv` | Passed; 501 rows, max PBI-501, no duplicates, PBI-498 through PBI-501 present once. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed; Vite built 98 modules. |
| `npm test` | Passed; 838 tests, 0 failed. |
| `npm run db:seed -- --dry-run` | Passed; validated 28 organizations and 24 demo accounts. |
| `npm run openapi:validate` | Passed; OpenAPI validation passed for 22 paths. |
| `docker compose -f docker-compose.app.yml config` | Passed. |
| forbidden-label source scan | Passed; no `Continue as`, `demo-account-grid`, `onDemoSignIn`, PBI, Sprint, Backlog, Roadmap, user story, implementation-slice, or feature-lane matches in `src/frontend`. |
| tracked generated Fabric/OAuth secret artifact scan | Passed; no tracked generated secret artifact paths detected. |
| `git diff --check` | Passed with line-ending warnings for edited text/CSV files only. |

## Known Limitations

- The product is not commercial-ready, pilot-certified, or production-certified.
- Fabric readiness is local/lab proof anchoring, not a managed production consortium.
- Payment, ERP, ISO 20022, document signature, IoT/QR/EPCIS, and Shariah certificate features are adapter-foundation or restricted seedbed scopes unless their specific evidence says otherwise.
- Shariah reviewer usability needs backend-session decision/checklist closure.
- Source-to-award, invoice matching, and supplier closeout remain the largest procurement usefulness gaps against the academic baseline.

## Recommendation

Prioritize the next implementation in this order:

1. PBI-501 to close the visible Shariah reviewer action gap.
2. PBI-498 to make the buyer procurement case start before purchase order creation.
3. PBI-499 to connect delivery evidence and payment readiness through invoice matching.
4. PBI-500 to close supplier performance and case closeout.
