# Commercial Readiness Scorecard

Date: 2026-05-26
Status: Supervisor rehearsal checkpoint
Product: Digital Procurement and PLS Seedbed MVP

## Scoring Scale

| Score | Meaning |
|---:|---|
| 1 | Not ready; material blocker or unclear value. |
| 2 | Weak; useful pieces exist but scope or evidence is not convincing. |
| 3 | Demonstrable; credible MVP path but visible gaps remain. |
| 4 | Supervisor-ready; coherent and evidenced, with honest limitations. |
| 5 | Pilot/commercial-ready; operational, repeatable, and low-risk for external use. |

## Scorecard

| Category | Score | Evidence | Gap | Next action |
|---|---:|---|---|---|
| Product narrative readiness | 4 | Commercial readiness plan and diagnosis report align on a compliance-first procurement evidence platform with PLS seedbed support. | Landing/demo narrative still needs to be rehearsed as one transaction rather than separate feature stops. | Use the Amanah-Barakah-Mabrur case for every supervisor walkthrough. |
| Target market clarity | 4 | Target market is narrowed to Islamic SME financing institutions, development finance bodies, procurement-heavy cooperatives, and regulated buyers. | Buyer persona and pilot procurement scenario need validation with real stakeholders. | Validate target segment assumptions with supervisor or sponsor interviews. |
| Actor workflow completeness | 4 | Supervisor rehearsal confirmed sign-in and role routing for mandatory actors, plus buyer order, supplier acknowledgement, delivery evidence, escrow, compliance, Shariah, financing, export, and security read-only flows. | Auditor Blockchain Proof route needs a direct event-selection or proof-panel path; actor matrix still has stale security-alert wording. | Fix the auditor proof dead-end and update stale acceptance-matrix wording before the next rehearsal. |
| Compliance/trust readiness | 4 | Auth/session contract, eligibility gate, authorization matrix, and audit evidence define governed actions and denial behavior. | Formal retention, legal hold, and jurisdiction policy engine remain post-MVP. | Add compliance operating checklist before external pilot. |
| Blockchain proof usefulness | 4 | Anchor contract, proof API, proof UI, chaincode tests, Fabric prerequisite smoke path, and regulator proof verification show honest proof states. | Auditor proof workflow is not direct enough; live Fabric local network still depends on local prerequisites. | Add an auditor-accessible proof path and run live Fabric smoke when Fabric samples are configured. |
| Shariah/PLS credibility | 3 | Shariah review and PLS activation gate are evidenced; distribution scenarios exist. | It remains a restricted seedbed and has no formal Shariah board/legal certification. | Keep PLS language conservative and prepare formal review pack for pilot. |
| UI/UX market readiness | 3 | Product labels, role dashboards, and workflow screens exist; UI avoids backlog/PBI language. | UX polish, guided demo mode, and stronger timeline visualization would improve market perception. | Prioritize guided demo mode and proof timeline only after mandatory flows stay stable. |
| Deployment readiness | 3 | Local demo startup applied migrations, seeded demo data, and launched backend/frontend successfully; PostgreSQL and Fabric runbooks exist. | Live Fabric network execution still depends on local prerequisites. | Keep prerequisite checks visible and record environment blockers in release evidence. |
| Supervisor demo readiness | 4 | Timed rehearsal evidence confirms the main Amanah-Barakah-Mabrur story is demonstrable with no demo-blocking route failure. | Auditor proof path and stale security-operator documentation should be polished before a final supervisor run. | Complete Phase 6 rehearsal fixes and rerun the focused demo path. |
| Market claim safety | 4 | Commercial plan and demo docs explicitly reject production payment, full consortium, ERP, and production Islamic finance claims. | Sales/demo language must stay disciplined under questioning. | Keep "what not to claim" section visible in demo prep. |

## Overall Readiness Rating

Current overall rating:

```text
Supervisor demo ready, not pilot-ready or commercial-ready.
```

Rationale:

The MVP is stronger than a technical demo because mandatory actor workflows, proof states, authorization evidence, runbooks, and a timed rehearsal path are documented. It is not yet pilot-ready because live deployment operations, formal compliance/retention policy, production signing, and stakeholder-validated commercial assumptions still need hardening.

## Recommended Next Milestone

```text
Phase 6 rehearsal fixes: add an auditor-accessible proof path, refresh stale security-operator documentation, and rerun the focused supervisor demo path.
```

## Release Blockers

No demo-blocking route failures were identified in the timed rehearsal. The auditor proof path is a high-confusion issue that should be fixed before a polished supervisor run.

Pilot-readiness blockers:

- formal stakeholder validation of target segment and demo case
- live environment-specific PostgreSQL and Fabric runbook execution
- production signing/key-management decision for export bundles
- formal Shariah/legal review before any external Islamic finance claim
- delivery evidence remains MVP metadata/hash scope; signed IoT/QR/upload/logistics proof remains post-MVP

## Non-Blocking Improvements

- guided supervisor demo mode
- blockchain proof timeline visualization
- smart onboarding checklist
- regulator evidence viewer
- PLS scenario simulator
- procurement risk score
- supplier readiness score
- Shariah review assistant checklist

## Market Claim Boundary

The MVP may be described as:

```text
A compliance-first procurement evidence platform with blockchain proof anchoring and Shariah-governed PLS seedbed support.
```

It must not be described as:

- a production payment system
- a full blockchain procurement marketplace
- a full production Islamic finance platform
- a production Hyperledger Fabric consortium
- a full ERP/accounting integration product
- an ISO20022 payment execution platform
