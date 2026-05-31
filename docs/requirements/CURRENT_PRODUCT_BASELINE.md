# Current Product Baseline

Date: 2026-05-31

## Product Position

This repository implements a compliance-first digital procurement and PLS seedbed platform.

The operational system of record is Fastify/PostgreSQL. Hyperledger Fabric is used for selective proof anchoring only.

## Current Readiness

Ready for:

- supervisor demo
- internal technical review
- selected pilot-hardening review

Not ready for:

- production Fabric consortium operation
- commercial deployment
- production payment execution
- bank certification
- production ERP certification
- formal Shariah certification

## Current MVP / Pilot-Hardening Capabilities

- credential-based demo login
- role-based dashboard surfaces
- membership and RBAC workflows
- KYC/AML onboarding and eligibility scaffolding
- procurement order workflow
- delivery evidence metadata/hash workflow
- organization network workspace with safe relationship graph and proof-scope
  vectors
- company-first dashboard context, organization user management, safe company
  settings, and private deal projection read models
- escrow creation and release-readiness workflow
- PLS/Shariah review seedbed support
- audit trail and transaction history
- blockchain proof anchoring and proof visualization
- export bundle metadata and local signing support
- security operator visibility
- deployable Docker Compose foundation
- local email notification outbox for selected workflow events

## Production-Extension Boundary

PBI-438 is Completed for a production-like local Fabric lab and runtime Fabric
Gateway validation. This validates the application's ability to use configured
Fabric proof infrastructure in a controlled lab with external CA/MSP/channel and
chaincode lifecycle material.

This does not claim commercial-ready production Fabric operations, managed
consortium governance, production certificate/key lifecycle, HSM/KMS-backed key
management, production payment execution, or formal Shariah certification.

Remaining Fabric operations gaps before pilot or production-certified claims are
tracked in `docs/architecture/PRODUCTION_FABRIC_OPERATIONS_GAP_REGISTER.md`.

## Canonical Backlog Source

`backlog/backlog.csv` is the single active backlog CSV. It contains the original
MVP backlog and the production-extension PBIs PBI-436 through PBI-462. Historical
roadmap CSVs in `backlog/archive/` are retained only for auditability and should
not be treated as current backlog source-of-truth files.

## Claim Boundaries

Do not claim:

- production Fabric consortium
- production payment execution
- ISO 20022 bank certification
- production ERP integration
- formal Shariah certification
- legal e-signature certification
- fully decentralized procurement

## Product Positioning

The product is a compliance-first digital procurement evidence platform with optional procurement-linked PLS / mudarabah financing support.

The deployable MVP centers on a controlled procurement case file:

```text
Visitor
-> sign in
-> organization, role, and eligibility setup
-> organization network relationship view
-> buyer order
-> supplier acceptance
-> delivery evidence
-> buyer review
-> escrow and release-readiness
-> optional PLS / mudarabah review
-> Shariah decision
-> financier readiness view
-> auditor proof review
-> regulator export bundle
-> security and operator monitoring
```

PostgreSQL and backend services own operational business state. Hyperledger Fabric is used only for selected proof anchoring and audit verification.

## Claim Boundary

The repository may be described as:

```text
A compliance-first procurement evidence platform with blockchain proof anchoring and Shariah-governed PLS seedbed support.
```

Do not describe it as:

- a fully decentralized procurement marketplace
- a production Fabric consortium
- a production payment execution system
- a certified Islamic finance platform
- a tokenized receivables marketplace
- a generic blockchain demo

Current readiness wording:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

## Canonical Actor Set

Mandatory actors:

- Visitor
- Administrator
- Buyer / Procurement Officer
- SME / Supplier
- Compliance Reviewer
- Shariah Reviewer
- Bank / Financier
- Auditor
- Regulator / Reporting User
- Platform Operator
- Developer / Integrator

Should-have actor:

- Security Operator

Seeded demo accounts are documented in `README.md` and `docs/runbooks/local-demo.md`. The product login page remains credential-only.

## Canonical Demo Case

The baseline business case is documented in `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`.

Core organizations:

- Amanah Retail Sdn Bhd as buyer
- Barakah Supplies Sdn Bhd as supplier
- Mabrur Finance Partner as financier

The demo case must stay coherent as a single procurement case rather than a disconnected feature gallery.

## MVP Business State Map

This state map coordinates existing modules. It is not a mandate to create a single wide table.

```text
Procurement case
  onboarding: buyer and supplier eligibility
  order: draft, sentToSupplier, accepted, clarificationRequested, rejected, cancelled
  delivery evidence: notSubmitted, submitted, accepted, clarificationRequested, rejected
  escrow: notCreated, escrowCreated, funded, releaseRequested, settlementInstructionReady, onHold, disputeOpen, refunded, cancelled
  PLS: notApplicable, draft, pendingShariahReview, approvedForActivation, blocked, activeSimulation
  audit: unknown, complete, partial, gapDetected
  proof: notAnchored, pending, anchored, failed, verified, mismatch, notFound, unavailable
  company ledger: noDeal, relationshipOnly, orderProjected, deliveryProjected, escrowProjected, financingProjected
  export bundle: notRequested, requested, generating, ready, failed, signed, invalid, unsupported
```

## Current Runtime Baseline

Frontend:

- React 18
- React DOM
- Vite
- TypeScript

Backend:

- Node.js >= 18
- TypeScript
- Fastify
- REST JSON API under `/api/v1`
- trusted bearer-session actor context for protected routes

Persistence:

- PostgreSQL for deployable runtime
- in-memory repositories remain for tests and selected local/demo paths

Blockchain:

- AuditAnchorContract chaincode
- blockchain anchor gateway abstraction
- in-memory gateway for tests/demo
- Fabric gateway adapter behind explicit configuration

Deployment:

- local developer demo script
- Docker Compose app stack
- deployable smoke script

## In Scope For Current MVP / Pilot-Hardening Foundation

- credential-only login
- seeded demo accounts
- role-specific dashboards
- membership and RBAC governance
- KYC/AML eligibility review
- procurement order and supplier acceptance
- delivery evidence metadata and hash
- organization profile, unique identifier, network relationship request, graph
  projection, proof trail, and local email outbox records
- company dashboard summary, organization-scoped user management, company
  profile maintenance, private deal projection, and restricted Mudarabah
  workflow projection
- escrow creation and release-readiness transitions
- PLS seedbed and Shariah review gate
- financier readiness and distribution scenarios
- audit history and blockchain proof panel
- export bundle manifest and local signature metadata
- security alerts and operational readiness
- document storage/extraction/signature seams
- external API and ERP/accounting adapter foundations
- backup/restore/rollback runbooks

## Out Of Scope Until Explicitly Implemented And Validated

- production Fabric consortium operation
- production payment execution
- ISO 20022 bank certification
- production ERP certification
- full DID / VC federation
- tokenized receivables marketplace
- IoT hardware rollout
- production legal hold automation
- formal Shariah certification
- production HSM / key-management infrastructure
- React Native mobile implementation

## Next Implementation Priority

The next implementation task should be small and evidence-backed. Recommended order:

1. Close documentation baseline validation.
2. Complete canonical actor UAT evidence against the single procurement case.
3. Continue later persistence hardening for document, contract, external API, payment, and ERP/accounting records before any broader pilot claim.
4. Only then expand production extensions that depend on stronger runtime durability.
