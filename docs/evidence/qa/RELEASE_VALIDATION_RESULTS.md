# Release Validation Results

Date: 2026-05-26  
Status: Pass

## Scope

Release validation covers static builds, frontend build, backend tests, database dry-runs, Fabric chaincode checks, Docker Compose config, product UI label scan, and diff whitespace checks.

## Handover Artifacts

```text
docs/sprint-planning/PHASE8_HANDOVER_VERIFICATION.md
docs/evidence/qa/PHASE8_VERIFICATION_CHECKLIST.md
```

## Commands

| Command | Result | Notes |
|---|---|---|
| `npm run build` | Pass | TypeScript backend/shared build passed. |
| `npm run frontend:build` | Pass | Frontend TypeScript and Vite production build passed. |
| `npm test` | Pass | 668 tests passed, 0 failed. |
| `npm run db:migrate -- --dry-run` | Pass | Validated 4 migration files: `001_auth_membership.sql`, `002_audit_procurement.sql`, `003_blockchain_anchors.sql`, `004_escrows.sql`. |
| `npm run db:seed -- --dry-run` | Pass | Validated 9 demo accounts: admin, auditor, regulator, compliance, Shariah, buyer, supplier, financier, security. |
| `npm run chaincode:audit-anchor:build` | Pass | AuditAnchor chaincode TypeScript build passed. |
| `npm run chaincode:audit-anchor:test` | Pass | 9 chaincode tests passed, 0 failed. |
| `docker compose config` | Pass | Local PostgreSQL service composition rendered successfully. |
| PowerShell syntax check for `scripts/start-local-demo.ps1` | Pass | Script parsed successfully with `[scriptblock]::Create(...)`. |
| `rg -n "PBI-\|Sprint\|Backlog\|Feature lane\|User stories\|Task list\|Roadmap" src/frontend` | Pass | No forbidden product UI label matches in `src/frontend`. |
| PowerShell CSV parser check for `backlog/backlog.csv` and `backlog/deployment-ready-roadmap.csv` | Pass | Canonical backlog: 360 rows, 0 duplicate IDs. Deployment roadmap: 68 rows, 0 duplicate IDs. |
| `git diff --check` | Pass | No whitespace errors. Windows line-ending warnings only. |

## Release Blockers

None found in this validation pass.

## Non-Blocking Issues

- Live Fabric test-network deployment was not executed because release validation used the automated chaincode build/test path and documented manual smoke path.
- PostgreSQL migration/seed apply was not run against a live database in this validation pass; dry-runs passed and the local runbook documents the apply path.
- Node emitted existing experimental loader/deprecation warnings during tests; no test failures resulted.
- Initial CSV parser command used Bash heredoc syntax and failed in PowerShell; rerun with a PowerShell here-string passed.
