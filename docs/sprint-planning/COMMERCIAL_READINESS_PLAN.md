# Commercial Readiness Plan

Status: Proposed grooming baseline  
Owner: Product Owner / Scrum Master / Solution Architect  
Audience: Codex implementation agent, supervisor, PM, designers, frontend, backend, QA, DevOps, blockchain engineer  
Related source: `docs/report/product-diagnosis-redesign/product_diagnosis_redesign_report.tex`  
Related backlog: `backlog/backlog.csv`

## 1. Purpose

This plan turns the current deployable technical MVP into a more market-fit product by focusing on commercial readiness, actor workflow completeness, and a coherent target-market story.

The product should be treated as the **Digital Procurement and PLS Seedbed MVP**.

The product must be positioned as:

```text
A compliance-first digital procurement evidence platform with blockchain proof anchoring and Shariah-governed PLS seedbed support.
```

The product must not be positioned as:

```text
- a full blockchain procurement marketplace
- a production Islamic finance platform
- a full Hyperledger Fabric consortium
- a real payment settlement system
- a full ERP or ISO20022 integration platform
```

## 2. Current diagnosis

The project has a strong technical foundation, but market readiness depends on proving complete actor workflows around one coherent commercial case.

Current strengths:

```text
- authentication and session foundation
- role-based dashboard shell
- KYC/AML backend capability
- membership and RBAC foundation
- immutable audit trail and access history
- PostgreSQL persistence baseline
- Hyperledger Fabric AuditAnchorContract baseline
- backend blockchain proof gateway
- blockchain proof UI
- escrow first slice
- regulator export MVP evidence
- actor UAT and release validation evidence
```

Current risks:

```text
- product narrative is still broad
- parent backlog PBIs overlap with newer MVP slices
- market-fit evidence is weaker than technical evidence
- some workflows are complete only as MVP/demo slices
- innovation work could distract from mandatory actor completeness
```

## 3. Target market

Primary target market:

```text
Islamic SME financing institutions, development finance bodies, procurement-heavy cooperatives, and regulated buyers that need supplier onboarding, procurement evidence, escrow visibility, auditability, and Shariah/PLS governance.
```

Primary buyer:

```text
An institution that needs to prove procurement and financing decisions were controlled, traceable, and reviewable.
```

Primary users:

```text
Administrator
Buyer / Procurement Officer
SME / Supplier
Compliance Reviewer
Shariah Reviewer
Bank / Financier
Auditor
Regulator / Reporting User
Platform Operator
Developer / Integrator
Security Operator as should-have
```

## 4. Canonical commercial demo case

All mandatory workflows should be tied to one canonical case:

```text
Amanah Retail Sdn Bhd buys goods from Barakah Supplies Sdn Bhd.
Mabrur Finance Partner supports the transaction through a restricted PLS financing model.
Compliance approves supplier onboarding.
Buyer creates the order.
Supplier acknowledges the order.
Escrow is created from the accepted order.
Audit event is anchored or proof-ready.
Auditor verifies blockchain proof.
Shariah reviewer approves PLS terms.
Financier views PLS contract and distribution record.
Regulator exports the audit evidence bundle.
```

This case should be documented under:

```text
docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md
```

## 5. Commercial readiness gates

### Gate 1 — Product narrative readiness

Question:

```text
Can a non-developer understand the product in two minutes?
```

Acceptance:

```text
- landing page explains regulated procurement evidence clearly
- demo case is realistic
- blockchain is explained as proof infrastructure
- PLS is explained as a seedbed with Shariah governance, not production finance automation
```

### Gate 2 — Actor workflow readiness

Question:

```text
Can every mandatory actor complete their core job?
```

Acceptance:

```text
- administrator can govern members and roles
- compliance reviewer can review onboarding and eligibility
- buyer can create/view order and escrow
- supplier can acknowledge order
- auditor can verify proof
- regulator can inspect export bundle
- Shariah reviewer can approve PLS review
- financier can inspect PLS contract and distribution
```

### Gate 3 — Trust and compliance readiness

Question:

```text
Can the product prove who did what, when, and with what evidence?
```

Acceptance:

```text
- authenticated actor context is used
- audit trail exists for governed actions
- blockchain proof is honest and non-fabricated
- KYC eligibility blocks protected transaction actions
- Shariah approval blocks or enables PLS activation
- regulator export includes integrity metadata
```

### Gate 4 — Deployment readiness

Question:

```text
Can another person run and validate the product?
```

Acceptance:

```text
- local demo script exists
- backend and frontend ports are documented
- PostgreSQL migration and seed path works
- Fabric chaincode build/test path works
- actor UAT scripts exist
- final supervisor demo script exists
```

### Gate 5 — Market-claim safety

Question:

```text
Are we claiming only what the MVP actually proves?
```

Acceptance:

```text
- full production Fabric consortium is marked post-MVP
- real payment execution is marked post-MVP
- DID/VC federation is marked post-MVP
- tokenized receivables full lifecycle is marked post-MVP
- PLS remains restricted seedbed with Shariah governance
```

## 6. Implementation order

Use this order for the next implementation/grooming work:

```text
1. Commercial readiness backlog grooming
2. Canonical commercial demo case and seed data
3. Supervisor-ready demo script
4. Actor workflow acceptance matrix
5. Commercial readiness scorecard
6. Innovation discovery spike
7. Only then: optional stakeholder-delighting features
```

For feature implementation after grooming, use this order:

```text
1. Administrator workflow
2. Buyer and supplier order workflow
3. Compliance KYC/AML workflow
4. Escrow linkage hardening
5. Auditor and regulator evidence workflow
6. Shariah and financier PLS workflow
7. Deployment/UAT hardening
8. Security operator should-have workflow
```

## 7. New commercial-readiness PBIs

The backlog should include the following governance PBIs if they are not already present:

```text
PBI-429 Commercial readiness and market-fit closure
PBI-430 Groom mandatory actor-flow backlog for market-fit execution
PBI-431 Define canonical commercial demo case and seed data
PBI-432 Create supervisor-ready demo narrative and runbook
PBI-433 Add actor workflow acceptance matrix
PBI-434 Add commercial readiness scorecard
PBI-435 Discover stakeholder-delighting innovation opportunities
```

These PBIs are planning, QA, and product-control items. They are not product UI features.

## 8. Innovation policy

Innovation is allowed only after mandatory actor workflows and release evidence are stable.

Every innovation must begin as a Spike and must include:

```text
- target actor
- problem solved
- user value
- feasibility
- risk
- dependencies
- implementation estimate
- MVP / post-MVP recommendation
```

Candidate innovation themes:

```text
- guided supervisor demo mode
- blockchain proof timeline visualization
- smart onboarding checklist
- regulator evidence viewer
- PLS scenario simulator
- procurement risk score
- supplier readiness score
- Shariah review assistant checklist
```

## 9. Done criteria

Commercial readiness grooming is Done when:

```text
- backlog rows PBI-429 to PBI-435 exist or are reconciled
- canonical demo case is defined
- mandatory actor workflows are mapped
- commercial readiness scorecard exists
- innovation candidates are staged as spikes only
- no product UI exposes backlog or PBI labels
```

Commercial MVP is Done when:

```text
- all mandatory actor UAT scripts pass
- build/test validation is recorded
- database and Fabric validation paths are recorded
- known limitations are documented honestly
- final supervisor demo can be executed without chat memory
```
