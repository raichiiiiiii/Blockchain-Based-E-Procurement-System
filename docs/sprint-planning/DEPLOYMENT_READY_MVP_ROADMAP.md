# Deployment-Ready MVP Roadmap

Status: Approved roadmap baseline  
Owner: Product Owner / Scrum Master / Solution Architect  
Audience: Supervisor, frontend, backend, blockchain, DevOps, QA, compliance, Shariah, delivery team  
Related backlog append: `backlog/deployment-ready-roadmap.csv`  
Related release theme: Actor-ready Digital Procurement and PLS Seedbed MVP

## 1. Purpose

This roadmap converts the current Sprint 6 recovery work into a complete actor-ready, deployment-ready MVP plan.

The product remains the **Digital Procurement and PLS Seedbed MVP**.

The required product journey is:

```text
Landing page
-> sign in
-> resolved authenticated actor context
-> role dashboard
-> procurement / audit / escrow workflow
-> blockchain proof visibility
-> auditor verification
-> deployment-ready validation evidence
```

The MVP must not become a backlog viewer. Product UI must use domain labels such as `Dashboard`, `Orders`, `Escrow`, `Audit Trail`, `Blockchain Proof`, `Compliance`, `Members`, `Roles`, `Shariah Review`, and `Financing`.

PBI identifiers belong only in backlog, sprint planning, developer documentation, QA evidence, and commit messages.

## 2. Source-of-truth references

Use these references when implementing this roadmap:

```text
backlog/backlog.csv
backlog/deployment-ready-roadmap.csv
backlog/plan.mermaid

docs/report/srs-v3.tex
docs/proposals/business_proposal_digital_procurement_pls_seedbed.tex
docs/proposals/business_proposal_research_appendix.md
docs/README.md

docs/architecture/ARCHITECTURE.md
docs/architecture/FRONTEND_PRODUCT_JOURNEY.md
docs/architecture/STATE_MODELS.md
docs/architecture/DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md
docs/architecture/POSTGRES_PERSISTENCE_DECISION.md
docs/architecture/FABRIC_MVP_BOUNDARY.md
docs/architecture/BLOCKCHAIN_PROOF_UI_CONTRACT.md
docs/architecture/ESCROW_SMART_CONTRACT_BOUNDARY.md

docs/contracts/API_CONTRACTS.md
docs/contracts/AUTH_SESSION_CONTRACT.md
docs/contracts/TRANSACTION_HISTORY_CONTRACT.md
docs/contracts/ACCESS_HISTORY_QUERY_CONTRACT.md
docs/contracts/ACCESS_AUDIT_EVENT_INSPECTION_CONTRACT.md
docs/contracts/ONBOARDING_ELIGIBILITY_CONTRACT.md
docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md
docs/contracts/ESCROW_WORKFLOW_CONTRACT.md

docs/sprint-planning/SPRINT6_TASKS.md
docs/runbooks/local-demo.md
docs/runbooks/postgres-local-dev.md
docs/runbooks/fabric-local-network.md
```

## 3. Current delivery assessment

Current implementation has a credible technical foundation:

```text
Implemented or strongly progressed:
- product landing/login/dashboard entry
- authenticated session and actor context baseline
- buyer/auditor proof demo slice
- PostgreSQL migration, seed, and adapter baseline
- Hyperledger Fabric AuditAnchorContract baseline
- backend blockchain gateway and proof API
- blockchain proof UI
- escrow first slice
- local demo startup script
```

Current visible product gap:

```text
Not yet actor-complete:
- Administrator workflow
- Supplier workflow
- Compliance Reviewer workflow
- Shariah Reviewer workflow
- Bank / Financier workflow
- Regulator export workflow
- Security Operator workflow
- Network / Platform Operator deployment workflow
- Developer / Integrator quickstart workflow
```

Wave 0 documentation lock status:

```text
Completed:
- roadmap append accepted as Sprint 7 execution appendix
- mandatory / should-have / stretch / post-MVP scope recorded
- active roadmap references checked against docs/README.md structure
- Sprint 6 recovery evidence mapped
- local demo runbook created

Evidence:
- docs/evidence/qa/PBI-361_DEPLOYMENT_SCOPE_LOCK_VALIDATION.md
```

Wave 1 dashboard readiness status:

```text
Completed:
- mandatory demo actor catalogue expanded
- dashboard resolver recognizes administrator, buyer, supplier, compliance reviewer, Shariah reviewer, financier, auditor, and regulator roles
- security operator dashboard entry added as should-have coverage
- PostgreSQL-backed login can attach active organization and role context to issued sessions
- role-specific dashboard navigation smoke tested in browser

Evidence:
- docs/evidence/qa/PBI-366_DASHBOARD_ACTOR_READINESS_VALIDATION.md
```

Wave 2 administrator workflow status:

```text
Completed:
- administrator dashboard now exposes Members, Roles, and Access History surfaces
- member organization list/detail/status routes require bearer-session administrator context
- organization status actions support pendingReview, active, inactive, suspended, and deleted states
- canonical administrator role is accepted by RBAC admin gates
- access history is available to administrator as read-only governance evidence
- admin UAT script and authorization matrix baseline created

Evidence:
- docs/evidence/qa/PBI-364_ADMIN_RBAC_WORKFLOW_VALIDATION.md
- docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md
- docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## 4. MVP scope boundary

### Mandatory deployment scope

```text
- Landing page and sign in
- Authenticated actor context
- Role dashboard for every mandatory actor
- Administrator membership and RBAC workflow
- Buyer order and escrow workflow
- Supplier order acknowledgement and delivery evidence placeholder
- Compliance KYC/AML review and downstream eligibility visibility
- Auditor audit trail and blockchain proof verification
- Shariah review workflow visible in frontend
- Financier PLS contract and distribution seedbed
- Regulator signed audit export bundle workflow
- PostgreSQL migrations, seed, and runtime composition option
- Fabric AuditAnchorContract build/test and documented local network smoke path
- Local demo startup and deployment runbooks
- Actor UAT scripts and QA evidence
```

### Should-have scope

```text
- Security operator dashboard
- Delivery evidence proof placeholder
- Export bundle verification UI
- PLS scenario harness
- Basic service health/status panel
```

### Stretch scope

```text
- Fully automated live Fabric test-network startup
- Guided supervisor demo mode
- Improved blockchain proof visualization
- Enhanced audit timeline UX
- Smart onboarding checklist
```

### Explicit post-MVP scope

```text
- Full production Hyperledger Fabric consortium rollout
- Independent multi-organization node hosting
- Production CA lifecycle
- DID/VC federation and credential revocation
- Production ISO20022 payment execution
- Production ERP/accounting integration
- Tokenized receivables full lifecycle
- Dispute/arbitration module
- Multi-jurisdiction policy engine
- Full Fabric private data collection implementation
- Automated consortium voting/quorum governance
```

## 5. Actor flow matrix

| Actor | Objective | Entry point | Route / surface | Mandatory actions | Primary ReqIDs | Roadmap PBIs | Deployment status |
|---|---|---|---|---|---|---|---|
| Administrator | Govern members, roles, assignments, organization status | `/login` | `/dashboard`, `/members`, `/roles`, `/access-history` | Manage organizations, assign/revoke roles, inspect access history | R03, R17, R22 | PBI-364 to PBI-371 | Workflow ready |
| SME / Supplier | Receive orders, acknowledge, provide delivery evidence placeholder, view escrow status | `/login` | `/orders`, `/delivery-evidence`, `/escrow-status` | Acknowledge order, submit evidence metadata, view escrow | R05, R06, R17, R18, R22 | PBI-372 to PBI-382 | Dashboard entry ready; workflow pending |
| Buyer / Procurement Officer | Create orders, create escrow, view proof | `/login` | `/orders`, `/escrow`, `/blockchain-proof` | Create order, create escrow from accepted order, view proof | R05, R06, R17, R22 | PBI-372 to PBI-382 | Partially ready |
| Compliance Reviewer | Review KYC/AML cases and eligibility | `/login` | `/compliance`, `/compliance/cases/:id` | Approve, reject, flag, block, inspect eligibility | R02, R17, R22 | PBI-383 to PBI-392 | Dashboard entry ready; workflow pending |
| Shariah Reviewer | Review PLS contracts and decisions | `/login` | `/shariah/reviews`, `/shariah/reviews/:id` | Complete checklist, approve/reject/conditional approve | R07, R20, R22 | PBI-393 to PBI-405 | Dashboard entry ready; workflow pending |
| Bank / Financier | Review PLS contract and distribution | `/login` | `/financing`, `/financing/contracts/:id` | View PLS contract, inspect distribution record | R07, R17, R20, R26 | PBI-393 to PBI-405 | Dashboard entry ready; workflow pending |
| Auditor | Search audit trail and verify blockchain proof | `/login` | `/audit`, `/audit/events/:id`, `/blockchain-proof` | Search event, inspect proof, verify hash | R05, R15, R22 | PBI-406 to PBI-412 plus PBI-323/PBI-333 | Partially ready |
| Security Operator | Inspect access alerts and proof anomalies | `/login` | `/security`, `/access-alerts` | View denied actions and proof failures | R22, R25, R28 | PBI-413 to PBI-417 | Dashboard entry ready; should-have workflow pending |
| Network / Platform Operator | Start and validate local services | CLI/runbooks | runbooks and scripts | Start DB/API/frontend/Fabric smoke path | R25, R26 | PBI-418 to PBI-422 | Partially ready |
| Developer / Integrator | Use local API and contracts | docs/API | quickstart/runbooks | Login, call escrow/proof/export APIs | R11, R12, R23, R26 | PBI-418 to PBI-422 | Should-have |
| Regulator / Reporting User | Request and verify audit export | `/login` | `/exports`, `/exports/:bundleId` | Request bundle, verify integrity metadata | R15, R22, R28 | PBI-406 to PBI-412 | Dashboard entry ready; export workflow pending |

## 6. Execution waves

### Wave 0 — Documentation and scope lock

```text
PBI-361, PBI-362, PBI-363
```

Output:

```text
- deployment MVP scope locked
- backlog append accepted
- stale docs/drafts references replaced with docs/proposals where applicable
- status of Sprint 6 recovery work reconciled
```

### Wave 1 — Product entry, auth, and dashboard readiness

```text
PBI-263 to PBI-295 already delivered or in validation
PBI-366, PBI-384, PBI-394, PBI-407, PBI-414 extend demo-role coverage
```

Output:

```text
- every mandatory demo actor can authenticate
- dashboard resolver handles all mandatory actor roles
- no dashboard path relies on role dropdown authorization
- evidence: docs/evidence/qa/PBI-366_DASHBOARD_ACTOR_READINESS_VALIDATION.md
```

### Wave 2 — Actor flows and RBAC hardening

```text
PBI-364 to PBI-371
PBI-424 to PBI-425
```

Output:

```text
- administrator workflow complete
- role access matrix validated
- unauthorized routes/actions blocked
- evidence: docs/evidence/qa/PBI-364_ADMIN_RBAC_WORKFLOW_VALIDATION.md
```

### Wave 3 — Procurement and onboarding completion

```text
PBI-372 to PBI-392
```

Output:

```text
- buyer order workflow complete
- supplier received order flow complete
- KYC/AML compliance workflow visible
- eligibility gate blocks non-eligible organizations
```

### Wave 4 — Audit trail and blockchain proof

```text
PBI-406 to PBI-417
```

Output:

```text
- regulator export bundle flow complete
- auditor proof verification remains visible
- optional security operator workflow added when capacity allows
```

### Wave 5 — Escrow first slice completion

```text
PBI-378, PBI-392, and existing PBI-006/PBI-341 to PBI-360 evidence
```

Output:

```text
- escrow creation depends on accepted order or explicit demo reference
- eligibility is enforced before transaction actions
- escrow proof panel remains accurate and non-fabricated
```

### Wave 6 — PLS and Shariah governance integration

```text
PBI-393 to PBI-405
```

Output:

```text
- Shariah reviewer workflow visible
- PLS contract activation gate enforced
- financier PLS contract and distribution view available
- reproducible PLS scenario evidence exists
```

### Wave 7 — QA, UAT, evidence, and deployment

```text
PBI-418 to PBI-428
```

Output:

```text
- local demo is reproducible
- Postgres runtime composition option is available
- Fabric local smoke path is documented
- actor UAT evidence is recorded
- final supervisor demo script is ready
```

### Wave 8 — Post-deployment verification and handover

```text
No new scope unless a release blocker is found.
```

Output:

```text
- smoke deployed environment
- verify seeded demo accounts
- verify proof API
- verify all actor UAT scripts
- supervisor sign-off
- known limitations accepted
```

## 7. Deployment readiness checklist

```text
Local environment
[ ] Node.js and npm installed
[ ] Docker Desktop available
[ ] npm install complete
[ ] backend starts on port 3100
[ ] frontend starts on port 5173
[ ] frontend /api/v1 proxy targets backend 3100

Database
[ ] docker compose config passes
[ ] docker compose up -d postgres works
[ ] npm run db:migrate -- --dry-run passes
[ ] npm run db:seed -- --dry-run passes
[ ] runtime can use PostgreSQL repositories when configured

Fabric
[ ] npm run chaincode:audit-anchor:build passes
[ ] npm run chaincode:audit-anchor:test passes
[ ] local Fabric smoke path documented
[ ] no raw KYC, personal, payment, or commercial payloads are written on-chain

Application validation
[ ] npm run build passes
[ ] npm run frontend:build passes
[ ] npm test passes
[ ] git diff --check passes

Security / authorization
[ ] all protected routes use bearer session
[ ] actor context is server-derived
[ ] unauthorized role access is blocked
[ ] blocked or pending-review organizations cannot transact
[ ] KYC eligibility is checked before transaction actions

Actor UAT
[ ] administrator flow passes
[ ] buyer flow passes
[ ] supplier flow passes
[ ] compliance reviewer flow passes
[ ] Shariah reviewer flow passes
[ ] financier flow passes
[ ] auditor flow passes
[ ] regulator export flow passes
[ ] security operator flow passes if included
```

## 8. Main risks and controls

| Risk | Control |
|---|---|
| Actor identity source-of-truth drift | Use `AUTH_SESSION_CONTRACT.md`; no client-authored actor source. |
| Frontend/backend contract drift | Keep contract documents ahead of UI implementation and validate API client behavior. |
| Audit-policy incompleteness | Use audit contracts and add actor UAT evidence for denied actions. |
| Fabric operational complexity | Keep MVP Fabric local/sandboxed; document live network prerequisites. |
| PLS/Shariah overclaiming | Keep restricted mudarabah seedbed and manual Shariah approval gate. |
| Demo data realism | Seed realistic organizations, roles, orders, escrow, proof, PLS, and export data. |
| Deployment environment failure | Use runbooks and startup scripts; document ports and rollback. |
| Supervisor acceptance risk | Complete actor-facing workflows, not only backend modules. |

## 9. Definition of Done

### Task-level DoD

```text
- implementation or documentation exists
- acceptance criteria are covered
- test/build command runs where applicable
- evidence or runbook updated when relevant
- no product UI exposes backlog/PBI/sprint labels
```

### Story-level DoD

```text
- user can complete the intended workflow
- unauthorized and empty/error states are handled
- backend and frontend contracts are aligned
- QA evidence is recorded
```

### Actor-flow-level DoD

```text
- actor can log in
- actor sees role-specific dashboard/navigation
- actor completes the primary workflow
- actor cannot perform unauthorized actions
- audit evidence exists for governed actions
- UAT script is complete
```

### Release-level DoD

```text
- every mandatory actor flow passes UAT
- build/test/db/fabric checks are recorded
- local demo runbook works
- supervisor demo script is complete
- known limitations and post-MVP scope are documented
```

## 10. Backlog update rule

The canonical backlog remains `backlog/backlog.csv`.

Because the current backlog already contains dense historical rows up to PBI-360, new roadmap rows are staged in:

```text
backlog/deployment-ready-roadmap.csv
```

When the team begins Sprint 7 execution, Product Owner or Scrum Master should either:

1. append the accepted rows from `backlog/deployment-ready-roadmap.csv` into `backlog/backlog.csv`, or
2. keep the roadmap CSV as the Sprint 7 execution appendix and reference it from sprint planning docs.

Do not duplicate PBI IDs if new rows are appended into the canonical backlog.

## 11. Final recommended sprint commitment

### Must deliver

```text
- Administrator workflow
- Supplier and buyer order workflow
- Compliance reviewer KYC/AML workflow
- Shariah reviewer workflow
- Financier PLS contract/distribution workflow
- Regulator audit export bundle workflow
- Runtime PostgreSQL composition option
- Actor UAT evidence
- Final supervisor demo script
```

### Should deliver

```text
- Security operator workflow
- Delivery evidence placeholder
- API quickstart
- PLS scenario harness
- Export bundle verification UI polish
```

### Stretch

```text
- fully automated Fabric live test-network startup
- guided demo mode
- improved proof visualization
- enhanced audit timeline
```

### Defer

```text
- production consortium Fabric
- production bank/payment rails
- full ERP integration
- DID/VC federation
- tokenized receivables full lifecycle
- dispute/arbitration module
- multi-jurisdiction rules engine
```
