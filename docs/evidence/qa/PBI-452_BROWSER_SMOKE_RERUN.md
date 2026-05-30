# PBI-452 Browser Smoke Rerun Evidence

## Purpose

Record browser smoke validation for blockchain status visualization in a normal local browser environment.

## Previous Blocker

The in-app browser blocked localhost reload/read through URL policy.
This was an environment/tooling blocker, not a product failure.

## Environment

- OS:
- Browser:
- Frontend URL:
- Backend URL:
- PostgreSQL mode:
- BLOCKCHAIN_ANCHOR_ADAPTER:
- PERSISTENCE_ADAPTER:
- VITE_ENABLE_LOCAL_DEMO_FALLBACK:

## Accounts Checked

| Account | Expected surface | Result | Notes |
|---|---|---|---|
| admin.demo | Administrator workspace | Not run | |
| buyer.demo | Buyer workspace | Not run | |
| supplier.demo | Supplier workspace | Not run | |
| compliance.demo | Compliance workspace | Not run | |
| shariah.demo | Shariah workspace | Not run | |
| financier.demo | Financing workspace | Not run | |
| auditor.demo | Audit / Blockchain Proof | Not run | |
| regulator.demo | Export / Blockchain Proof | Not run | |
| security.demo | Security / Proof Failures | Not run | |

## Blockchain Status Surfaces

| Surface | Expected behavior | Result | Notes |
|---|---|---|---|
| Auditor proof page | Shows backend-driven proof states | Not run | |
| Regulator proof page | Shows read-only proof access | Not run | |
| Security status | Shows proof health and readiness | Not run | |
| Export bundle page | Shows proof/export status without fabricated chain data | Not run | |
| Financing page | Shows PLS proof coverage without overclaiming | Not run | |

## Acceptance Criteria

- No role-card login shortcut appears.
- No product UI exposes PBI/Sprint/Backlog wording.
- Proof states are explicit: anchored, pending, failed, verified, mismatch, not found, unavailable, not anchored.
- UI does not fabricate transaction IDs, block numbers, or verified states.
- Local proof mode is labelled separately from production Fabric mode.
- Buyer cannot access restricted proof surfaces.
- Regulator/auditor/security can access permitted proof surfaces.

## Result

Status: Pending rerun

Stage 6A note, 2026-05-30: deployable service smoke passed through
`.\scripts\smoke\deployable-smoke-test.ps1`, but that command is not a
substitute for this browser UI rerun. The previous localhost in-app browser
policy blocker remains classified as an environment/tooling blocker, not a
product failure.

## Evidence Attachments

Add screenshot names or notes here.
