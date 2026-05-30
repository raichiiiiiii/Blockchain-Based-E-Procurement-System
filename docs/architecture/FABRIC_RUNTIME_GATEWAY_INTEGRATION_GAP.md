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

Runtime composition now parses `BLOCKCHAIN_ANCHOR_ADAPTER` and does not silently
fall back to the in-memory blockchain gateway when `fabric-local` or `fabric`
is requested.

Supported runtime modes:

```text
BLOCKCHAIN_ANCHOR_ADAPTER=disabled
BLOCKCHAIN_ANCHOR_ADAPTER=in-memory
BLOCKCHAIN_ANCHOR_ADAPTER=fabric-local
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
```

`disabled` mode uses an explicit disabled proof gateway. `in-memory` mode keeps
the existing simulated/local proof path for fast tests and local demos.
`fabric-local` and `fabric` modes validate required Fabric configuration and
compose an unavailable Fabric gateway when configuration or SDK wiring is not
available. The unavailable gateway returns failed/unavailable proof results
without fabricating transaction IDs or verified states.

The remaining live gateway gap is the official Fabric Gateway SDK client
factory and a human-run production-like lab validation.

## Required Runtime Configuration Target

The production-like lab runtime should eventually support:

```text
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_CHANNEL_NAME=procurement-proof-channel
FABRIC_CHAINCODE_NAME=audit-anchor
FABRIC_CONNECTION_PROFILE=<external path>
FABRIC_WALLET_PATH=<external path>
FABRIC_IDENTITY=<enrolled identity>
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

## Implemented Safe Runtime Slice

Completed on 2026-05-30:

1. Runtime adapter mode parsing and validation.
2. Explicit disabled proof gateway.
3. Explicit unavailable Fabric gateway for missing Fabric config or missing SDK
   runtime wiring.
4. Runtime server composition through `BLOCKCHAIN_ANCHOR_ADAPTER`.
5. `/ready` and `/api/v1/ops/status` proof adapter reporting.
6. Tests for in-memory, disabled, fabric-local missing config, fabric missing
   SDK wiring, and safe proof verification behavior.

## Remaining Implementation Plan

1. Add official Fabric Gateway SDK dependencies after dependency policy review.
2. Replace the placeholder `fabric-contract-client-factory.ts` with a real
   infrastructure factory that creates a contract client from external
   connection profile, wallet, identity, channel, and chaincode configuration.
3. Run the Dockerized production-like lab with external CA/MSP/channel/lifecycle
   material.
4. Capture sanitized backend `/ready`, `/api/v1/ops/status`, proof API, and
   browser evidence against the live lab.
5. Reconsider PBI-438 closure only after live lab evidence exists.

## Boundary

This document is a tracked implementation plan and runtime wiring note only. It
does not close PBI-438 and does not claim live Fabric gateway operation.
