# Current Product Baseline

Date: 2026-05-30

## Product Positioning

The product is a compliance-first digital procurement evidence platform with optional procurement-linked PLS / mudarabah financing support.

The deployable MVP centers on a controlled procurement case file:

```text
Visitor
-> sign in
-> organization, role, and eligibility setup
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
