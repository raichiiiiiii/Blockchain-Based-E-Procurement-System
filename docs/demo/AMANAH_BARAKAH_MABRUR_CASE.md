# Amanah Barakah Mabrur Commercial Demo Case

Status: Commercial-readiness planning baseline
Audience: Supervisor, product owner, QA, demo operator, developers

## Purpose

This document defines the canonical commercial demo case for the Digital Procurement and PLS Seedbed MVP. It ties onboarding, procurement, escrow, blockchain proof, Shariah review, financing, and regulator export into one coherent transaction that can be explained without relying on chat memory or implementation notes.

The case supports the product positioning:

```text
A compliance-first digital procurement evidence platform with blockchain proof anchoring and Shariah-governed PLS seedbed support.
```

It must not be presented as a production payment rail, a full Islamic finance platform, a broad procurement marketplace, a production Fabric consortium, or an ERP/ISO20022 integration product.

## Target Market Context

The target market is Islamic SME financing institutions, development finance bodies, procurement-heavy cooperatives, and regulated buyers that need supplier onboarding, procurement evidence, escrow visibility, auditability, and Shariah/PLS governance.

The buyer problem is not "we need blockchain." The buyer problem is:

```text
We need controlled procurement and financing evidence that can be reviewed, verified, exported, and explained.
```

The MVP should demonstrate that every actor can complete a role in a governed commercial case and that the system records enough evidence for supervisor review.

## Actors and Organizations

| Actor or organization | Demo role | Product responsibility |
|---|---|---|
| Amanah Retail Sdn Bhd | Buyer organization | Creates the procurement order and initiates escrow from an accepted order. |
| Barakah Supplies Sdn Bhd | Supplier organization | Receives the order, acknowledges acceptance, and submits safe delivery evidence metadata. |
| Mabrur Finance Partner | Financier organization | Reviews PLS contract status and distribution scenarios after Shariah approval. |
| Administrator | Platform governance user | Activates organizations, manages role assignments, and inspects access history. |
| Compliance Reviewer | KYC/AML reviewer | Reviews safe onboarding metadata and records eligibility decisions. |
| Shariah Reviewer | Shariah governance user | Reviews PLS terms and records approval, conditional approval, or rejection. |
| Auditor | Audit user | Inspects audit trail and verifies blockchain proof states. |
| Regulator | Reporting user | Requests and verifies export bundle integrity metadata. |
| Platform Operator | Local environment operator | Starts services and follows deployment/runbook evidence. |
| Developer / Integrator | API consumer | Authenticates and calls proof, escrow, order, export, or PLS APIs. |
| Security Operator | Should-have security user | Reviews denied actions, proof failures, and access alerts as safe metadata. |

## End-to-End Case Story

1. The Administrator signs in and confirms Amanah Retail, Barakah Supplies, and Mabrur Finance Partner are active member organizations with appropriate roles.
2. The Compliance Reviewer opens the compliance queue and approves Barakah Supplies after reviewing safe KYC/AML metadata.
3. The Buyer for Amanah Retail creates an order for Barakah Supplies.
4. The Supplier for Barakah Supplies opens received orders and acknowledges the order.
5. The Supplier records delivery evidence metadata for the accepted order using a safe reference, description, and hash.
6. The Buyer opens the order detail and reviews delivery evidence metadata, lifecycle hash, and proof state without seeing raw commercial documents.
7. The Buyer opens Escrow and creates escrow from the accepted order reference.
8. Escrow creation emits a lifecycle audit event for the escrow-created state.
9. Delivery evidence and escrow lifecycle events are anchored when the proof gateway is available, or remain proof-ready/pending/failed with honest proof states.
10. The Auditor opens Blockchain Proof or an event detail and verifies the proof without fabricated transaction data.
11. The Shariah Reviewer opens Shariah Review, inspects PLS metadata, and approves the restricted seedbed terms.
12. The Financier opens Financing, verifies the Shariah approval reference, and views profit/loss distribution scenarios.
13. The Regulator opens Export Bundle, requests the scoped evidence bundle, and verifies manifest integrity metadata.

## Expected Seed Data

| Data area | Expected seed value |
|---|---|
| Buyer organization | `demo-buyer-org`, display name Amanah Retail Sdn Bhd, status active, eligibility eligible |
| Supplier organization | `demo-supplier-org`, display name Barakah Supplies Sdn Bhd, status active, eligibility eligible after compliance approval |
| Financier organization | `demo-financier-org`, display name Mabrur Finance Partner, status active |
| Demo password | `demo-password` for local demo accounts |
| Administrator account | `admin.demo` |
| Buyer account | `buyer.demo` |
| Supplier account | `supplier.demo` |
| Compliance account | `compliance.demo` |
| Shariah reviewer account | `shariah.demo` |
| Financier account | `financier.demo` |
| Auditor account | `auditor.demo` |
| Regulator account | `regulator.demo` |
| Security account | `security.demo` |
| Procurement order | Metadata-safe order from Amanah Retail to Barakah Supplies |
| Delivery evidence | Safe delivery reference, supplier note, evidence hash, lifecycle event, and proof state for the accepted order |
| Escrow record | Escrow-created state linked to the accepted order reference |
| PLS contract | Restricted seedbed contract linked to the procurement case and Shariah approval reference |
| Export bundle | Combined audit scope with manifest hash and verification metadata |

Seed data should avoid raw KYC documents, raw escrow terms, payment credentials, and private commercial documents in visible dashboard cards.

## Expected Screen and Route Per Actor

| Actor | Entry | Expected screen or route | Expected result |
|---|---|---|---|
| Administrator | Sign in | Dashboard, Members, Roles, Access History | Organizations and role controls are visible; non-admin workflow controls are not shown. |
| Buyer | Sign in | Dashboard, Orders, Escrow, Blockchain Proof | Buyer creates order, reviews delivery evidence metadata, creates escrow from accepted order, and sees proof metadata. |
| Supplier | Sign in | Dashboard, Received Orders, Delivery Evidence, Escrow | Supplier acknowledges assigned order and submits safe delivery evidence metadata. |
| Compliance Reviewer | Sign in | Dashboard, Compliance, Eligibility Status | Reviewer records decision and eligibility state is visible downstream. |
| Shariah Reviewer | Sign in | Dashboard, Shariah Review | Reviewer inspects checklist metadata and records a decision. |
| Financier | Sign in | Dashboard, Financing | Financier inspects approved PLS contract and distribution scenarios. |
| Auditor | Sign in | Dashboard, Audit Trail, Blockchain Proof, Export Bundle | Auditor verifies proof and inspects export evidence read-only. |
| Regulator | Sign in | Dashboard, Export Bundle, Blockchain Proof | Regulator requests export and verifies integrity metadata. |
| Platform Operator | Runbook | Local demo startup path | Services start or blockers are documented. |
| Developer / Integrator | API quickstart | Local API base URL | Authenticated API calls return documented envelopes. |
| Security Operator | Sign in | Dashboard, Security Status, Access Alerts, Proof Failures, Denied Actions | Security user reviews read-only anomaly metadata. |

## Expected Backend and API Dependency Per Actor

| Actor | Backend or API dependency |
|---|---|
| Administrator | Auth session, membership routes, role routes, access history query. |
| Buyer | Auth session, procurement order routes, delivery evidence read route, eligibility gate, escrow routes, blockchain proof endpoint. |
| Supplier | Auth session, procurement order list/detail, acknowledgement route, delivery evidence submit/read routes, ownership authorization. |
| Compliance Reviewer | Auth session, KYC/AML case routes, eligibility/status history route, redaction policy. |
| Shariah Reviewer | Auth session, PLS review and decision service, financing read model. |
| Financier | Auth session, PLS activation gate, distribution scenario service, eligibility gate. |
| Auditor | Auth session, audit trail, blockchain anchor lookup, verification endpoint, export bundle route. |
| Regulator | Auth session, export bundle generation, bundle verification endpoint, proof read path. |
| Platform Operator | Local demo script, PostgreSQL migration/seed path, Fabric chaincode build/test path. |
| Developer / Integrator | Auth API, documented REST endpoints, shared error envelope. |
| Security Operator | Auth session, read-only security status UI, proof failure and denied-action metadata. |

## Required Audit Events

The demo should be able to explain or inspect these events as governed actions:

| Event | Trigger | Evidence expectation |
|---|---|---|
| Organization status reviewed or changed | Administrator governance action | Actor, organization, status, timestamp, and outcome are recorded. |
| Role assignment action | Administrator role action | Actor, role, target user or organization, and outcome are recorded. |
| Compliance decision recorded | Reviewer approves, rejects, flags, or blocks case | Eligibility state changes without exposing raw KYC/AML payloads. |
| Order created | Buyer creates order | Procurement lifecycle event and payload hash metadata exist. |
| Order acknowledged | Supplier accepts assigned order | Lifecycle event shows supplier action and order status. |
| Delivery evidence submitted | Supplier records safe delivery evidence for an accepted order | `deliveryEvidenceSubmitted` lifecycle event, evidence hash, and proof state exist without raw document payloads. |
| Escrow created | Buyer creates escrow from accepted order | Escrow-created lifecycle event exists. |
| Proof verified | Auditor or regulator verifies proof | Verification status is recorded or visible as evidence metadata. |
| Shariah decision recorded | Reviewer approves, conditionally approves, or rejects | Decision trail supports PLS activation gate. |
| PLS activated or distribution scenario recorded | Financier acts on approved contract | Seedbed allocation event is recorded without implying payment execution. |
| Export bundle requested or verified | Regulator or auditor requests/verifies bundle | Manifest hash and verification state are visible. |
| Denied action | Unauthorized actor attempts protected action | Denial is captured for audit/security review where implemented. |

## Required Blockchain Proof Points

| Proof point | Expected state handling |
|---|---|
| Procurement lifecycle event hash | May be anchored, pending, failed, or not anchored depending on gateway availability. |
| Delivery evidence lifecycle event hash | May be anchored, pending, failed, or not anchored; failed proof must not appear verified. |
| Escrow-created lifecycle event hash | Must be visible as proof metadata; anchoring failure must not delete the escrow event. |
| Audit/export bundle integrity metadata | Bundle hash verification must distinguish verified, mismatch, and not found. |
| Blockchain proof panel | Must never fabricate transaction IDs, block numbers, verified states, or unavailable proof. |

Proof metadata may show transaction ID, channel, chaincode, block number, and anchored timestamp only when an anchor actually exists.

## UAT Checkpoints

| Checkpoint | Pass condition |
|---|---|
| Landing and sign in | Root opens landing page; dashboard requires authenticated session. |
| Role routing | Each actor reaches the correct role-specific dashboard. |
| Administrator governance | Members, Roles, and Access History are accessible only to authorized admin context. |
| Compliance decision | Eligibility changes are visible and raw KYC/AML documents are not exposed. |
| Buyer order | Buyer creates or inspects order and sees lifecycle metadata. |
| Supplier acknowledgement | Supplier accepts only assigned order. |
| Delivery evidence | Supplier records safe evidence metadata for an accepted order; buyer sees evidence hash, lifecycle event, and honest proof state. |
| Escrow creation | Buyer creates escrow from accepted order; non-eligible organizations are blocked. |
| Proof verification | Verified, mismatch, not found, pending, failed, and unavailable states are distinct where applicable. |
| Shariah review | PLS activation depends on an approved Shariah reference. |
| Financier PLS view | Profit/loss scenarios are visible as simulation-only seedbed records. |
| Regulator export | Bundle manifest and integrity verification are visible. |
| Authorization negative cases | Unauthorized actors are hidden from or rejected by protected workflows. |

## Known MVP Limitations

- PLS distribution is a simulation-only seedbed and does not execute payments.
- Escrow is a first-slice workflow and does not automate settlement, release, dispute, or banking rails.
- Fabric proof is local/demo-oriented; a production consortium rollout is post-MVP.
- PostgreSQL runtime persistence is partial and explicitly scoped by runbooks.
- Delivery evidence is an MVP metadata/hash workflow and does not include upload storage, IoT, QR, EPCIS, external logistics APIs, or document rendering.
- Export bundle integrity is MVP metadata, not production signing/key-management infrastructure.
- Security operator workflow is read-only and does not replace SIEM or incident response operations.

## Post-MVP Exclusions

The demo must explicitly exclude:

- production Islamic finance compliance sign-off
- guaranteed profit or guaranteed principal
- real payment settlement
- production ISO20022 payment integration
- full ERP/accounting integration
- DID/VC federation and credential revocation
- tokenized receivables full lifecycle
- full arbitration/dispute module
- multi-jurisdiction policy engine
- full Fabric private data collections
- automated consortium governance

## Developer Notes

Related planning and governance rows: PBI-429, PBI-431, PBI-432, PBI-433, PBI-434, and PBI-435.

Related evidence:

```text
docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
docs/evidence/qa/ACTOR_UAT_RESULTS.md
docs/evidence/qa/RELEASE_VALIDATION_RESULTS.md
```
