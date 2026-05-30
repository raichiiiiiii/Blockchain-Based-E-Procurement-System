# PBI-438 Dockerized Fabric Lab Scaffold Validation

> Supersession note: This file records scaffold-only status at the time it was
> written. PBI-438 was later completed for a production-like local Fabric lab.
> See `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md` and
> `docs/evidence/qa/POST_PBI438_RELEASE_RECONCILIATION.md` for current status.

Date: 2026-05-30
Branch: `feature/PBI-438-dockerized-fabric-lab-scaffold`
Status: scaffold validated; PBI-438 remains Planned

## Scope

This pass turns the previous PBI-438 operator guidance into a runnable local
Docker Compose lab scaffold. It does not run a live production-like Fabric lab
and does not close PBI-438.

## Files Added or Updated

- `fabric/production-consortium/compose/docker-compose.fabric-lab.template.yaml`
- `fabric/production-consortium/config/configtx.yaml.template`
- `fabric/production-consortium/config/core-override-notes.md`
- `fabric/production-consortium/config/orderer-override-notes.md`
- `fabric/production-consortium/config/ca-server-config-notes.md`
- `scripts/fabric/initialize-production-lab-workspace.ps1`
- `scripts/fabric/bootstrap-production-lab-identities.ps1`
- `scripts/fabric/create-production-lab-channel.ps1`
- `scripts/fabric/run-production-chaincode-lifecycle.ps1`
- `scripts/fabric/collect-production-lab-evidence.ps1`
- `scripts/fabric/production-chaincode-lifecycle-skeleton.ps1`
- `scripts/fabric/check-production-consortium-prereqs.ps1`
- `docs/architecture/FABRIC_RUNTIME_GATEWAY_INTEGRATION_GAP.md`
- `docs/runbooks/pbi-438-production-like-fabric-lab.md`
- `fabric/production-consortium/README.md`
- `.gitignore`

## Scaffold Summary

The local lab template defines separate CA, orderer, and peer containers for:

- `ca.orderer`
- `ca.platform`
- `ca.buyer`
- `ca.supplier`
- `ca.financier`
- `ca.regulatorauditor`
- `orderer1`
- `orderer2`
- `orderer3`
- `peer0.platform`
- `peer0.buyer`
- `peer0.supplier`
- `peer0.financier`
- `peer0.regulatorauditor`

Generated crypto, ledgers, channel artifacts, connection profiles, wallets,
logs, and live evidence are directed to the external
`FABRIC_PRODUCTION_LAB_WORKSPACE`.

## Runtime Fabric Gap

The backend has a Fabric gateway adapter seam, but normal runtime composition
does not yet instantiate a real Fabric gateway from `BLOCKCHAIN_ANCHOR_ADAPTER=fabric`.
The gap is documented in:

```text
docs/architecture/FABRIC_RUNTIME_GATEWAY_INTEGRATION_GAP.md
```

PBI-438 remains Planned until the real runtime gateway path is implemented and
validated against a live production-like lab.

## Validation Results

To be completed after command execution.

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 806 tests |
| `npm run chaincode:audit-anchor:build` | Passed |
| `npm run chaincode:audit-anchor:test` | Passed, 9 tests |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/initialize-production-lab-workspace.ps1 -ExternalWorkspace C:\fabric-labs\eprocure-consortium` | Passed dry-run |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/bootstrap-production-lab-identities.ps1 -ExternalWorkspace C:\fabric-labs\eprocure-consortium` | Passed dry-run |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/create-production-lab-channel.ps1 -ExternalWorkspace C:\fabric-labs\eprocure-consortium` | Passed dry-run |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/run-production-chaincode-lifecycle.ps1 -ExternalWorkspace C:\fabric-labs\eprocure-consortium` | Passed dry-run |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/collect-production-lab-evidence.ps1 -ExternalWorkspace C:\fabric-labs\eprocure-consortium` | Passed dry-run |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1` | Passed as prerequisite report; live Fabric binaries/workspace/env were not required in this invocation |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/production-chaincode-lifecycle-skeleton.ps1` | Passed dry-run |
| `docker compose -f fabric/production-consortium/compose/docker-compose.fabric-lab.template.yaml config` | Passed with dummy local env values |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| `production-extension-roadmap.csv` parse/PBI-438 status check | Passed; PBI-438 remains `Planned` |
| tracked secret-material scan with `git ls-files` | Passed; no generated crypto, wallets, channel artifacts, connection profiles, private keys, blocks, or packaged chaincode archives are tracked |
| `git diff --check` | Passed with CRLF warnings only |

## PBI-438 Status

PBI-438 remains `Planned`.

The roadmap row was updated only with a scope note that the Dockerized scaffold
is staged. Status was not changed.

## Known Limitations

- No live production-like Fabric lab was executed in this pass.
- No CA/MSP material, private keys, wallets, channel blocks, or real connection
  profiles are committed.
- The Docker Compose template still requires an operator to supply external CA
  bootstrap secrets and run the lab.
- The backend real Fabric gateway runtime composition remains a follow-up gap.
- This scaffold is not production Fabric consortium readiness evidence.

## Decision

- [x] Not ready to close PBI-438
- [ ] Ready for review as live Fabric evidence
- [ ] Ready to mark Completed

Only a human-run lab with sanitized CA/MSP/channel/lifecycle/backend/browser
evidence can move this PBI toward closure.
