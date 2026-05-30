# Developer Onboarding

Status: MVP baseline
Last updated: 2026-05-30

## Product In One Paragraph

This repository implements a compliance-first digital procurement evidence platform with optional procurement-linked PLS / mudarabah financing support. PostgreSQL and backend services own operational business state. Hyperledger Fabric is used only for selected proof anchoring and audit verification.

## What Not To Claim

Do not claim:

- production payment execution
- production Fabric consortium operation
- ISO 20022 bank certification
- production ERP integration
- formal Shariah certification
- tokenized receivables marketplace
- full IoT hardware or EPCIS network integration

## Local Startup

Read `README.md` first.

Fast developer startup:

```powershell
.\scripts\start-local-demo.ps1
```

Containerized startup:

```powershell
docker compose -f docker-compose.app.yml up --build -d
```

## Required Validation

Run before handing off code changes:

```powershell
npm run build
npm run frontend:build
npm test
git diff --check
```

For database-affecting changes:

```powershell
npm run db:migrate -- --dry-run
npm run db:seed -- --dry-run
docker compose config
```

For Fabric-affecting changes:

```powershell
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
```

## Architecture Rules

- Preserve `src/modules/<domain>/{api,application,domain,infrastructure}`.
- Domain and application layers must not import database clients, Fabric SDKs, payment SDKs, ERP SDKs, storage SDKs, OCR libraries, PDF renderers, or IoT SDKs.
- Use repository interfaces and ports.
- Keep raw sensitive payloads off-chain.
- Use shared API error envelopes.
- Use trusted server-side actor context for protected routes.
- Keep in-memory adapters for tests unless explicitly retired.

## Reading Order For New Work

1. `docs/file-index.md`
2. `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
3. Relevant contract in `docs/contracts/`
4. Relevant architecture file in `docs/architecture/`
5. Relevant module folder in `src/modules/`
6. Existing tests for the module
7. Relevant evidence in `docs/evidence/qa/`

## Implementation Loop

Use this loop for every task:

```text
Read current docs/contracts/code
-> identify smallest safe change
-> update docs if behavior changes
-> implement one slice
-> run validation
-> record evidence
-> update docs/implementation/CODEX_TASK_LEDGER.md
```

## UI Rules

Product UI must use product/domain wording only. Do not show PBI IDs, sprint labels, backlog labels, roadmap labels, user story labels, implementation slice labels, or feature lane labels.

Allowed examples:

- Dashboard
- Orders
- Escrow
- Delivery Evidence
- Blockchain Proof
- Compliance
- Members
- Roles
- Shariah Review
- Financing
- Export Bundle
- Security Status

## Git Hygiene

- Inspect before editing.
- Keep changes scoped.
- Do not revert user changes unless explicitly asked.
- Prefer small commits with evidence.
- Run `git diff --check` before commit.
