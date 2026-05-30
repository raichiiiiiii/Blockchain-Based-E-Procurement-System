# Fabric Runtime Gateway Integration Gap

Date: 2026-05-30
Related PBI: PBI-438

## Current State

The backend contains a Fabric gateway adapter seam:

```text
src/modules/blockchain/infrastructure/fabric-blockchain-anchor-gateway.ts
```

That adapter accepts a contract client and implements the application
`BlockchainAnchorGateway` port for `anchorEvent`, `getAnchor`, and
`verifyEvent`.

Normal runtime composition still defaults to the in-memory blockchain gateway
unless a test or custom server composition injects a Fabric contract client.
This means the product is Fabric-proof capable, but not yet configured as a
live Fabric gateway runtime by default.

## Required Runtime Configuration Target

The production-like lab runtime should eventually support:

```text
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_CHANNEL_NAME=procurement-proof-channel
FABRIC_CHAINCODE_NAME=audit-anchor
FABRIC_CONNECTION_PROFILE=<external path>
FABRIC_WALLET_PATH=<external path>
```

The external paths must point outside the repository, usually under:

```text
$FABRIC_PRODUCTION_LAB_WORKSPACE/connection-profiles
$FABRIC_PRODUCTION_LAB_WORKSPACE/wallets
```

## Safe Failure Rule

If Fabric mode is configured but the gateway cannot connect, the backend must:

- report an explicit unavailable/degraded readiness state
- keep PostgreSQL business events intact
- avoid silently falling back to simulated proof mode
- avoid fabricating transaction IDs or verified proof states

## Implementation Plan

1. Add a runtime Fabric contract-client factory inside infrastructure only.
2. Keep Fabric SDK imports out of domain and application layers.
3. Wire the factory from runtime composition when `BLOCKCHAIN_ANCHOR_ADAPTER=fabric`.
4. Validate required env vars before server start or readiness.
5. Expose live Fabric channel/chaincode mode in `/ready` and `/api/v1/ops/status`.
6. Add tests for:
   - fabric env missing -> unavailable/degraded, no simulated proof fallback
   - contract submit failure -> anchor failed/unavailable without deleting base event
   - verify unavailable -> explicit unavailable
   - in-memory mode remains available for fast tests
7. Record browser/API proof evidence before reconsidering PBI-438 closure.

## Boundary

This document is a tracked implementation plan only. It does not close PBI-438
and does not claim live Fabric gateway operation.
