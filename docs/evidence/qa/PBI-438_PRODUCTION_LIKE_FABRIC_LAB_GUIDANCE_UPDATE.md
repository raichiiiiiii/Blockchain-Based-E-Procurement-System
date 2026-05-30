# PBI-438 Production-Like Fabric Lab Guidance Update

Date: 2026-05-30
Branch: `codex/pbi-438-production-like-fabric-lab-guidance`
Commit baseline: `2d9989eb169181aceb2381732615c4b5412f062a`
Readiness statement: guidance, prerequisite checks, and smoke tooling only. This is not live PBI-438 closure evidence.

## Scope

This update translates the production-like Fabric lab closure guidance into repository artifacts that a human operator can use when preparing and validating the real external lab environment.

The update intentionally does not add CA/MSP material, wallets, private keys, production connection profiles, channel blocks, or Fabric ledger state to the repository.

## Files Added or Changed

- `docs/runbooks/pbi-438-production-like-fabric-lab.md`
- `docs/evidence/templates/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION_TEMPLATE.md`
- `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_GUIDANCE_UPDATE.md`
- `scripts/fabric/check-production-consortium-prereqs.ps1`
- `scripts/fabric/smoke-production-audit-anchor.ps1`
- `.gitignore`

## Operator Guidance Added

The new runbook covers:

- completion boundary for PBI-438
- minimum production-like Fabric topology
- external workspace layout
- host prerequisites
- CA/MSP setup expectations
- peer/orderer deployment expectations
- channel creation
- `audit-anchor` package/install/approve/commit flow
- live chaincode smoke tests
- connection profile and wallet boundaries
- application readiness/API/browser smoke expectations
- final validation checklist

## Tooling Added

### Prerequisite Check Extension

`scripts/fabric/check-production-consortium-prereqs.ps1` now supports stricter production-like lab checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1 `
  -RequireFabricBinaries `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium" `
  -RequireExternalWorkspace `
  -RequireLiveFabricConfig
```

The script verifies repository templates, required Fabric/host binaries, external workspace directories, live Fabric environment variables, and root-level repository secret-boundary directories.

### Production-Like Audit Anchor Smoke

`scripts/fabric/smoke-production-audit-anchor.ps1` runs against a prepared real Fabric peer/orderer context and records sanitized evidence for:

| Test | Expected result |
| --- | --- |
| `anchorEvent` | committed |
| `getAnchor` | submitted record returned |
| `verifyEvent` correct hash | `verified` |
| `verifyEvent` wrong hash | `mismatch` |
| `verifyEvent` unknown event | `notFound` |
| duplicate `anchorEvent` | rejected |

The script writes only metadata/hash proof events and accepts an optional `-EvidenceOutputPath` outside the repository.

## Evidence Template Added

`docs/evidence/templates/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION_TEMPLATE.md` is a copy-forward template for the eventual live lab evidence file:

```text
docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md
```

The template requires topology, MSP, channel, lifecycle, smoke, readiness, API, frontend, security-boundary, secrets-boundary, and final validation outputs before recommending closure.

## Security Boundary

Confirmed in this guidance update:

- No private keys are added.
- No wallets are added.
- No CA admin secrets are added.
- No TLS private keys are added.
- No real production connection profile is added.
- No raw private business data is suggested for on-chain writes.
- `.gitignore` now blocks common root-level local Fabric lab secret/material folders and packaged `audit-anchor` tarballs.

## Validation Performed

Repository-level live commands were not executed in this environment because the real production-like Fabric lab, Fabric binaries, CA/MSP material, and endpoints are not available here.

Manual consistency review performed:

- PBI-438 remains non-closable without live lab evidence.
- New runbook instructs external storage for MSP, wallets, and connection profiles.
- New evidence template requires live command outputs before `Ready to mark Completed` can be selected.
- New smoke script checks all required chaincode proof states and fails if duplicate anchoring is accepted.

## Known Limitations

- No production-like Fabric consortium was deployed by this update.
- No CA/MSP material exists in the repository.
- No peer/orderer endpoint was contacted by this update.
- No `procurement-proof-channel` live creation evidence was produced by this update.
- No `audit-anchor` live lifecycle commit evidence was produced by this update.
- No backend `/ready` or proof API live Fabric output was produced by this update.
- No frontend screenshots were produced by this update.

## Decision

PBI-438 closure recommendation from this update:

- [x] Not ready
- [ ] Ready for review
- [ ] Ready to mark Completed

PBI-438 must remain `Planned` until a human operator completes the external production-like Fabric lab and records live evidence in `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md`.
