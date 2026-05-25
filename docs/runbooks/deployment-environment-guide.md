# Deployment Environment Guide

Status: Deployment-ready MVP baseline  
Audience: Platform Operator / Developer

## Runtime Components

```text
Backend API: Node.js Fastify, default port 3100
Frontend: Vite React, default port 5173
Database: PostgreSQL 16 local Docker service
Blockchain: Hyperledger Fabric test-network for AuditAnchorContract smoke path
```

## Environment Variables

```text
PORT=3100
VITE_FRONTEND_PORT=5173
VITE_API_PROXY_TARGET=http://localhost:3100
PERSISTENCE_ADAPTER=memory
DATABASE_URL=postgres://pls_app:pls_app_password@localhost:5432/pls_platform
DATABASE_SSL_MODE=disable
DB_MIGRATIONS_ENABLED=true
DEMO_SEED_ENABLED=true
FABRIC_TEST_NETWORK_DIR=C:\path\to\fabric-samples\test-network
```

`PERSISTENCE_ADAPTER` accepts:

```text
memory
postgres
```

Use `memory` for fast isolated runs. Use `postgres` after migrations and seed are applied. The Postgres runtime path currently persists auth/session, membership/RBAC, access audit, procurement lifecycle events, blockchain anchor metadata, and escrow records. Routes without Postgres adapters remain in memory and are documented as MVP limitations.

## Startup Sequence

```powershell
npm install
docker compose up -d postgres
$env:DATABASE_URL="postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
$env:DATABASE_SSL_MODE="disable"
$env:DB_MIGRATIONS_ENABLED="true"
$env:DEMO_SEED_ENABLED="true"
npm run db:migrate
npm run db:seed
$env:PERSISTENCE_ADAPTER="postgres"
$env:PORT="3100"
npm run dev
```

In a second terminal:

```powershell
$env:VITE_FRONTEND_PORT="5173"
$env:VITE_API_PROXY_TARGET="http://localhost:3100"
npm run frontend:dev
```

The helper script can run the common local path:

```powershell
.\scripts\start-local-demo.ps1
```

## Fabric

Automated chaincode checks:

```powershell
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
```

Live local-network deployment:

```powershell
$env:FABRIC_TEST_NETWORK_DIR="C:\path\to\fabric-samples\test-network"
.\scripts\fabric\deploy-audit-anchor.ps1 -TestNetworkPath $env:FABRIC_TEST_NETWORK_DIR
```

See `docs/runbooks/fabric-local-network.md` for the peer CLI smoke path.

## Validation

Run before supervisor review:

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

If a command depends on missing local infrastructure, record the command, blocker, release impact, and recommended next action in release evidence.

## Troubleshooting

```text
Port already in use: change PORT or VITE_FRONTEND_PORT.
Database connection rejected: confirm docker compose ps and DATABASE_URL.
Migrations disabled: set DB_MIGRATIONS_ENABLED=true for apply mode.
Seed disabled: set DEMO_SEED_ENABLED=true for apply mode.
Fabric network missing: set FABRIC_TEST_NETWORK_DIR or run chaincode tests only.
Unauthorized API response: login again and use Authorization: Bearer <token>.
```

## Rollback

Local rollback is environment-level:

```powershell
docker compose stop postgres
docker compose down -v
Remove-Item Env:PERSISTENCE_ADAPTER -ErrorAction SilentlyContinue
```

Do not run destructive database commands against shared or production-like environments without an approved backup and rollback plan.
