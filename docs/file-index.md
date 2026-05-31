# Repository File Index

Date: 2026-05-30

This index tells future agents where to look first. It does not replace source files or contracts.

## Source-Of-Truth Priority

1. `backlog/backlog.csv`
2. `docs/contracts/`
3. `docs/architecture/`
4. `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
5. `docs/process/CODING_RULES.md`
6. `docs/runbooks/`
7. `docs/evidence/qa/`
8. `docs/report/`
9. `docs/proposals/`
10. `docs/drafts/` as historical or supporting material only

`backlog/backlog.csv` is the single active backlog CSV and includes the original
MVP backlog plus production-extension PBIs PBI-436 through PBI-462. Superseded
roadmap CSVs under `backlog/archive/` are historical only.

## Repository Root

| Path | Purpose |
|---|---|
| `README.md` | Local startup quick start, demo credentials, and validation commands. |
| `package.json` | Node, TypeScript, backend, frontend, DB, test, and chaincode scripts. |
| `docker-compose.yml` | PostgreSQL local service. |
| `docker-compose.app.yml` | Containerized PostgreSQL, backend, and frontend stack. |
| `Dockerfile.backend` | Backend container build. |
| `Dockerfile.frontend` | Frontend static container build. |
| `.env.example` | Safe local environment variable examples. |
| `backlog/archive/` | Historical backlog CSV snapshots; not active source-of-truth backlog files. |

## Application Code

| Path | Purpose |
|---|---|
| `src/app/server.ts` | Fastify composition root and runtime dependency wiring. |
| `src/frontend/` | React/Vite web frontend. |
| `src/modules/auth/` | Credential login, sessions, bearer auth. |
| `src/modules/membership/` | Member organization lifecycle. |
| `src/modules/access-control/` | Roles, role assignments, authorization checks. |
| `src/modules/kyc-aml-onboarding/` | KYC/AML cases and eligibility. |
| `src/modules/procurement/` | Orders, delivery evidence, lifecycle events, transaction history. |
| `src/modules/escrow/` | Escrow creation, status transitions, release/dispute/arbitration boundary. |
| `src/modules/blockchain/` | Anchor gateway, proof metadata, proof API. |
| `src/modules/reporting/` | Export bundle and local signing metadata. |
| `src/modules/financing/` | PLS contracts, Shariah activation gates, distribution scenarios. |
| `src/modules/shariah-review/` | Shariah review submission, checklist, decision, history. |
| `src/modules/shariah-certification/` | Certificate artifact registry. |
| `src/modules/security/` | Security alert read model. |
| `src/modules/ops/` | Health, readiness, and incident foundations. |
| `src/modules/documents/` | Document storage, extraction, and signature seams. |
| `src/modules/contracts/` | Machine-readable contract and negotiation model. |
| `src/modules/integration/` | External API gateway and ERP/accounting adapter. |
| `src/modules/payments/` | Sandbox/manual payment instruction and ISO 20022-style mapping. |
| `src/modules/shared/` | Shared audit, actor context, errors, and validation utilities. |

## Database And Chaincode

| Path | Purpose |
|---|---|
| `migrations/` | Ordered PostgreSQL migrations. |
| `scripts/db/migrate.ts` | Migration runner. |
| `scripts/db/seed-demo-data.ts` | Demo seed runner. |
| `chaincode/audit-anchor/` | AuditAnchorContract chaincode workspace. |
| `fabric/production-consortium/` | Production-consortium templates and configuration skeletons. |

## Documentation

| Path | Purpose |
|---|---|
| `docs/contracts/` | API, proof, escrow, document, payment, export, external API, and integration contracts. |
| `docs/architecture/` | Durable architecture references and ADRs. |
| `docs/requirements/` | Current product baseline and claim boundary. |
| `docs/implementation/` | Codex task ledger and implementation memory. |
| `docs/traceability/` | Requirement-to-PBI-to-evidence maps. |
| `docs/runbooks/` | Operator, developer, smoke, Fabric, PostgreSQL, and demo procedures. |
| `docs/evidence/qa/` | Validation evidence, UAT results, and release records. |
| `docs/demo/` | Canonical demo case. |
| `docs/report/` | Formal project reports and SRS sources. |
| `docs/proposals/` | Business proposal and supporting proposal material. |
| `docs/drafts/` | Historical draft material; do not treat as primary source when a current doc exists. |

## Preferred Reading Path By Task

| Task type | Read first |
|---|---|
| Product scope | `docs/requirements/CURRENT_PRODUCT_BASELINE.md`, `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md` |
| API behavior | `docs/contracts/API_CONTRACTS.md`, relevant module contract |
| Proof anchoring | `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`, `docs/architecture/FABRIC_MVP_BOUNDARY.md` |
| Persistence | `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`, `docs/architecture/POSTGRES_PERSISTENCE_DECISION.md` |
| Frontend workflow | `docs/architecture/FRONTEND_PRODUCT_JOURNEY.md`, relevant page/component |
| Release evidence | `docs/evidence/qa/PRODUCTION_EXTENSION_RELEASE_VALIDATION.md` |
| Local startup | `README.md`, `docs/runbooks/local-demo.md`, `docs/runbooks/deployable-mvp.md` |
