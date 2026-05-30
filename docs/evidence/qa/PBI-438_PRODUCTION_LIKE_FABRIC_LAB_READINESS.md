# PBI-438 Production-Like Fabric Lab Readiness

## Purpose

Define the evidence required before PBI-438 can move from Planned to Completed.

## Current Status

PBI-438 remains Planned.

The repository has architecture, templates, private data collection config, connection profile template, chaincode definition plan, prerequisite check script, and lifecycle skeleton.

The repository does not yet have live production-like Fabric consortium evidence.

## Stage 6A Prerequisite Check Result

Date: 2026-05-30

Commands run:

- `npm run chaincode:audit-anchor:build` passed.
- `npm run chaincode:audit-anchor:test` passed with 9 passing chaincode tests.
- `powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1` passed as a prerequisite-report command.
- `powershell -ExecutionPolicy Bypass -File scripts/fabric/production-chaincode-lifecycle-skeleton.ps1` passed in dry-run/template mode.

Prerequisite gaps reported by the check script:

- `peer` CLI is not on `PATH`.
- `configtxgen` is not on `PATH`.
- `fabric-ca-client` is not on `PATH`.
- `FABRIC_CFG_PATH` is not configured.
- `FABRIC_PRODUCTION_CONNECTION_PROFILE` is not configured.
- `FABRIC_WALLET_PATH` is not configured.

Interpretation: repository templates and scripts are ready for a production-like
Fabric lab, but PBI-438 remains Planned because the machine does not yet have
the Fabric binaries, MSP/channel material, gateway configuration, or live
cross-organization smoke evidence required for closure.

## Minimum Evidence Required for Closure

### Environment

- [ ] Fabric binaries installed: peer, configtxgen, fabric-ca-client
- [ ] Docker or Kubernetes environment available
- [ ] TLS enabled
- [ ] Separate MSP material generated per organization
- [ ] No private keys committed to repository
- [ ] Connection profile stored outside repo or sanitized before documentation

### Organizations

- [ ] Platform Operator MSP
- [ ] Buyer MSP
- [ ] Supplier MSP
- [ ] Financier MSP
- [ ] Regulator/Auditor MSP
- [ ] Orderer MSP

### Nodes

- [ ] At least one reachable peer per peer organization
- [ ] Production-like ordering service with multiple orderer nodes where feasible
- [ ] Peer/orderer endpoints reachable from the application host
- [ ] Persistent volumes or equivalent storage configured
- [ ] Operations/health endpoints reviewed

### Channels

- [ ] procurement-proof-channel created
- [ ] required organizations joined
- [ ] anchor chaincode committed to the channel
- [ ] channel artifacts recorded
- [ ] endorsement policy recorded

Optional later channels:

- [ ] regulated-export-channel
- [ ] pls-governance-channel

### Chaincode Lifecycle

- [ ] audit-anchor package created
- [ ] package installed on required peers
- [ ] package ID recorded
- [ ] chaincode approved for each required organization
- [ ] commit readiness checked
- [ ] chaincode committed
- [ ] querycommitted output recorded

### Smoke Tests

- [ ] anchorEvent success
- [ ] getAnchor success
- [ ] verifyEvent verified
- [ ] verifyEvent mismatch
- [ ] verifyEvent notFound
- [ ] duplicate anchor rejected
- [ ] Fabric unavailable state tested or simulated safely
- [ ] Backend app uses fabric mode and reports live proof mode
- [ ] Frontend proof panel displays live proof metadata

### Evidence Files

- [ ] Command transcript
- [ ] Docker/Kubernetes node status
- [ ] CA/MSP generation notes
- [ ] Channel creation notes
- [ ] Chaincode lifecycle notes
- [ ] Invoke/query outputs
- [ ] Backend readiness output
- [ ] Browser/API proof verification evidence
- [ ] Known limitations

## Closure Rule

Do not close PBI-438 until all required evidence exists.
