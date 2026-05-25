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
Backend API: http://localhost:3000
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
npm run build
npm run dev
```

The backend exposes REST routes under `/api/v1`.

## Start Frontend

In a second terminal:

```powershell
npm run frontend:dev
```

Open the displayed frontend URL. The root route should show the landing page, not an authenticated dashboard.

## Demo Account Path

Sign-in supports these demo users with password `demo-password`:

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
-> Continue as Buyer
-> Dashboard
-> Escrow
-> Create escrow
-> Blockchain Proof panel
```

Auditor demonstrable path:

```text
Landing page
-> Sign in
-> Continue as Auditor
-> Dashboard
-> Audit Trail / Blockchain Proof
```

Administrator demonstrable path:

```text
Landing page
-> Sign in
-> Continue as Administrator
-> Dashboard
-> Members
-> Select organization
-> Change organization status
-> Roles
-> Submit role assignment action
-> Access History
```

Role-specific dashboard entry is available for Administrator, Buyer, Supplier, Compliance Reviewer, Shariah Reviewer, Financier, Auditor, Regulator, and Security Operator. The administrator workflow now includes member governance, status actions, role assignment controls, and access-history inspection. Some non-administrator workflow surfaces remain status-only until their backend routes are completed.

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
```

## Current Known Limitations

- Mandatory actors can sign in and reach role-specific dashboard entry states, but supplier, compliance, Shariah, financier, and regulator workflows are not complete yet.
- Fabric live network deployment remains a local/manual path unless the Fabric samples are installed.
- Escrow is an MVP hybrid slice, not production settlement or payment execution.
- PLS workflow is not yet actor-complete.
- Regulator export bundle workflow is not yet implemented.
