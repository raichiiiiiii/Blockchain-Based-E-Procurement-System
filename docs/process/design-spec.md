# Design Focus Specification
# Blockchain E-Procurement and PLS Financing Seedbed Prototype

Status: Draft
Purpose: Figma prototype direction and UX blueprint
Target output: Web + mobile clickable prototype
Design fidelity: High-quality low fidelity
Primary audience: Supervisor, development team, project stakeholders

Repository reference:
https://github.com/raichiiiiiii/Blockchain-Based-E-Procurement-System

Use the repository as the external source of truth for system context, stakeholders, backlog scope, architecture, contracts, and Sprint 6 planning.

Key repository references:
- backlog/backlog.csv
- backlog/sprint6-backlog-append.csv
- backlog/plan.mermaid
- docs/report/srs-v3.tex
- docs/drafts/Pre-SRS-v3.pdf
- docs/drafts/business_proposal_digital_procurement_pls_seedbed.pdf
- docs/process/pbi-guideline.tex
- docs/process/CODING_RULES.md
- docs/architecture/ARCHITECTURE.md
- docs/architecture/FRONTEND_RUNWAY.md
- docs/architecture/STATE_MODELS.md
- docs/architecture/DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md
- docs/architecture/dashboard-state-flow.mermaid
- docs/architecture/FRONTEND_PRODUCT_JOURNEY.md
- docs/architecture/FABRIC_MVP_BOUNDARY.md
- docs/architecture/BLOCKCHAIN_PROOF_UI_CONTRACT.md
- docs/architecture/ESCROW_SMART_CONTRACT_BOUNDARY.md
- docs/contracts/API_CONTRACTS.md
- docs/contracts/AUTH_SESSION_CONTRACT.md
- docs/contracts/TRANSACTION_HISTORY_CONTRACT.md
- docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md
- docs/contracts/ESCROW_WORKFLOW_CONTRACT.md
- docs/sprint-planning/SPRINT5_TASKS.md
- docs/sprint-planning/SPRINT6_TASKS.md


1. System Context

The product is a blockchain-based e-procurement and Islamic PLS financing seedbed.

The system supports a procurement lifecycle involving buyer, supplier, and financier actors. It also includes governance actors such as auditor, compliance reviewer, Shariah reviewer, administrator, security operator, and potentially regulator/export users.

The system should communicate these major capabilities:

1. Organization onboarding and identity/role governance.
2. KYC/AML review and compliance approval.
3. Role-based access to operational dashboards.
4. Procurement order and escrow workflow.
5. Immutable audit trail for procure-to-pay and access events.
6. Hyperledger Fabric based blockchain proof anchoring.
7. Audit event verification using payload hash and Fabric transaction metadata.
8. Shariah review for PLS financing workflows.
9. PLS contract and distribution concept.
10. Signed regulator/audit export bundle concept.

The prototype must represent the system as a real application, not as a project-management interface.


2. Stakeholder Context

Stakeholders and actors should be derived from the repository backlog, SRS, and architecture documents.

Primary user-facing actors:

- Buyer
  Uses procurement order, order acceptance, escrow status, and blockchain proof visibility.

- Supplier
  Receives purchase orders, tracks delivery/evidence status, and views escrow/payment status.

- Financier
  Reviews financing applications, PLS contract status, receivable/financing concepts, and distribution history.

- Auditor
  Searches audit trails, opens audit event details, checks immutable reference data, and verifies blockchain proof.

- Compliance Reviewer
  Reviews KYC/AML onboarding cases, risk status, organization approval, rejection, or revision.

- Shariah Reviewer
  Reviews PLS contract structure, profit-sharing terms, loss allocation, Shariah checklist, and approval decisions.

- Administrator
  Manages member organizations, users, roles, role assignments, activation/deactivation, and access governance.

- Security Operator
  Sees security-related status or placeholder investigation tools without gaining auditor-only audit search privileges.

- Regulator / Reporting User
  Requests signed audit export bundles, verifies export integrity, and reviews included proof metadata.

Non-user technical stakeholders:

- Development team
- Scrum Master / Product Owner
- Supervisor / evaluator
- Architecture reviewer
- QA reviewer

The prototype must primarily serve the supervisor/evaluator and development team as a shared blueprint before implementation.


3. Design Objective

The prototype must communicate the system as a real blockchain-based e-procurement and Islamic PLS financing application.

The prototype is not:
- a backlog visualizer
- a sprint board
- a developer dashboard
- a generic admin template
- a collection of disconnected cards

The intended product story is:

Visitor lands on product page
-> signs in using a demo account
-> enters a role-based dashboard
-> performs or views a procurement workflow
-> sees escrow / audit state
-> verifies blockchain proof

The design must make these points immediately understandable:

1. This is a procurement system.
2. The system has different users and roles.
3. Users authenticate before accessing dashboards.
4. Procurement events are auditable.
5. Escrow is part of the transaction workflow.
6. Blockchain is visible through proof anchoring and verification.
7. Islamic PLS financing and Shariah review are part of the domain.
8. Compliance, audit, and governance are first-class workflows.


4. Design Focus Priorities

Priority 1 — Product credibility

The interface must look like a functioning fintech / governance platform.

Focus on:
- clear landing page
- professional login flow
- clean role dashboard
- real workflow pages
- credible data tables
- status badges
- audit/proof details
- organization and role context
- realistic domain data

Avoid:
- generic cards with no workflow meaning
- empty dashboards
- placeholder-heavy screens without explanation
- developer labels
- PBI/task/sprint wording
- showing backlog implementation structure as navigation


Priority 2 — Workflow clarity

Each screen must answer:

- Who is using this screen?
- What is their role?
- Which organization are they acting for?
- What decision or action can they take?
- What state is the workflow in?
- What happens next?
- Is there audit or blockchain proof attached?

Bad screen pattern:
- “Here are PBI-006 tasks”
- “Here are Sprint 6 features”
- “Blockchain enabler card”

Correct screen pattern:
- “Buyer views accepted order”
- “Buyer creates escrow”
- “Auditor verifies event proof”
- “Compliance reviewer approves KYC case”
- “Shariah reviewer reviews PLS contract”
- “Administrator manages role assignment”


Priority 3 — Blockchain visibility

Blockchain must not be hidden in backend architecture.

The prototype must visibly show blockchain through:

- Blockchain Proof Panel
- payload hash
- Fabric transaction ID
- channel
- chaincode
- anchor status
- verify proof button
- verification result
- mismatch / unavailable / not found states

Do not create a separate fake “Blockchain Module” page unless it serves a real user workflow.

Blockchain should appear where proof matters:

- audit event detail
- escrow detail
- regulator export bundle
- PLS/distribution proof reference


Priority 4 — Role-based experience

Each role must feel different.

Minimum role coverage:

- Buyer
- Supplier
- Financier
- Auditor
- Compliance Reviewer
- Shariah Reviewer
- Administrator
- Security Operator
- Regulator / Reporting User, if treated as part of prototype scope

The dashboard must not be one generic dashboard with role labels swapped.

Each role should have:

- role-specific summary cards
- role-specific actions
- role-specific navigation emphasis
- role-specific empty/blocked states
- role-specific workflow detail pages


Priority 5 — Web and mobile parity

The prototype must include both:

- desktop web prototype
- mobile prototype

They do not need identical layouts, but both must support the same core story:

landing
-> login
-> role dashboard
-> workflow detail
-> blockchain proof / verification
-> blocked or error state


5. Product Language Rules

Allowed product labels:

- Home
- Sign in
- Dashboard
- Orders
- Escrow
- Audit Trail
- Blockchain Proof
- Compliance
- Shariah Review
- Financing
- Members
- Roles
- Settings
- Logout
- Verify Proof
- Export Bundle
- KYC Review
- PLS Contract
- Distribution
- Member Organizations
- Access History

Forbidden product labels:

- PBI-006
- PBI-333
- Sprint 6
- User Story
- Task
- Enabler
- Backlog
- Acceptance Criteria
- Feature Lane
- Implementation Slice

These terms may appear only in documentation outside the prototype screens.


6. Visual Direction

Style:
- high-quality low fidelity
- professional
- institutional
- fintech/governance-oriented
- calm and structured

Palette:
- primary dark: blue-black / navy
- background: white or very light gray
- surface: white cards
- accent: muted blue
- status colors: restrained semantic badges

Avoid:
- overly bright colors
- playful startup styling
- decorative cards without functional meaning
- fake charts with no relationship to workflow

Typography:
- large page titles
- medium section headings
- compact metadata labels
- readable table text
- monospace for hashes and transaction IDs

Layout personality:

The app should feel like:
- procurement platform
- compliance portal
- audit console
- financial workflow system
- governance dashboard

It should not feel like:
- marketing-only website
- student assignment board
- project management app
- generic admin template


7. Core Component System

Global components:

- App Shell
- Sidebar Navigation
- Top Bar
- Mobile Top App Bar
- Mobile Bottom Navigation
- Mobile Drawer
- Page Header
- Role Context Header
- Organization Context Badge
- Status Badge
- Action Button
- Secondary Button
- Data Table
- List Card
- Timeline
- Empty State
- Error State
- Blocked State
- Loading State
- Confirmation Modal

Domain components:

- Order Summary Card
- Escrow Status Panel
- Audit Event Detail Panel
- Blockchain Proof Panel
- KYC/AML Case Panel
- Shariah Review Checklist
- PLS Contract Summary
- Distribution Record Panel
- Regulator Export Bundle Panel
- Member Organization Panel
- Role Assignment Panel
- Delivery Evidence Placeholder Panel


8. Required Design States

Authentication states:
- anonymous
- authenticating
- authenticated
- invalid credentials
- session expired
- logged out

Dashboard states:
- loading
- ready
- no role assigned
- unsupported role
- pending organization review
- inactive user
- suspended organization
- forbidden action
- backend unavailable

Blockchain proof states:
- not anchored
- pending
- anchored
- failed
- verifying
- verified
- mismatch
- not found
- unavailable

Workflow states:
- draft
- pending review
- accepted
- escrow created
- release pending
- approved
- rejected
- revision requested
- export generating
- export ready


9. Primary Demo Flow

The most important clickable path is:

Landing Page
-> Login Page
-> Login as Buyer
-> Buyer Dashboard
-> Order Detail
-> Escrow Detail
-> Verify Blockchain Proof
-> Proof Verified State

Buyer flow design focus:
- active procurement orders
- order acceptance
- escrow creation
- escrow status
- audit event linkage
- blockchain proof

Buyer must not see auditor-only controls such as broad audit search.


10. Secondary Demo Flow

The second most important clickable path is:

Landing Page
-> Login Page
-> Login as Auditor
-> Auditor Dashboard
-> Audit Trail Search
-> Audit Event Detail
-> Verify Blockchain Proof
-> Verified / Mismatch / Unavailable State

Auditor flow design focus:
- traceability
- actor/action/target metadata
- timestamp
- payload hash
- previous event hash
- Fabric transaction reference
- verification result
- lifecycle sequence

This is the clearest “blockchain application” flow.


11. Supporting Role Flows

Compliance Reviewer

Purpose:
KYC/AML review and organization onboarding decision.

Required screens:
- Compliance Dashboard
- KYC/AML Case Detail
- Organization Pending Review State

Design focus:
- risk status
- review checklist
- decision action
- audit history
- organization lifecycle state


Shariah Reviewer

Purpose:
Review Islamic PLS contracts and financing structures.

Required screens:
- Shariah Dashboard
- PLS Review Detail
- PLS Contract Approval State

Design focus:
- profit-sharing terms
- loss allocation
- Shariah checklist
- approve / reject / request revision
- linked audit proof


Financier

Purpose:
View financing applications, PLS contracts, and distribution records.

Required screens:
- Financier Dashboard
- PLS Contract Detail
- PLS Distribution Detail

Design focus:
- contract status
- linked procurement
- approved Shariah review
- distribution history
- audit/proof reference


Supplier

Purpose:
View received orders, delivery status, evidence, and escrow/payment status.

Required screens:
- Supplier Dashboard
- Supplier Order Detail
- Delivery Evidence Placeholder

Design focus:
- orders received
- delivery milestone
- evidence status
- linked escrow state
- release condition placeholder


Administrator

Purpose:
Manage members, organizations, users, and role assignments.

Required screens:
- Admin Dashboard
- Member Organization List
- Member Organization Detail
- Role Assignment Detail

Design focus:
- organization status
- active users
- role assignments
- revoked roles
- deactivation / suspension
- access history link


Security Operator

Purpose:
Show security role honestly without pretending unsupported audit permissions exist.

Required screens:
- Security Operator Dashboard
- Investigation Placeholder / Limited Access State

Design focus:
- security alerts placeholder
- investigation unavailable state
- clear backend-contract-pending message
- no auditor-only search access unless auditor role exists


Regulator / Reporting User

Purpose:
Represent regulator audit reporting and signed export bundle workflow.

Required screens:
- Regulator Export Request
- Signed Audit Export Bundle Detail
- Bundle Verification State

Design focus:
- date range
- module filter
- event count
- signature status
- bundle hash
- included blockchain proof metadata
- download bundle
- verify bundle integrity


12. Screen Inventory

Desktop Web Frames:

W01 Landing Page
W02 Login Page
W03 Buyer Dashboard
W04 Buyer Order Detail
W05 Escrow Detail with Blockchain Proof
W06 Auditor Dashboard
W07 Audit Trail Search
W08 Audit Event Detail with Blockchain Proof
W09 Compliance Dashboard
W10 KYC/AML Case Detail
W11 Shariah Reviewer Dashboard
W12 PLS Review Detail
W13 Supplier Dashboard
W14 Financier Dashboard
W15 Administrator Dashboard
W16 Global State Screens
W17 Member Organization List
W18 Member / Role Assignment Detail
W19 Regulator Export Request
W20 Signed Audit Export Bundle Detail
W21 PLS Contract Activation Detail
W22 PLS Distribution Detail
W23 Security Operator Dashboard / Placeholder
W24 Organization Pending Review Dashboard State
W25 Access Blocked / Inactive User State
W26 Supplier Delivery Evidence Placeholder

Mobile Frames:

M01 Mobile Landing Page
M02 Mobile Login
M03 Mobile Buyer Dashboard
M04 Mobile Order Detail
M05 Mobile Escrow Proof Detail
M06 Mobile Auditor Dashboard
M07 Mobile Audit Event Proof Detail
M08 Mobile Compliance Case Detail
M09 Mobile Shariah Review Detail
M10 Mobile Navigation Drawer / Bottom Navigation
M11 Mobile Blocked / Pending / Error State
M12 Mobile Admin Member Detail
M13 Mobile Regulator Export Bundle Detail
M14 Mobile PLS Contract Detail
M15 Mobile PLS Distribution Detail
M16 Mobile Security Operator Placeholder
M17 Mobile Supplier Delivery Evidence Placeholder


13. Clickable Prototype Map

Landing Page
└── Sign in -> Login Page

Login Page
├── Buyer demo -> Buyer Dashboard
├── Auditor demo -> Auditor Dashboard
├── Compliance demo -> Compliance Dashboard
├── Shariah demo -> Shariah Dashboard
├── Supplier demo -> Supplier Dashboard
├── Financier demo -> Financier Dashboard
├── Administrator demo -> Administrator Dashboard
└── Security demo -> Security Operator Dashboard

Buyer Dashboard
└── View order -> Buyer Order Detail
    └── View escrow -> Escrow Detail
        └── Verify proof -> Verified Proof State

Auditor Dashboard
└── Search audit trail -> Audit Trail Search
    └── Open event -> Audit Event Detail
        ├── Verify proof -> Verified State
        ├── Simulate mismatch -> Mismatch State
        └── Simulate unavailable -> Unavailable State

Compliance Dashboard
└── Open KYC case -> KYC/AML Case Detail
    ├── Approve -> Approved State
    ├── Reject -> Rejected State
    └── Request revision -> Revision State

Shariah Dashboard
└── Open PLS review -> PLS Review Detail
    ├── Approve -> PLS Approved State
    ├── Reject -> Rejected State
    └── Request revision -> Revision State

Administrator Dashboard
└── Members -> Member Organization List
    └── Open member -> Member / Role Assignment Detail

Financier Dashboard
└── Open PLS contract -> PLS Contract Activation Detail
    └── View distribution -> PLS Distribution Detail

Supplier Dashboard
└── Open order -> Supplier Delivery Evidence Placeholder

Regulator Export
└── Generate export -> Signed Audit Export Bundle Detail
    └── Verify bundle -> Verification Passed / Failed State


14. Data Realism Rules

Use realistic but safe sample data.

Example domain labels:
- Amanah Retail Sdn Bhd
- Barakah Supplies Sdn Bhd
- Mabrur Finance Partner
- Order PO-2026-0142
- Escrow ESC-2026-0088
- Audit Event EVT-8F21A
- Fabric Tx 9f3a...b71c
- Channel procurement-channel
- Chaincode audit-anchor

Hash display format:
sha256: 8f2a91c4...e2b779aa

Do not fill pages with long unreadable hashes unless a detail panel requires it.

Use truncated hash display with copy affordance.


15. Mobile Design Focus

Mobile is not just scaled-down desktop.

Mobile should prioritize:
- quick status recognition
- stacked cards
- bottom navigation
- large tap targets
- shorter tables converted to lists
- proof panel collapsed sections
- clear primary action

Examples:
- Desktop audit table -> Mobile audit event cards
- Desktop sidebar -> Mobile bottom nav + drawer
- Desktop proof panel -> Mobile accordion proof detail
- Desktop dashboard grid -> Mobile stacked status cards


16. Design Acceptance Criteria

The prototype is acceptable only if:

1. The root screen is a landing page, not dashboard.
2. Login precedes dashboard access.
3. Buyer can reach order, escrow, and blockchain proof.
4. Auditor can search audit events and verify blockchain proof.
5. Compliance reviewer can review KYC/AML case.
6. Shariah reviewer can review PLS contract.
7. Administrator can view members and role assignments.
8. Financier can view PLS contract and distribution concept.
9. Supplier can view order and delivery/evidence concept.
10. Security operator sees honest limited/placeholder state.
11. Regulator export bundle flow exists.
12. Web and mobile both support the main demo journey.
13. No UI screen exposes PBI, sprint, story, or task labels.
14. Blockchain proof is visible and understandable.
15. Blocked, pending, empty, error, and unavailable states are represented.
16. Stakeholder roles and system context are traceable back to repository docs and backlog.


17. User Story Coverage Principle

The prototype does not need one screen per backlog item.

Coverage is achieved when the user-facing intention of a backlog story appears as a realistic product screen, flow, state, or interaction.

Technical enablers such as PostgreSQL setup, Fabric deployment scripts, backend gateways, and migration runners do not need standalone user screens. They are represented through user-visible outcomes:
- records persist
- audit history exists
- proof status exists
- Fabric transaction ID exists
- verification result exists
- export bundle is generated
- escrow status is traceable


18. Backlog Coverage Mapping

PBI-002 — KYC and AML onboarding workflow
Covered by:
- Compliance Dashboard
- KYC/AML Case Detail
- Organization Pending Review State
Coverage level: Strong

PBI-003 — Permissioned membership and role management
Covered by:
- Administrator Dashboard
- Member Organization List
- Member / Role Assignment Detail
- Access blocked / inactive user state
Coverage level: Strong

PBI-005 — Immutable audit trail for procure-to-pay events
Covered by:
- Audit Trail Search
- Audit Event Detail
- Lifecycle Sequence
- Payload Hash display
Coverage level: Strong

PBI-006 — Order acceptance and escrow contract workflow
Covered by:
- Buyer Order Detail
- Escrow Detail
- Escrow Created state
- Blockchain Proof Panel
Coverage level: Strong for first slice, partial for full release/dispute workflow

PBI-007 — PLS contract model and distribution workflow
Covered by:
- Financier Dashboard
- PLS Contract Activation Detail
- PLS Distribution Detail
- Shariah approval dependency
Coverage level: Moderate to strong at prototype level

PBI-015 — Regulator audit reporting and signed export bundle
Covered by:
- Regulator Export Request
- Signed Audit Export Bundle Detail
- Verify Bundle Integrity state
Coverage level: Strong after export screens are included

PBI-017 — Role-based UI and operational dashboards
Covered by:
- all role dashboards
- global app shell
- protected dashboard routing
Coverage level: Strong

PBI-020 — Shariah governance workflow
Covered by:
- Shariah Reviewer Dashboard
- PLS Review Detail
- approval / rejection / revision states
Coverage level: Strong

PBI-022 — Access logging and cryptographic non-repudiation
Covered by:
- Audit Event Detail
- Actor / Action / Target metadata
- Payload Hash
- Previous Event Hash
- Blockchain Proof Panel
Coverage level: Strong

PBI-253 — Auth/session management
Covered by:
- Login Page
- Demo Account Selector
- Logout
- Session Expired State
- Protected Dashboard Access
Coverage level: Strong

PBI-263 — Product entry/login/dashboard journey
Covered by:
- Landing Page
- Login Page
- Protected Dashboard
Coverage level: Strong

PBI-282 — Dashboard UX and state-flow correction
Covered by:
- Global App Shell
- role dashboards
- blocked / pending / no-role / error states
Coverage level: Strong

PBI-296 — PostgreSQL persistence baseline
Covered indirectly by:
- persisted demo records
- login/session continuity
- event history
- audit records
Coverage level: Not a direct UI story; represented through system behavior

PBI-309 — Fabric sandbox and AuditAnchor smart contract baseline
Covered by:
- Fabric transaction ID
- channel
- chaincode
- proof status
- verify proof result
Coverage level: Strong through proof UI

PBI-323 — Backend blockchain anchoring gateway and proof API
Covered by:
- Verify Proof interaction
- proof result states
- unavailable/mismatch/notFound states
Coverage level: Strong through interaction outcome

PBI-333 — Blockchain proof viewer
Covered by:
- Blockchain Proof Panel
- Audit Event Detail
- Escrow Detail
- Verify Proof action
Coverage level: Strong


19. Final Design Focus Statement

The prototype should make the evaluator think:

This is a real procurement platform.
The roles are clear.
The workflow is understandable.
The audit trail is credible.
The blockchain proof is visible.
The Islamic financing/PLS concept is represented.
The system is ready to be implemented from this blueprint.

It should not make the evaluator think:

This is a sprint board.
This is a collection of disconnected cards.
This is a backend project with random UI.
This is blockchain only in name.
The user interface was generated from backlog rows instead of real user workflows.
