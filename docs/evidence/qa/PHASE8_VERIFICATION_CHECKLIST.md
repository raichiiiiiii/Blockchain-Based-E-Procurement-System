# Phase 8 Verification Checklist

Date created: 2026-05-26
Status: Ready for independent verifier

## Handover Creation Checks

These checks were run by the implementation agent when creating the handover artifacts. They are not a substitute for independent Phase 8 verification.

| Check | Result | Notes |
|---|---|---|
| Handover guide exists | Pass | `docs/sprint-planning/PHASE8_HANDOVER_VERIFICATION.md` |
| Verifier checklist exists | Pass | `docs/evidence/qa/PHASE8_VERIFICATION_CHECKLIST.md` |
| Roadmap links Phase 8 artifacts | Pass | `docs/sprint-planning/DEPLOYMENT_READY_MVP_ROADMAP.md` |
| Backlog CSV parse | Pass | `backlog/backlog.csv`: 360 rows, 0 duplicate IDs. `backlog/deployment-ready-roadmap.csv`: 68 rows, 0 duplicate IDs. |
| Phase 8 docs trailing whitespace scan | Pass | `rg -n "[ \t]+$" docs/sprint-planning/PHASE8_HANDOVER_VERIFICATION.md docs/evidence/qa/PHASE8_VERIFICATION_CHECKLIST.md` returned no matches. |
| `git diff --check` | Pass | No whitespace errors. Windows line-ending warnings only. |

## Verification Owner

```text
Verifier:
Date:
Environment:
Branch:
Commit:
Working tree state:
Recommendation: Go / No-Go / Conditional Go
```

## 1. Repository And Branch

| Check | Result | Notes |
|---|---|---|
| Current branch recorded | Not run |  |
| Current commit hash recorded | Not run |  |
| Working tree clean or explained | Not run |  |
| `backlog/deployment-ready-roadmap.csv` exists | Not run |  |
| `docs/sprint-planning/DEPLOYMENT_READY_MVP_ROADMAP.md` exists | Not run |  |
| `docs/sprint-planning/SPRINT6_TASKS.md` exists | Not run |  |
| `backlog/plan.mermaid` exists | Not run |  |

## 2. Documentation Structure

| Check | Result | Notes |
|---|---|---|
| `docs/README.md` structure reviewed | Not run |  |
| Runbooks are under `docs/runbooks` | Not run |  |
| Evidence is under `docs/evidence/qa` | Not run |  |
| Sprint planning docs are under `docs/sprint-planning` | Not run |  |
| Active roadmap references use `docs/proposals` where proposal source exists | Not run |  |
| Product UI label rule is documented | Not run |  |

## 3. CSV And Backlog

| Check | Result | Notes |
|---|---|---|
| `backlog/backlog.csv` parses with CSV parser | Not run |  |
| `backlog/deployment-ready-roadmap.csv` parses with CSV parser | Not run |  |
| No duplicate IDs in canonical backlog | Not run |  |
| No duplicate IDs in deployment roadmap | Not run |  |
| Deployment roadmap includes actor, ReqID, priority, owner, status, dependencies, acceptance criteria, deployment relevance, source reference path | Not run |  |

Suggested PowerShell-compatible parser:

```powershell
@'
import csv
from pathlib import Path
for file in ["backlog/backlog.csv", "backlog/deployment-ready-roadmap.csv"]:
    path = Path(file)
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    ids = [row.get("PBI ID") or row.get("PBI-###") for row in rows]
    ids = [x for x in ids if x]
    dupes = sorted({x for x in ids if ids.count(x) > 1})
    print(file, "rows:", len(rows))
    print("fields:", list(rows[0].keys()) if rows else "EMPTY")
    print("duplicate ids:", dupes)
'@ | python -
```

## 4. Static Validation

| Command | Result | Notes |
|---|---|---|
| `git diff --check` | Not run |  |
| `npm run build` | Not run |  |
| `npm run frontend:build` | Not run |  |
| `npm test` | Not run |  |

## 5. Database Verification

| Command / Check | Result | Notes |
|---|---|---|
| `docker compose config` | Not run |  |
| `docker compose up -d postgres` | Not run |  |
| `npm run db:migrate -- --dry-run` | Not run |  |
| `npm run db:seed -- --dry-run` | Not run |  |
| Migrations apply when DB is available | Not run |  |
| Seed applies or non-code blocker recorded | Not run |  |
| Backend starts with `PERSISTENCE_ADAPTER=postgres` | Not run |  |

## 6. Fabric Verification

| Command / Check | Result | Notes |
|---|---|---|
| `npm run chaincode:audit-anchor:build` | Not run |  |
| `npm run chaincode:audit-anchor:test` | Not run |  |
| Live Fabric deploy path followed when prerequisites are available | Not run |  |
| Sample anchor returns `verified` for matching hash | Not run |  |
| Sample anchor returns `mismatch` for changed hash | Not run |  |
| Missing anchor returns `notFound` | Not run |  |

## 7. Backend Proof API

| Check | Result | Notes |
|---|---|---|
| Proof retrieval endpoint exists | Not run |  |
| Proof verification endpoint exists | Not run |  |
| `verified` state is returned only for matching proof | Not run |  |
| `mismatch` is distinct from `verified` | Not run |  |
| `notFound` is distinct from unavailable | Not run |  |
| Fabric unavailable does not corrupt business event | Not run |  |
| No raw private payloads are anchored | Not run |  |

## 8. Frontend Proof UI

| Check | Result | Notes |
|---|---|---|
| `BlockchainProofPanel` renders proof state | Not run |  |
| Verify action calls proof API or documented demo seam | Not run |  |
| No fake transaction ID appears for missing proof | Not run |  |
| `mismatch`, `notFound`, and `unavailable` are visibly distinct | Not run |  |
| Product UI has no backlog/PBI/sprint labels | Not run |  |

Suggested scan:

```powershell
rg -n "PBI-|Sprint|Backlog|Feature lane|User stories|Task list|Roadmap" src/frontend
```

## 9. Actor Login And Routing

| Actor | Login | Dashboard | Unauthorized Direct Access | Notes |
|---|---|---|---|---|
| Administrator | Not run | Not run | Not run |  |
| Buyer / Procurement Officer | Not run | Not run | Not run |  |
| SME / Supplier | Not run | Not run | Not run |  |
| Compliance Reviewer | Not run | Not run | Not run |  |
| Shariah Reviewer | Not run | Not run | Not run |  |
| Bank / Financier | Not run | Not run | Not run |  |
| Auditor | Not run | Not run | Not run |  |
| Regulator / Reporting User | Not run | Not run | Not run |  |
| Security Operator | Not run | Not run | Not run |  |

## 10. Actor UAT

| Actor | Result | Evidence |
|---|---|---|
| Administrator | Not run |  |
| Buyer / Procurement Officer | Not run |  |
| SME / Supplier | Not run |  |
| Compliance Reviewer | Not run |  |
| Shariah Reviewer | Not run |  |
| Bank / Financier | Not run |  |
| Auditor | Not run |  |
| Regulator / Reporting User | Not run |  |
| Platform Operator | Not run |  |
| Developer / Integrator | Not run |  |

## 11. Authorization Matrix

| Check | Result | Notes |
|---|---|---|
| Admin cannot access regulator-only actions unless explicitly allowed | Not run |  |
| Buyer cannot access admin management | Not run |  |
| Supplier cannot access unrelated buyer orders | Not run |  |
| Compliance reviewer cannot access unrestricted admin/RBAC actions | Not run |  |
| Shariah reviewer cannot bypass KYC/AML or admin functions | Not run |  |
| Financier cannot approve own Shariah review unless role allows it | Not run |  |
| Auditor remains read-only where applicable | Not run |  |
| Regulator cannot access internal admin management | Not run |  |
| Security operator cannot mutate admin/compliance/finance data | Not run |  |
| Anonymous user cannot access protected pages or APIs | Not run |  |

## 12. Known Limitations

| Limitation | Present | Notes |
|---|---|---|
| Not production consortium Fabric | Not run |  |
| Not production payment rails | Not run |  |
| Not full ERP integration | Not run |  |
| Not DID/VC federation | Not run |  |
| Not tokenized receivables full lifecycle | Not run |  |
| Not full arbitration module | Not run |  |
| Not multi-jurisdiction policy engine | Not run |  |
| Not full Fabric private data collections | Not run |  |
| Not automated consortium governance | Not run |  |

## 13. Supervisor Demo

| Step | Result | Notes |
|---|---|---|
| Landing page | Not run |  |
| Sign in | Not run |  |
| Administrator governance | Not run |  |
| Buyer order | Not run |  |
| Supplier acknowledgement | Not run |  |
| Escrow creation | Not run |  |
| Blockchain proof | Not run |  |
| Auditor verification | Not run |  |
| Compliance review / eligibility | Not run |  |
| Shariah approval | Not run |  |
| Financier PLS contract/distribution | Not run |  |
| Regulator export bundle | Not run |  |
| Known limitations | Not run |  |

## Release Decision

```text
Release blockers:

Non-blocking issues:

Go / No-Go recommendation:

Evidence file paths:
```
