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
| Shariah Reviewer | Shariah governance user | Reviews PLS terms, records approval, and maintains certificate artifact coverage for the restricted template. |
| Auditor | Audit user | Inspects audit trail and verifies blockchain proof states. |
| Regulator | Reporting user | Requests export bundle integrity metadata and reviews the detached local software-key signature package. |
| Platform Operator | Local environment operator | Starts services and follows deployment/runbook evidence. |
| Developer / Integrator | API consumer | Authenticates and calls proof, escrow, order, export, or PLS APIs. |
| Security Operator | Should-have security user | Reviews denied actions, proof failures, and access alerts as safe metadata. |

## End-to-End Case Story

1. The Administrator signs in and confirms Amanah Retail, Barakah Supplies, and Mabrur Finance Partner are active member organizations with appropriate roles.
2. The Compliance Reviewer opens the compliance queue and approves Barakah Supplies after reviewing safe KYC/AML metadata.
3. The Buyer opens Organization Network, previews `barakah-supplies`, inspects the Amanah-Barakah relationship vector, and sees proof-scope metadata in the Blockchain Trail panel.
4. The Buyer for Amanah Retail creates an order for Barakah Supplies.
5. The Supplier for Barakah Supplies opens received orders and acknowledges the order.
6. The Buyer or Supplier opens Contract Documents and uploads the Amanah-Barakah contract text for checksum, safe metadata extraction, and local signature-state recording.
7. The Buyer or Supplier opens Contract Negotiation, creates machine-readable terms linked to the document reference, records any revised offer, and accepts the current terms hash.
8. The Supplier records delivery evidence metadata for the accepted order using a safe reference, description, and hash; an external client may also submit signed IoT, QR, or EPCIS-compatible proof metadata through the external API gateway.
9. The Buyer opens the order detail and reviews delivery evidence metadata, lifecycle hash, and proof state without seeing raw commercial documents.
9. The Buyer opens Escrow and creates escrow from the accepted order reference.
10. Escrow creation emits a lifecycle audit event for the escrow-created state.
11. The Buyer can mark the escrow funded, request release after accepted order, delivery evidence, eligibility, and dispute-free checks pass, and approve release into a settlement-instruction-ready state without executing payment.
12. The Buyer or Financier can create a sandbox/manual payment instruction from the settlement-ready escrow, reconcile it to pending, accepted, failed, or settled status without moving money, and export an ISO 20022-like mapping artifact for integration review.
13. If evidence is contested, the Buyer or Supplier can open a dispute and an authorized reviewer can record an arbitration outcome to prepare release, refund, or cancellation.
14. Delivery evidence, escrow lifecycle, and settlement lifecycle events are anchored when the proof gateway is available, or remain proof-ready/pending/failed with honest proof states.
15. The Auditor opens Blockchain Proof or an event detail and verifies the proof without fabricated transaction data.
16. The Shariah Reviewer opens Shariah Review, inspects PLS metadata, approves the restricted seedbed terms, and confirms active certificate artifact coverage for the template.
17. The Financier opens Financing, verifies the Shariah approval and certificate artifact references, and views profit/loss distribution scenarios.
18. The Regulator opens Export Bundle, requests the scoped evidence bundle, signs the manifest with the local software-key profile, and verifies the detached signature metadata for offline review.
19. The Administrator or integrator calls the ERP/accounting adapter API to export local JSON mapping evidence for the accepted order, contract release package, or payment status without external posting.

## Expected Seed Data

The normal local demo path expects `npm run db:seed` to create backend/database records for the actors, credentials, organizations, procurement case, delivery evidence, escrow, lifecycle events, and proof metadata. Browser-local fallback data is disabled by default and is only an explicit offline walkthrough aid.

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
| Contract document | Amanah-Barakah contract text with checksum, extracted parties/terms, explicit malware scan state, and local signature metadata state |
| Machine-readable contract | Contract number, buyer/supplier/financier parties, line item, delivery terms, acceptance criteria, escrow release conditions, PLS seedbed terms, linked document reference, UBL/OCDS mapping references, version, and terms hash |
| Escrow record | Escrow-created state linked to the accepted order reference |
| PLS contract | Restricted seedbed contract linked to the procurement case, Shariah approval reference, certificate artifact reference, and distribution examples |
| Export bundle | Combined audit scope with manifest hash, verification metadata, and detached local software-key signature package metadata |
| ERP/accounting mapping | Local JSON export job for UBL/Peppol-like order or invoice mapping, OCDS-like contract release, or payment status |
| Organization Network | Amanah-Barakah buyer/supplier relationship, Mabrur-Amanah financing relationship, proof-scope vectors, and local email outbox notifications |

Seed data should avoid raw KYC documents, raw escrow terms, payment credentials, and private commercial documents in visible dashboard cards.

## Expected Screen and Route Per Actor

| Actor | Entry | Expected screen or route | Expected result |
|---|---|---|---|
| Administrator | Sign in | Dashboard, Members, Roles, Access History | Organizations and role controls are visible; non-admin workflow controls are not shown. |
| Buyer | Sign in | Dashboard, Organization Network, Orders, Contract Documents, Contract Negotiation, Escrow, Blockchain Proof | Buyer previews organization relationships, creates order, records or reviews contract metadata, accepts current terms, reviews delivery evidence metadata, creates escrow from accepted order, and sees proof metadata. |
| Supplier | Sign in | Dashboard, Received Orders, Delivery Evidence, Contract Documents, Contract Negotiation, Escrow | Supplier acknowledges assigned order, submits or accepts negotiated terms, and submits safe delivery evidence metadata. |
| Compliance Reviewer | Sign in | Dashboard, Compliance, Eligibility Status | Reviewer records decision and eligibility state is visible downstream. |
| Shariah Reviewer | Sign in | Dashboard, Shariah Review | Reviewer inspects checklist metadata, records a decision, and registers certificate artifact coverage. |
| Financier | Sign in | Dashboard, Financing | Financier inspects approved PLS contract, certificate coverage, and distribution scenarios. |
| Auditor | Sign in | Dashboard, Audit Trail, Blockchain Proof, Export Bundle | Auditor verifies proof and inspects export evidence read-only. |
| Regulator | Sign in | Dashboard, Export Bundle, Blockchain Proof | Regulator requests export, signs the manifest, and verifies integrity metadata. |
| Platform Operator | Runbook | Local demo startup path | Services start or blockers are documented. |
| Developer / Integrator | API quickstart | Local API base URL | Authenticated API calls return documented envelopes. |
| Security Operator | Sign in | Dashboard, Security Status, Access Alerts, Proof Failures, Denied Actions | Security user reviews read-only anomaly metadata. |

## Expected Backend and API Dependency Per Actor

| Actor | Backend or API dependency |
|---|---|
| Administrator | Auth session, membership routes, role routes, access history query. |
| Buyer | Auth session, procurement order routes, delivery evidence read route, eligibility gate, escrow routes, blockchain proof endpoint. |
| Supplier | Auth session, procurement order list/detail, acknowledgement route, delivery evidence submit/read routes, document metadata route, contract negotiation route, ownership authorization. |
| Compliance Reviewer | Auth session, KYC/AML case routes, eligibility/status history route, redaction policy. |
| Shariah Reviewer | Auth session, PLS review and decision service, certificate artifact registry, financing read model. |
| Financier | Auth session, PLS activation gate, certificate coverage check, distribution scenario service, eligibility gate. |
| Auditor | Auth session, audit trail, blockchain anchor lookup, verification endpoint, export bundle route. |
| Regulator | Auth session, export bundle generation, bundle verification endpoint, export signing endpoint, proof read path. |
| Platform Operator | Local demo script, PostgreSQL migration/seed path, Fabric chaincode build/test path. |
| Developer / Integrator | Auth API, documented REST endpoints, shared error envelope. |
| Security Operator | Auth session, read-only security status UI, proof failure and denied-action metadata. |

## Required Audit Events

The demo should be able to explain or inspect these events as governed actions:

| Event | Trigger | Evidence expectation |
|---|---|---|
| Organization status reviewed or changed | Administrator governance action | Actor, organization, status, timestamp, and outcome are recorded. |
| Role assignment action | Administrator role action | Actor, role, target user or organization, and outcome are recorded. |
| Network request sent or accepted | Organization user requests or accepts relationship establishment | Safe request metadata, relationship state, graph projection, and local email outbox record exist without private documents. |
| Compliance decision recorded | Reviewer approves, rejects, flags, or blocks case | Eligibility state changes without exposing raw KYC/AML payloads. |
| Order created | Buyer creates order | Procurement lifecycle event and payload hash metadata exist. |
| Order acknowledged | Supplier accepts assigned order | Lifecycle event shows supplier action and order status. |
| Delivery evidence submitted | Supplier records safe delivery evidence for an accepted order | `deliveryEvidenceSubmitted` lifecycle event, evidence hash, and proof state exist without raw document payloads. |
| External delivery proof submitted | Signed IoT or QR external client records proof metadata for an accepted order | `deliveryProofSubmitted` lifecycle event, evidence hash, and proof state exist without storing raw external payloads. |
| Logistics visibility event recorded | Signed EPCIS-compatible external client records visibility metadata | `logisticsEventRecorded` lifecycle event, evidence hash, and proof state exist without claiming a full EPCIS repository. |
| Contract document recorded | Buyer or Supplier uploads contract text for extraction | Document checksum, storage reference, extraction status, and signature status are recorded without raw document exposure in dashboard proof surfaces. |
| Contract terms created or accepted | Buyer or Supplier versions terms and records acceptance | Terms hash, offer record, acceptance party, actor, timestamp, and lifecycle event are recorded without implying legal signing or payment execution. |
| Escrow created | Buyer creates escrow from accepted order | Escrow-created lifecycle event exists. |
| Proof verified | Auditor or regulator verifies proof | Verification status is recorded or visible as evidence metadata. |
| Shariah decision recorded | Reviewer approves, conditionally approves, or rejects | Decision trail supports PLS activation gate. |
| Shariah certificate artifact registered | Reviewer registers active template coverage | Certificate hash and conditions support activation gate without claiming external certification. |
| PLS activated or distribution scenario recorded | Financier acts on approved contract | Seedbed allocation event is recorded without implying payment execution. |
| Export bundle requested, signed, or verified | Regulator or auditor requests/verifies bundle | Manifest hash, detached signature state, and verification state are visible. |
| ERP/accounting artifact exported | Administrator or integrator requests local adapter export | Mapping job records profile, source id, claim boundary, and mapping errors where applicable. |
| Denied action | Unauthorized actor attempts protected action | Denial is captured for audit/security review where implemented. |

## Required Blockchain Proof Points

| Proof point | Expected state handling |
|---|---|
| Procurement lifecycle event hash | May be anchored, pending, failed, or not anchored depending on gateway availability. |
| Delivery evidence lifecycle event hash | May be anchored, pending, failed, or not anchored; failed proof must not appear verified. |
| Escrow-created lifecycle event hash | Must be visible as proof metadata; anchoring failure must not delete the escrow event. |
| Audit/export bundle integrity metadata | Bundle hash and detached signature verification must distinguish verified, mismatch/invalid, and not found. |
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
| Contract documents | Authorized actor uploads contract text; document checksum, extraction fields, and local signature status are visible without legal signature overclaiming. |
| Contract negotiation | Buyer or Supplier creates machine-readable terms, submits a revised offer, and records party acceptance against the current terms hash. |
| Escrow lifecycle | Buyer creates escrow from accepted order; release actions require delivery evidence, eligibility, and dispute-free conditions; disputes and arbitration outcomes are audit-recorded. |
| Payment instruction | Buyer or financier creates sandbox/manual settlement instruction; reconciliation status is auditable and does not imply bank execution. |
| ISO 20022 mapping | Authorized reviewer exports payment initiation/status JSON for mapping review only; no bank execution or certification is claimed. |
| Proof verification | Verified, mismatch, not found, pending, failed, and unavailable states are distinct where applicable. |
| Shariah review | PLS activation depends on an approved Shariah reference and active certificate artifact coverage. |
| Financier PLS view | Profit/loss scenarios are visible as simulation-only seedbed records. |
| Regulator export | Bundle manifest, detached local software-key signature, and integrity verification are visible. |
| ERP/accounting adapter | Local JSON mapping jobs are visible via API evidence and do not imply external posting. |
| Authorization negative cases | Unauthorized actors are hidden from or rejected by protected workflows. |

## Known MVP Limitations

- PLS distribution is a simulation-only seedbed and does not execute payments.
- Shariah certificate artifacts are internal governance records only; external certification issuance, legal attestation, and production Islamic finance compliance remain post-MVP.
- Escrow now includes an MVP release/dispute workflow, but it only prepares settlement instruction state and does not execute real payment, bank settlement, or external arbitration integration.
- Payment adapter support is sandbox/manual only and records auditable status evidence; it does not connect to banks or execute ISO 20022 payment rails.
- ISO 20022 support is mapping-only JSON for integration review; it does not submit bank messages or provide certification.
- Fabric proof is local/demo-oriented; a production consortium rollout is post-MVP.
- PostgreSQL runtime persistence is partial and explicitly scoped by runbooks.
- Delivery evidence now includes signed external IoT/QR/EPCIS-compatible metadata intake, but not production device PKI, QR legal signature verification, full EPCIS capture/query services, external logistics network integration, or document rendering.
- Document intake stores local files and extracts text/JSON only; PDF/DOCX extraction, OCR, malware scanning, and legal e-signature verification remain post-MVP.
- Contract negotiation uses in-memory contract records in this slice; production redlining, legal signing, PostgreSQL persistence, ERP mapping exports, and automatic order/escrow creation remain future work.
- Export signing uses a local software-key detached manifest signature and offline package metadata; production KMS/HSM custody, legal attestation, certificate authority lifecycle, and external regulator portal integration remain future work.
- ERP/accounting adapter produces local JSON mapping artifacts only; production ERP connection, Peppol access point delivery, UBL XML certification, and tax reporting remain future work.
- Organization Network is a safe metadata and proof-scope view. It does not create production Fabric consortium membership, replace KYC/AML eligibility, share raw commercial documents, or establish ERP partner connectivity.
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
- external arbitration integration
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
