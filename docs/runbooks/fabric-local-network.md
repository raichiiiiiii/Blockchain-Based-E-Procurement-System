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
