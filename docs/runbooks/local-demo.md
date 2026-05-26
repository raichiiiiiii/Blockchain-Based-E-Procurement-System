# Local Demo Runbook

Status: Sprint 7 baseline
Owner: Platform Operator / Developer
Audience: Supervisor demo operator, developer, QA

## Purpose

This runbook starts the local procurement MVP demo and records the current safe demo path. It is intentionally local-first: PostgreSQL is the operational database, Fabric is the proof anchor, and the frontend must use product-facing labels only.

## Prerequisites

- Node.js 18 or newer.
- npm dependencies installed with `npm install`.
- Docker Desktop if PostgreSQL is needed.
- Optional: Hyperledger Fabric samples if running the live Fabric network smoke path.

## Ports

```text
Backend API: http://localhost:3100
Frontend dev server: http://localhost:5173
PostgreSQL: localhost:5432
```

If another frontend dev server is already running, Vite may offer another port. Use the displayed localhost URL.

## Start PostgreSQL

```powershell
docker compose up -d postgres
npm run db:migrate -- --dry-run
npm run db:seed -- --dry-run
```

To apply migrations and seed local demo data, set the local environment values from `.env.example`, then run:

```powershell
$env:DATABASE_URL="postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
$env:DATABASE_SSL_MODE="disable"
$env:DB_MIGRATIONS_ENABLED="true"
$env:DEMO_SEED_ENABLED="true"
npm run db:migrate
npm run db:seed
```

See `docs/runbooks/postgres-local-dev.md` for database details.

## Start Backend

```powershell
$env:PORT="3100"
$env:PERSISTENCE_ADAPTER="postgres"
$env:DATABASE_URL="postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
$env:DATABASE_SSL_MODE="disable"
npm run build
npm run dev
```

The backend exposes REST routes under `/api/v1`. Use `PERSISTENCE_ADAPTER=memory` for a fully in-memory fast demo. Use `PERSISTENCE_ADAPTER=postgres` after migrations and seed have been applied to persist auth/session, membership/RBAC, access audit, procurement lifecycle events, procurement orders, delivery evidence metadata, blockchain anchor metadata, and escrow records. KYC cases, export bundles, Shariah reviews, and PLS contracts currently use in-memory repositories unless their API route is supplied a dedicated adapter.

Document intake stores local files through `DocumentStoragePort`. The default local adapter writes under `.local-documents/` unless `DOCUMENT_STORAGE_DIR` is set. This folder is ignored by git and should not be used as production object storage.

## One-Command Local Startup

On Windows PowerShell, the helper script can start PostgreSQL, apply migrations and seed data, then launch the backend and frontend:

```powershell
.\scripts\start-local-demo.ps1
```

Use `-SkipPostgres` to run a memory-only backend, or `-WithFabric` to add chaincode build/test and optional local Fabric deployment.

## Start Frontend

In a second terminal:

```powershell
$env:VITE_ENABLE_LOCAL_DEMO_FALLBACK="false"
$env:VITE_ENABLE_GUIDED_DEMO="false"
npm run frontend:dev
```

Open the displayed frontend URL. The root route should show the landing page, not an authenticated dashboard. The normal demo path uses backend/database-seeded records. `VITE_ENABLE_LOCAL_DEMO_FALLBACK` is disabled by default and should only be set to `true` for an explicit offline walkthrough when backend services are intentionally unavailable.

## Demo Account Path

After `npm run db:seed`, sign-in supports these database-seeded demo users with password `demo-password`:

```text
admin.demo
buyer.demo
supplier.demo
compliance.demo
shariah.demo
financier.demo
auditor.demo
regulator.demo
security.demo
```

Buyer demonstrable path:

```text
Landing page
-> Sign in
-> Enter buyer.demo / demo-password
-> Dashboard
-> Orders
-> Create order
-> Contract Documents
-> Upload contract text and inspect checksum/extraction/signature state
-> Escrow
-> Create escrow from an accepted order
-> Blockchain Proof panel
```

Supplier demonstrable path:

```text
Landing page
-> Sign in
-> Enter supplier.demo / demo-password
-> Dashboard
-> Received Orders
-> Select assigned order
-> Accept order
-> Delivery Evidence
-> Contract Documents
-> Escrow
```

Compliance reviewer demonstrable path:

```text
Landing page
-> Sign in
-> Enter compliance.demo / demo-password
-> Dashboard
-> Compliance
-> Select pending case
-> Record approve/reject/flag/block decision
-> Eligibility Status
```

Shariah reviewer demonstrable path:

```text
Landing page
-> Sign in
-> Enter shariah.demo / demo-password
-> Dashboard
-> Shariah Review
-> Select a PLS review record
-> Review profit ratio, loss allocation, and checklist metadata
-> Record Approve, Conditional approval, or Reject
-> Confirm financing activation readiness or blocked status changes visibly
```

Financier demonstrable path:

```text
Landing page
-> Sign in
-> Enter financier.demo / demo-password
-> Dashboard
-> Financing
-> Select a PLS contract
-> Inspect Shariah approval reference
-> Activate an approved contract
-> Record profit and loss distribution scenarios
-> Confirm no external payment execution is implied
```

Auditor demonstrable path:

```text
Landing page
-> Sign in
-> Enter auditor.demo / demo-password
-> Dashboard
-> Audit Trail / Blockchain Proof
-> Export Bundle
-> Request export
-> Verify bundle
```

Regulator demonstrable path:

```text
Landing page
-> Sign in
-> Enter regulator.demo / demo-password
-> Dashboard
-> Export Bundle
-> Request export
-> Inspect bundle detail and manifest hashes
-> Verify bundle
-> Blockchain Proof
-> Verify proof
```

Security operator demonstrable path:

```text
Landing page
-> Sign in
-> Enter security.demo / demo-password
-> Dashboard
-> Security Status
-> Access Alerts
-> Proof Failures
-> Denied Actions
```

Administrator demonstrable path:

```text
Landing page
-> Sign in
-> Enter admin.demo / demo-password
-> Dashboard
-> Members
-> Select organization
-> Change organization status
-> Roles
-> Submit role assignment action
-> Access History
```

Role-specific dashboard entry is available for Administrator, Buyer, Supplier, Compliance Reviewer, Shariah Reviewer, Financier, Auditor, Regulator, and Security Operator. The administrator workflow includes member governance, status actions, role assignment controls, and access-history inspection. Buyer and supplier workflows include order creation, received-order acknowledgement, accepted-order escrow readiness, and metadata-only delivery evidence. Escrow creation requires an accepted order or explicit demo accepted-order reference, and buyer/supplier organizations must be eligible. Compliance reviewer workflow includes safe KYC/AML case metadata, decision actions, and downstream eligibility visibility. Shariah reviewer workflow includes PLS checklist metadata and decision controls. Financier workflow includes Shariah-gated PLS activation and profit/loss distribution scenarios. Regulator and auditor workflows include scoped export bundle generation and deterministic bundle-hash verification. Security operator workflow is read-only and shows backend-backed access/proof anomaly metadata when a backend session is active.

The Contract Documents panel lets authorized actors upload text/JSON document content for metadata, checksum, local storage reference, extraction output, and local detached-signature metadata state. PDF and DOCX bytes can be stored, but extraction is explicitly unsupported until a production extractor adapter is connected. The UI must not claim malware scanning, OCR, legal signature validation, or production document management.

## Fabric Proof Path

For chaincode build/test:

```powershell
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
```

For a live Fabric local-network deployment, follow `docs/runbooks/fabric-local-network.md`.

## Validation Commands

Use this baseline before supervisor review:

```powershell
npm run build
npm run frontend:build
npm test
npm run db:migrate -- --dry-run
npm run db:seed -- --dry-run
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
docker compose config
git diff --check
```

If a command depends on unavailable local services, record the attempted command, blocker, release impact, and next action in the relevant QA evidence file.

## Product UI Guardrail

Product screens must not expose backlog, sprint, task, or PBI labels. Acceptable product labels include:

```text
Home
Sign in
Dashboard
Orders
Escrow
Audit Trail
Blockchain Proof
Compliance
Members
Roles
Shariah Review
Financing
Export Bundle
Security Status
Contract Documents
```

## Current Known Limitations

- Mandatory actors can sign in and reach role-specific dashboard entry states. Shariah and financier workflows are demonstrable with restricted PLS seedbed data.
- Delivery evidence is metadata-only; no IoT feeds or QR signature capture are implemented.
- Document intake is local-storage MVP scope only; no production object storage, OCR, PDF/DOCX extraction, malware scanning, or legal e-signature verification is implemented.
- Compliance dashboard uses a local demo case queue until a backend case-list endpoint is added.
- Eligibility gating is implemented for order creation, escrow creation, and PLS activation.
- Fabric live network deployment remains a local/manual path unless the Fabric samples are installed.
- Escrow is an MVP hybrid slice, not production settlement or payment execution.
- PLS workflow is a restricted single-venture seedbed and does not provide production payment rails, guaranteed returns, or full Islamic finance product coverage.
- Export signing is MVP-equivalent manifest and bundle hashing; production signing, key management, and external regulator portal integration are not implemented.
- KYC cases, export bundles, Shariah reviews, and PLS contracts still use in-memory runtime repositories in PostgreSQL mode until dedicated adapters are added.
