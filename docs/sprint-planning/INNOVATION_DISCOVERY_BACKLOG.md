# Innovation Discovery Backlog

Status: Commercial-readiness planning baseline
Owner: Product Owner
Scope: Post-mandatory workflow innovation staging

## Innovation Policy

Innovation starts only after mandatory actor flows are stable.

Every innovation begins as a Spike. Innovation must not replace mandatory workflow completion, authorization hardening, runbook reliability, or evidence quality.

Each future innovation spike must include:

- target actor
- user delight hypothesis
- problem solved
- stakeholder value
- feasibility
- risks
- dependencies
- MVP, stretch, or post-MVP recommendation

No new backlog IDs beyond PBI-435 are assigned in this document.

## Candidate Spikes

### 1. Guided Supervisor Demo Mode

| Field | Detail |
|---|---|
| Target actor | Supervisor, demo operator, Product Owner |
| User delight hypothesis | A guided mode makes the product feel intentional and reduces demo anxiety. |
| Problem solved | The current demo depends on the operator remembering the correct actor sequence. |
| Why stakeholders may value it | Supervisors can understand the end-to-end story faster and see proof of actor completeness. |
| Feasibility | Medium; mostly frontend orchestration and seeded state awareness. |
| Risks | Could hide real workflow complexity or become stale if routes change. |
| Dependencies | Stable actor routes, canonical demo case, acceptance matrix. |
| Implementation size | M. |
| Rough story-point range | 5 to 8 points. |
| Dependency level | Medium; depends on stable route names and seeded demo data. |
| Recommended timing | After timed supervisor rehearsal and rehearsal fixes. |
| Recommendation | Stretch after supervisor script rehearsal. |
| Proposed PBI placeholder | Future spike: Guided Supervisor Demo Mode. |

### 2. Blockchain Proof Timeline Visualization

| Field | Detail |
|---|---|
| Target actor | Auditor, Regulator, Security Operator |
| User delight hypothesis | A visual proof timeline makes event integrity easier to trust than isolated proof cards. |
| Problem solved | Proof states are correct but may feel technical or fragmented. |
| Why stakeholders may value it | Auditors can explain event sequence, anchor status, and verification outcome in one view. |
| Feasibility | Medium; requires event ordering and proof state aggregation. |
| Risks | Must not imply unanchored events are verified; must avoid fake chain data. |
| Dependencies | Audit events, blockchain proof API, export bundle metadata. |
| Implementation size | M. |
| Rough story-point range | 5 to 8 points. |
| Dependency level | Medium; depends on stable transaction history and proof API responses. |
| Recommended timing | After proof route validation and auditor/regulator walkthrough. |
| Recommendation | Stretch, high value after mandatory proof path is stable. |
| Proposed PBI placeholder | Future spike: Blockchain Proof Timeline Visualization. |

### 3. Smart Onboarding Checklist

| Field | Detail |
|---|---|
| Target actor | Compliance Reviewer, Supplier, Administrator |
| User delight hypothesis | A checklist helps users understand why an organization is eligible, pending, flagged, or blocked. |
| Problem solved | Eligibility states can be correct but opaque to non-technical users. |
| Why stakeholders may value it | Reduces compliance review confusion and supports transparent supplier readiness. |
| Feasibility | Medium; needs redacted metadata and eligibility rules display. |
| Risks | Must not expose raw KYC/AML documents or confidential rationale to unauthorized users. |
| Dependencies | Eligibility contract, compliance workflow, redaction policy. |
| Implementation size | M. |
| Rough story-point range | 5 to 8 points. |
| Dependency level | Medium; depends on finalized safe metadata and eligibility states. |
| Recommended timing | After compliance UAT confirms redaction and eligibility wording. |
| Recommendation | Stretch for supervisor demo polish; pilot candidate after privacy review. |
| Proposed PBI placeholder | Future spike: Smart Onboarding Checklist. |

### 4. Regulator Evidence Viewer

| Field | Detail |
|---|---|
| Target actor | Regulator / Reporting User, Auditor |
| User delight hypothesis | A bundle viewer with manifest, scope, and verification status feels more credible than a raw export record. |
| Problem solved | Export bundle metadata may be technically correct but hard to inspect quickly. |
| Why stakeholders may value it | Regulators can review integrity metadata and case scope without needing backend details. |
| Feasibility | Medium; uses existing export bundle and verification metadata. |
| Risks | Must not leak restricted data or imply external regulator portal integration. |
| Dependencies | Export bundle service, verification endpoint, authorization matrix. |
| Implementation size | S to M. |
| Rough story-point range | 3 to 5 points. |
| Dependency level | Medium; depends on stable export bundle metadata and verification endpoint. |
| Recommended timing | After regulator export workflow passes UAT. |
| Recommendation | Stretch, strong pilot-readiness candidate. |
| Proposed PBI placeholder | Future spike: Regulator Evidence Viewer. |

### 5. PLS Scenario Simulator

| Field | Detail |
|---|---|
| Target actor | Bank / Financier, Shariah Reviewer, Product Owner |
| User delight hypothesis | Scenario controls make the PLS seedbed easier to understand and more compelling. |
| Problem solved | PLS distribution records can feel abstract without interactive scenario comparison. |
| Why stakeholders may value it | Financiers and reviewers can see profit/loss allocation effects clearly. |
| Feasibility | Medium; builds on existing scenario tests and distribution model. |
| Risks | Must not imply guaranteed profit, guaranteed principal, or payment execution. |
| Dependencies | PLS contract model, Shariah approval gate, distribution scenario service. |
| Implementation size | M. |
| Rough story-point range | 5 to 8 points. |
| Dependency level | Medium; depends on accepted PLS language and scenario rules. |
| Recommended timing | After Shariah and financier UAT confirms seedbed scope. |
| Recommendation | Stretch after claim-safety review. |
| Proposed PBI placeholder | Future spike: PLS Scenario Simulator. |

### 6. Procurement Risk Score

| Field | Detail |
|---|---|
| Target actor | Buyer, Compliance Reviewer, Auditor |
| User delight hypothesis | A simple risk score can help users prioritize review without reading every record. |
| Problem solved | Procurement teams need quick signals for supplier/order risk. |
| Why stakeholders may value it | Improves perceived intelligence and operational usefulness. |
| Feasibility | Low to medium; requires careful rule design and explainability. |
| Risks | Risk scores can become misleading, biased, or overclaimed without validated data. |
| Dependencies | Supplier eligibility, order history, audit events, policy definitions. |
| Implementation size | L. |
| Rough story-point range | 8 to 13 points. |
| Dependency level | High; depends on data governance, explainability policy, and stakeholder validation. |
| Recommended timing | Post-MVP, after compliance data model and policy rules are validated. |
| Recommendation | Post-MVP spike after data governance review. |
| Proposed PBI placeholder | Future spike: Procurement Risk Score. |

### 7. Supplier Readiness Score

| Field | Detail |
|---|---|
| Target actor | Supplier, Buyer, Compliance Reviewer |
| User delight hypothesis | Suppliers can see what makes them transaction-ready and buyers can see readiness quickly. |
| Problem solved | Eligibility alone may not explain operational readiness. |
| Why stakeholders may value it | Supports onboarding transparency and may reduce back-and-forth between supplier and compliance teams. |
| Feasibility | Medium; can begin as rule-based metadata. |
| Risks | Must avoid exposing sensitive KYC details or creating unfair automated decisions. |
| Dependencies | Onboarding eligibility, safe metadata model, compliance decision history. |
| Implementation size | M to L. |
| Rough story-point range | 8 to 13 points. |
| Dependency level | High; depends on redaction policy, safe metadata, and stakeholder validation. |
| Recommended timing | Post-MVP unless customer discovery prioritizes supplier self-service. |
| Recommendation | Post-MVP unless stakeholder interviews rank it highly. |
| Proposed PBI placeholder | Future spike: Supplier Readiness Score. |

### 8. Shariah Review Assistant Checklist

| Field | Detail |
|---|---|
| Target actor | Shariah Reviewer, Financier |
| User delight hypothesis | A structured assistant checklist reduces review friction and makes approval rationale clearer. |
| Problem solved | PLS review can be hard to explain without consistent checklist structure. |
| Why stakeholders may value it | Supports governance confidence and repeatable review. |
| Feasibility | Medium; can start as rules/checklist UI without AI automation. |
| Risks | Must not replace qualified Shariah judgment or imply certification. |
| Dependencies | PLS review detail, decision trail, restricted seedbed policy. |
| Implementation size | M. |
| Rough story-point range | 5 to 8 points. |
| Dependency level | Medium; depends on Shariah reviewer feedback and accepted checklist language. |
| Recommended timing | Stretch or post-MVP after Shariah reviewer rehearsal. |
| Recommendation | Stretch or post-MVP depending on Shariah reviewer feedback. |
| Proposed PBI placeholder | Future spike: Shariah Review Assistant Checklist. |

## Prioritization Guidance

Recommended order after mandatory workflows are stable:

1. Guided Supervisor Demo Mode
2. Blockchain Proof Timeline Visualization
3. Regulator Evidence Viewer
4. Smart Onboarding Checklist
5. PLS Scenario Simulator
6. Shariah Review Assistant Checklist
7. Supplier Readiness Score
8. Procurement Risk Score

The first three improve supervisor and regulator comprehension with relatively low claim risk. Risk scoring should wait until the team has stronger data governance and stakeholder validation.
