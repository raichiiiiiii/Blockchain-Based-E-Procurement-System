# Deployment Smoke Test

Status: Deployment-ready MVP baseline  
Audience: Platform Operator / QA

## Purpose

This smoke test verifies that a fresh local environment can start the MVP, run automated validation, and demonstrate core actor paths without relying on chat history.

## Static Checks

```powershell
npm run build
npm run frontend:build
npm test
git diff --check
```

Expected result: all commands pass. `git diff --check` may print line-ending warnings on Windows; trailing whitespace errors are release blockers.

## Database Checks

```powershell
docker compose config
docker compose up -d postgres
npm run db:migrate -- --dry-run
npm run db:seed -- --dry-run
```

Apply when testing the persistent runtime:

```powershell
$env:DATABASE_URL="postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
$env:DATABASE_SSL_MODE="disable"
$env:DB_MIGRATIONS_ENABLED="true"
$env:DEMO_SEED_ENABLED="true"
npm run db:migrate
npm run db:seed
```

Expected result: migration and seed commands complete, demo users exist, and the backend can be started with `PERSISTENCE_ADAPTER=postgres`.

## Fabric Checks

```powershell
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
```

If a local Fabric test-network is installed:

```powershell
$env:FABRIC_TEST_NETWORK_DIR="C:\path\to\fabric-samples\test-network"
.\scripts\fabric\deploy-audit-anchor.ps1 -TestNetworkPath $env:FABRIC_TEST_NETWORK_DIR
```

Expected result: chaincode tests pass. Live deployment is optional for local smoke when Fabric prerequisites are absent, but the blocker must be recorded.

## Service Startup

```powershell
.\scripts\start-local-demo.ps1
```

Expected result:

```text
Backend API: http://localhost:3100/api/v1
Frontend: http://localhost:5173
```

## Actor Login Smoke

For each demo actor, sign in from the frontend and confirm the expected dashboard navigation:

```text
Administrator: Dashboard, Members, Roles, Access History
Buyer: Dashboard, Orders, Escrow, Blockchain Proof
Supplier: Dashboard, Received Orders, Delivery Evidence, Escrow
Compliance Reviewer: Dashboard, Compliance, Eligibility Status
Shariah Reviewer: Dashboard, Shariah Review
Financier: Dashboard, Financing
Auditor: Dashboard, Audit Trail, Blockchain Proof, Export Bundle
Regulator: Dashboard, Export Bundle, Blockchain Proof
Security Operator: Dashboard, Security Status, Access Alerts, Proof Failures, Denied Actions
```

Anonymous direct access to `/dashboard` must redirect to sign in.

## Product Label Check

Scan the frontend for implementation labels before release:

```powershell
rg -n "PBI-|Sprint|Backlog|Feature lane|User stories|Task list|Roadmap" src/frontend
```

Expected result: no product UI occurrences. Developer docs and evidence may contain these terms.
