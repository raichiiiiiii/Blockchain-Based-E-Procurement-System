# PBI-438 Runtime Fabric Gateway Wiring Validation

Date: 2026-05-30
Branch: `feature/PBI-438-runtime-fabric-gateway-wiring`
Commit inspected before change: `def41f2d199a317a95503726df57ed55da4669f9`
Readiness statement: supervisor-demo plus selected pilot-hardening features, not production Fabric consortium ready.

## Scope

This pass implements the safe runtime wiring slice requested by GitHub Issue #5.
It makes `BLOCKCHAIN_ANCHOR_ADAPTER` explicit and prevents `fabric-local` or
`fabric` mode from silently using the in-memory proof gateway.

This pass does not run a live production-like Fabric lab and does not close
PBI-438.

## Files Inspected

- `src/app/server.ts`
- `src/modules/blockchain/application/blockchain-anchor-gateway.ts`
- `src/modules/blockchain/application/blockchain-proof-service.ts`
- `src/modules/blockchain/api/blockchain-anchor.routes.ts`
- `src/modules/blockchain/infrastructure/fabric-blockchain-anchor-gateway.ts`
- `src/modules/blockchain/infrastructure/in-memory-blockchain-anchor-gateway.ts`
- `src/modules/blockchain/infrastructure/postgres-blockchain-anchor-metadata-repository.ts`
- `src/modules/ops/application/runtime-readiness.ts`
- `src/modules/ops/api/ops-status.routes.ts`
- `package.json`
- `docs/architecture/FABRIC_RUNTIME_GATEWAY_INTEGRATION_GAP.md`
- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/evidence/qa/PBI-438_DOCKERIZED_FABRIC_LAB_SCAFFOLD_VALIDATION.md`
- `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_READINESS.md`
- `backlog/production-extension-roadmap.csv`

## Files Changed

- `.env.example`
- `src/app/server.ts`
- `src/app/server.validation.test.ts`
- `src/frontend/api/ops-status.ts`
- `src/frontend/components/blockchain/BlockchainStatusOverview.tsx`
- `src/modules/blockchain/application/blockchain-anchor-runtime-config.ts`
- `src/modules/blockchain/infrastructure/blockchain-anchor-gateway-composition.ts`
- `src/modules/blockchain/infrastructure/disabled-blockchain-anchor-gateway.ts`
- `src/modules/blockchain/infrastructure/fabric-contract-client-factory.ts`
- `src/modules/blockchain/infrastructure/fabric-runtime-config-loader.test.ts`
- `src/modules/blockchain/infrastructure/fabric-runtime-gateway-composition.test.ts`
- `src/modules/blockchain/infrastructure/unavailable-fabric-anchor-gateway.ts`
- `src/modules/ops/application/runtime-readiness.ts`
- `src/modules/ops/application/runtime-readiness.test.ts`
- `src/modules/ops/api/ops-status.routes.test.ts`
- `src/modules/ops/application/record-readiness-incidents.test.ts`
- `src/modules/security/api/security-alert.routes.test.ts`
- `docs/architecture/FABRIC_RUNTIME_GATEWAY_INTEGRATION_GAP.md`
- `docs/architecture/PRODUCTION_FABRIC_CONSORTIUM_ARCHITECTURE.md`
- `docs/evidence/qa/PBI-437_438_PRODUCTION_FABRIC_CONSORTIUM_VALIDATION.md`
- `docs/evidence/qa/PBI-438_RUNTIME_FABRIC_GATEWAY_WIRING_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`
- `docs/runbooks/pbi-438-production-like-fabric-lab.md`
- `fabric/production-consortium/README.md`
- `fabric/production-consortium/connection-profile-template.yaml.template`
- `scripts/fabric/check-production-consortium-prereqs.ps1`
- `scripts/fabric/initialize-production-lab-workspace.ps1`

The Fabric connection-profile template was renamed from
`connection-profile-template.yaml` to `connection-profile-template.yaml.template`
so the tracked template no longer matches the generated connection-profile
secret/artifact scan.

## Runtime Modes Tested

| Mode | Expected | Result |
| --- | --- | --- |
| `disabled` | explicit disabled/unavailable proof mode | Passed. Composes `DisabledBlockchainAnchorGateway`; anchor attempts return failed with `blockchain_anchor_disabled`; verification returns `unavailable`. |
| `in-memory` | simulated/local proof mode | Passed. Composes `InMemoryBlockchainAnchorGateway`; existing fast proof behavior remains intact. |
| `fabric-local` missing env | degraded/unavailable, no fallback | Passed. Composes `UnavailableFabricAnchorGateway`; readiness reports missing Fabric env fields; no in-memory fallback. |
| `fabric` missing env | degraded/unavailable, no fallback | Covered by config validation and composition tests. |
| `fabric` complete env, SDK not wired | degraded/unavailable, no fallback | Passed. Composes `UnavailableFabricAnchorGateway` with `fabric_gateway_sdk_dependency_missing`; no transaction ID or verified proof is fabricated. |

## Readiness Output

Sanitized `in-memory` example:

```json
{
  "data": {
    "status": "ready",
    "checks": {
      "database": { "mode": "memory", "reachable": true },
      "fabric": {
        "mode": "local",
        "proofAdapter": "in-memory",
        "configured": true,
        "available": true,
        "simulated": true,
        "reason": "in_memory_anchor_gateway"
      },
      "payment": { "mode": "notConfigured", "configured": false },
      "demoSeed": { "enabled": false }
    }
  }
}
```

Sanitized `fabric-local` missing configuration example:

```json
{
  "data": {
    "status": "degraded",
    "checks": {
      "database": { "mode": "memory", "reachable": true },
      "fabric": {
        "mode": "unavailable",
        "proofAdapter": "fabric-local",
        "configured": false,
        "available": false,
        "simulated": false,
        "reason": "missing_fabric_runtime_configuration",
        "missingConfiguration": [
          "FABRIC_CHAINCODE_NAME",
          "FABRIC_CONNECTION_PROFILE",
          "FABRIC_WALLET_PATH",
          "FABRIC_IDENTITY"
        ],
        "channelName": "procurement-proof-channel",
        "connectionProfileConfigured": false,
        "walletPathConfigured": false,
        "identityConfigured": false
      },
      "payment": { "mode": "notConfigured", "configured": false },
      "demoSeed": { "enabled": false }
    }
  }
}
```

Sanitized `fabric` complete configuration but SDK not wired example:

```json
{
  "data": {
    "status": "degraded",
    "checks": {
      "database": { "mode": "memory", "reachable": true },
      "fabric": {
        "mode": "unavailable",
        "proofAdapter": "fabric",
        "configured": true,
        "available": false,
        "simulated": false,
        "reason": "fabric_gateway_sdk_dependency_missing",
        "channelName": "procurement-proof-channel",
        "chaincodeName": "audit-anchor",
        "connectionProfileConfigured": true,
        "walletPathConfigured": true,
        "identityConfigured": true
      },
      "payment": { "mode": "notConfigured", "configured": false },
      "demoSeed": { "enabled": false }
    }
  }
}
```

`/api/v1/ops/status` returns the same readiness object for authorized
administrator and security operator sessions.

## Proof Route Behavior

The proof verification route remains safe when Fabric runtime mode is
unavailable. A request to verify proof through the unavailable Fabric gateway
returns:

```json
{
  "data": {
    "eventId": "event-runtime-001",
    "verificationStatus": "unavailable",
    "submittedPayloadHash": "sha256:<redacted>"
  }
}
```

No `transactionId`, `blockNumber`, `anchoredPayloadHash`, or `verified` state is
fabricated.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 815 tests |
| `npm run db:migrate -- --dry-run` | Passed; validated 17 migration files |
| `npm run db:seed -- --dry-run` | Passed; validated 9 demo accounts and seeded MVP records |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| `npm run chaincode:audit-anchor:build` | Passed |
| `npm run chaincode:audit-anchor:test` | Passed, 9 tests |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1` | Passed as prerequisite report. Missing live Fabric binaries/workspace/env are expected because no live lab was run. |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/production-chaincode-lifecycle-skeleton.ps1` | Passed dry-run |
| `powershell -ExecutionPolicy Bypass -File scripts/fabric/initialize-production-lab-workspace.ps1 -ExternalWorkspace C:\fabric-labs\eprocure-consortium` | Passed dry-run after template rename |
| PBI-438 status check | Passed; PBI-438 remains `Planned` |
| tracked secret-material scan | Passed after renaming the tracked connection-profile template to `.yaml.template` |
| `git diff --check` | Passed with CRLF warnings only |

## Fabric SDK Dependency Decision

No Fabric SDK dependency was added in this pass. `package.json` has no Fabric
Gateway SDK dependency, so the current runtime composes a clearly named
unavailable Fabric gateway for `fabric-local` and `fabric` modes. The follow-up
is to add the official Fabric Gateway client dependency and replace
`fabric-contract-client-factory.ts` with a real infrastructure-only client
factory.

## PBI-438 Status

PBI-438 remains Planned in `backlog/production-extension-roadmap.csv`.

## Known Limitations

- No live production-like Fabric lab was executed.
- No CA/MSP material, private keys, wallets, channel blocks, generated
  connection profiles, or live Fabric evidence are committed.
- `fabric-local` and `fabric` runtime modes currently fail safely to explicit
  unavailable proof state because the official Fabric Gateway client dependency
  is not yet wired.
- PBI-438 still requires human-run lab evidence for CA/MSP/channel/lifecycle,
  backend runtime, proof API, and browser proof verification before closure.
