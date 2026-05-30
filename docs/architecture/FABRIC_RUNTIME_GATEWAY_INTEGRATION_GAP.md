# Fabric Runtime Gateway Integration Status

Date: 2026-05-31
Related PBI: PBI-438
Status: Resolved for production-like local Fabric lab runtime validation.

Remaining hardening: production peer failover, managed identity lifecycle,
production secret storage, HSM/KMS-backed key handling, production operations,
and external consortium governance.

## Current State

The backend contains a live Fabric Gateway adapter seam:

```text
src/modules/blockchain/infrastructure/fabric-blockchain-anchor-gateway.ts
src/modules/blockchain/infrastructure/fabric-contract-client-factory.ts
```

The infrastructure factory uses the official Fabric Gateway SDK and gRPC
client from infrastructure only. Domain and application layers still depend on
the `BlockchainAnchorGateway` port and do not import Fabric SDKs.

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
compose a live Fabric gateway when external connection profile, MSP/wallet,
identity, channel, and chaincode configuration are valid. Invalid configuration
still composes an unavailable Fabric gateway that returns failed/unavailable
proof results without fabricating transaction IDs or verified states.

PBI-438 live lab validation was completed on 2026-05-31 and is recorded in:

```text
docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md
```

## Decision

The earlier runtime gap is closed for the repository's production-like local
Fabric lab scope. The backend can compose a configured Fabric Gateway client,
the proof API verified live `verified`, `mismatch`, and `notFound` states
against committed `audit-anchor` chaincode, and the frontend proof status
surface reads configured Fabric mode through runtime readiness.

The filename is retained for historical traceability, but the document should
now be read as an implementation status note rather than an unresolved gap.

## Required Runtime Configuration Target

The production-like lab runtime supports:

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
$FABRIC_PRODUCTION_LAB_WORKSPACE/crypto/.../users/<identity>/msp
```

## Safe Failure Rule

If Fabric mode is configured but the gateway cannot connect, the backend must:

- report an explicit unavailable/degraded readiness state
- keep PostgreSQL business events intact
- avoid silently falling back to simulated proof mode
- avoid fabricating transaction IDs or verified proof states

## Implemented Runtime Slice

Completed across 2026-05-30 and 2026-05-31:

1. Runtime adapter mode parsing and validation.
2. Explicit disabled proof gateway.
3. Explicit unavailable Fabric gateway for missing or invalid Fabric runtime
   configuration.
4. Runtime server composition through `BLOCKCHAIN_ANCHOR_ADAPTER`.
5. `/ready` and `/api/v1/ops/status` proof adapter reporting.
6. Tests for in-memory, disabled, fabric-local missing config, invalid Fabric
   runtime configuration, and safe proof verification behavior.
7. Official Fabric Gateway SDK and gRPC client dependency in infrastructure.
8. Connection profile and MSP/wallet identity resolution in infrastructure.
9. Production-like Dockerized lab with external CA/MSP/channel/lifecycle
   material outside the repository.
10. Live AuditAnchor proof verification through the backend proof API.

## Remaining Production Hardening

1. Production CA governance, certificate rotation, revocation, and HSM/KMS
   backed key handling.
2. Production consortium deployment, monitoring, disaster recovery, and
   operational runbooks.
3. Multi-peer connection profile selection and failover beyond the current
   first-peer client profile resolution.
4. Private data collection usage in future chaincode modules where restricted
   proof metadata requires it.

## Boundary

This document records the PBI-438 implementation status. It does not claim a
production Fabric consortium deployment, production CA operations, or production
payment/settlement integration.
