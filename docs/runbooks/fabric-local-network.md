# Fabric Local Network

This runbook demonstrates the Sprint 6 Fabric baseline with the local
`AuditAnchorContract` chaincode. Fabric stores proof-level anchor records only.
Operational state remains in PostgreSQL.

## Chaincode Workspace

The chaincode lives in:

```text
chaincode/audit-anchor
```

Useful commands:

```powershell
npm --prefix chaincode/audit-anchor install
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
```

## Local Fabric Test Network

Use the Hyperledger Fabric `fabric-samples/test-network` baseline for the MVP demo.
Set the test-network path before deployment:

```powershell
$env:FABRIC_TEST_NETWORK_DIR="C:\path\to\fabric-samples\test-network"
```

The default demo channel is:

```text
procurement-channel
```

## Deploy AuditAnchorContract

From the repository root:

```powershell
.\scripts\fabric\deploy-audit-anchor.ps1 -TestNetworkPath $env:FABRIC_TEST_NETWORK_DIR
```

If the channel is already running:

```powershell
.\scripts\fabric\deploy-audit-anchor.ps1 `
  -TestNetworkPath $env:FABRIC_TEST_NETWORK_DIR `
  -AssumeNetworkRunning
```

The script builds the chaincode and calls the Fabric test-network deployment helper with:

```text
chaincode name: audit-anchor
chaincode language: javascript
channel: procurement-channel
version: 1.0.0
sequence: 1
```

## Live Smoke Path

The preferred repeatable path is the smoke script:

```powershell
.\scripts\fabric\smoke-audit-anchor.ps1 -PrerequisiteCheckOnly
```

The prerequisite check builds and tests the chaincode, then reports whether the
local Fabric test-network, peer CLI, TLS certificates, and Org1 admin MSP are
available. It exits successfully in check mode even when live Fabric prerequisites
are missing so release evidence can record the blocker honestly.

When the local Fabric test-network is available, run the live smoke:

```powershell
.\scripts\fabric\smoke-audit-anchor.ps1 `
  -TestNetworkPath $env:FABRIC_TEST_NETWORK_DIR `
  -AssumeNetworkRunning
```

If `audit-anchor` is already deployed, use:

```powershell
.\scripts\fabric\smoke-audit-anchor.ps1 `
  -TestNetworkPath $env:FABRIC_TEST_NETWORK_DIR `
  -AssumeDeployed
```

The live smoke submits one metadata-only anchor and verifies matching,
mismatching, and missing payload hashes. Expected verification states are
`verified`, `mismatch`, and `notFound`.

Manual fallback: after deployment, use the Fabric peer CLI from
`fabric-samples/test-network` with the channel context established by the sample
network scripts. Submit one metadata-only anchor and verify it with a matching
and mismatching hash:

```powershell
$anchorJson='{"eventId":"smoke-event-001","caseIdHash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","eventType":"smokeProof","payloadHash":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","schemaVersion":"1.0","canonicalization":"json-canonical-v1","occurredAt":"2026-05-26T00:00:00.000Z"}'
peer chaincode invoke -C procurement-channel -n audit-anchor -c "{`"Args`":[`"anchorEvent`",$anchorJson]}"
peer chaincode query -C procurement-channel -n audit-anchor -c '{"Args":["getAnchor","smoke-event-001"]}'
peer chaincode query -C procurement-channel -n audit-anchor -c '{"Args":["verifyEvent","smoke-event-001","sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]}'
peer chaincode query -C procurement-channel -n audit-anchor -c '{"Args":["verifyEvent","smoke-event-001","sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"]}'
peer chaincode query -C procurement-channel -n audit-anchor -c '{"Args":["verifyEvent","missing-event","sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]}'
```

If the local Fabric peer CLI is unavailable, record the blocker in release
evidence and rely on the chaincode unit tests as the automated baseline.

## Contract Functions

`anchorEvent(anchorJson)` writes an append-only proof record:

```json
{
  "eventId": "event-001",
  "caseIdHash": "sha256:<64 hex>",
  "eventType": "purchaseOrderAccepted",
  "payloadHash": "sha256:<64 hex>",
  "schemaVersion": "1.0",
  "canonicalization": "json-canonical-v1",
  "occurredAt": "2026-05-25T04:00:00.000Z"
}
```

`getAnchor(eventId)` returns the on-chain proof record or `null`.

`verifyEvent(eventId, payloadHash)` returns `verified`, `mismatch`, or `notFound`.

`listAnchorsByCase(caseIdHash)` returns proof records for the hashed case id in deterministic order.

## Boundary Rules

- Do not submit raw KYC data, invoice payloads, escrow terms, payment credentials,
  personal data, organization names, actor names, or commercial documents.
- Hash sensitive identifiers before anchoring, for example `caseId -> caseIdHash`.
- Existing `eventId` values are rejected; anchors are append-only.
- Authorization remains in the backend. Chaincode verifies proof records only.

## Troubleshooting

- If deployment cannot find `network.sh`, check `FABRIC_TEST_NETWORK_DIR`.
- If `peer` CLI environment variables are missing, use the Fabric sample scripts from inside
  `fabric-samples/test-network`.
- If chaincode build fails, run `npm --prefix chaincode/audit-anchor install` and retry the
  build/test commands before redeploying.
