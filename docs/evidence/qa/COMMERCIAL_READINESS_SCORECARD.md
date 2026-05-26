# Commercial Readiness Scorecard

Date: 2026-05-26
Status: Final release candidate checkpoint
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
| Actor workflow completeness | 4 | Final browser smoke confirmed sign-in and role routing for mandatory actors and the security operator, plus administrator governance, compliance, buyer order, supplier delivery evidence, buyer escrow, auditor proof, Shariah review, financing, regulator export, and security status surfaces. | Some workflows remain MVP/demo slices and live deployment operations still depend on local prerequisites. | Use the final release-candidate validation as the supervisor handoff baseline and keep post-MVP hardening separate from demo readiness. |
| Compliance/trust readiness | 4 | Auth/session contract, eligibility gate, authorization matrix, and audit evidence define governed actions and denial behavior. | Formal retention, legal hold, and jurisdiction policy engine remain post-MVP. | Add compliance operating checklist before external pilot. |
| Blockchain proof usefulness | 4 | Anchor contract, proof API, proof UI, chaincode tests, Fabric prerequisite smoke path, regulator/auditor proof verification, and proof timeline visualization show honest proof states. | Live Fabric local network still depends on local prerequisites. | Run live Fabric smoke when Fabric samples are configured. |
| Shariah/PLS credibility | 3 | Shariah review, PLS activation gate, distribution scenarios, and the PLS scenario simulator are evidenced. | It remains a restricted seedbed and has no formal Shariah board/legal certification. | Keep PLS language conservative and prepare a formal review pack before any pilot claim. |
| UI/UX market readiness | 4 | Product labels, role dashboards, guided demo mode, proof timeline, smart onboarding checklist, regulator evidence viewer, and PLS scenario simulator are present; final browser smoke found no PBI/backlog/sprint labels. | UX polish and stakeholder usability testing remain needed before pilot. | Rehearse the supervisor story and collect stakeholder feedback before expanding innovation scope. |
| Deployment readiness | 3 | Local demo startup applied migrations, seeded demo data, and launched backend/frontend successfully; PostgreSQL and Fabric runbooks exist. | Live Fabric network execution still depends on local prerequisites. | Keep prerequisite checks visible and record environment blockers in release evidence. |
| Supervisor demo readiness | 4 | Final release-candidate validation confirms the main Amanah-Barakah-Mabrur story surfaces render across all mandatory actors, with no browser errors and no forbidden product labels in sampled UI. | Live environment execution still depends on local prerequisites and should be checked before presenting. | Use the supervisor demo script and final validation evidence for handoff. |
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
Supervisor demo handoff with optional live PostgreSQL/Fabric smoke when prerequisites are configured.
```

## Release Blockers

No demo-blocking route failures were identified in the final release-candidate smoke.

Pilot-readiness blockers:

- formal stakeholder validation of target segment and demo case
- live environment-specific PostgreSQL and Fabric runbook execution
- production signing/key-management decision for export bundles
- formal Shariah/legal review before any external Islamic finance claim
- delivery evidence remains MVP metadata/hash scope; signed IoT/QR/upload/logistics proof remains post-MVP

## Non-Blocking Improvements

- guided supervisor demo mode completed
- blockchain proof timeline visualization completed
- smart onboarding checklist completed
- regulator evidence viewer completed
- PLS scenario simulator completed
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
