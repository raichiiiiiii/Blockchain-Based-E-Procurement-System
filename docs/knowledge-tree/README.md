# Repository Knowledge Tree

Date: 2026-06-01
Branch: codex/issue-28-knowledge-tree
Issue: https://github.com/raichiiiiiii/Blockchain-Based-E-Procurement-System/issues/28

## Purpose

This folder maps the current repository as a product-owner knowledge tree. It is not a feature implementation and does not upgrade readiness claims.

Current readiness boundary:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

The product thesis is:

```text
A compliance-first procurement evidence platform with blockchain proof anchoring and Shariah-governed PLS seedbed support.
```

## How To Read This Folder

The files are ordered from business problem to product decision:

1. `01-business-problem-tree.md`
2. `02-actor-goal-tree.md`
3. `03-procurement-process-tree.md`
4. `04-mudarabah-financing-tree.md`
5. `05-product-feature-tree.md`
6. `06-domain-data-model-tree.md`
7. `07-backend-module-tree.md`
8. `08-frontend-navigation-tree.md`
9. `09-api-openapi-tree.md`
10. `10-auth-rbac-permission-tree.md`
11. `11-blockchain-proof-tree.md`
12. `12-integration-boundary-tree.md`
13. `13-testing-evidence-tree.md`
14. `14-backlog-traceability-tree.md`
15. `15-research-alignment-matrix.md`
16. `16-product-owner-decision-map.md`

## Confidence Scale

| Level | Meaning |
|---:|---|
| 0 | Backlog only. |
| 1 | Documented only. |
| 2 | Route or page exists. |
| 3 | Route tested. |
| 4 | UI and API work together. |
| 5 | PostgreSQL persistent. |
| 6 | Actor walkthrough proven. |
| 7 | Live external or Fabric integration proven. |

Use this scale conservatively. A feature can be useful and still remain below level 7 if it has no live external integration evidence.

## Sources Used

- `README.md`
- `package.json`
- `backlog/backlog.csv`
- `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
- `docs/contracts/openapi/openapi.yaml`
- `docs/contracts/API_CONTRACTS.md`
- `docs/contracts/AUTH_SESSION_CONTRACT.md`
- `docs/contracts/ORGANIZATION_NETWORK_CONTRACT.md`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/evidence/qa/`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/`
- `scripts/db/seed-demo-data.ts`
- `migrations/`
- `src/app/server.ts`
- `src/modules/`
- `src/frontend/`
- `chaincode/audit-anchor/`
- `.github/workflows/ci.yml`
- Local research PDFs in `C:\Users\User\Downloads\`: e-procurement blockchain paper, traditional procurement thesis, mudarabah procurement thesis, and Hyperledger Fabric thesis.

## Non-Claims

These documents must not be read as evidence of:

- commercial readiness
- production payment execution
- production ERP integration
- managed production Fabric operations
- formal Shariah certification
- fully decentralized procurement
- legal e-signature certification
