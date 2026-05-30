# PBI-438 Production-Like Fabric Lab Validation

> Template only. Copy this file to `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md` after the live production-like lab has been executed. Do not mark PBI-438 complete from this template alone.

## Date

`YYYY-MM-DD`

## Environment

- Lab workspace path: `<external path, no secrets>`
- Repository commit: `<commit sha>`
- Host OS / runtime: `<Linux/WSL2/VM details>`
- Docker version: `<sanitized output>`
- Docker Compose version: `<sanitized output>`
- Node.js version: `<sanitized output>`
- npm version: `<sanitized output>`
- Fabric peer CLI version: `<sanitized output>`
- Fabric CA client version: `<sanitized output>`
- configtxgen version: `<sanitized output>`
- osnadmin version, if used: `<sanitized output>`

## Network Topology

| Node | Organization | MSP ID | Endpoint | TLS | Reachability evidence |
| --- | --- | --- | --- | --- | --- |
| orderer1 | OrdererOrg | OrdererOrgMSP | `<host:port>` | enabled | `<command/output ref>` |
| orderer2 | OrdererOrg | OrdererOrgMSP | `<host:port>` | enabled | `<command/output ref>` |
| orderer3 | OrdererOrg | OrdererOrgMSP | `<host:port>` | enabled | `<command/output ref>` |
| peer0.platform | Platform Operator | PlatformOperatorMSP | `<host:port>` | enabled | `<command/output ref>` |
| peer0.buyer | Buyer | BuyerMSP | `<host:port>` | enabled | `<command/output ref>` |
| peer0.supplier | Supplier | SupplierMSP | `<host:port>` | enabled | `<command/output ref>` |
| peer0.financier | Financier | FinancierMSP | `<host:port>` | enabled | `<command/output ref>` |
| peer0.regulatorauditor | Regulator/Auditor | RegulatorAuditorMSP | `<host:port>` | enabled | `<command/output ref>` |

## Organizations and MSPs

Confirm that each organization has separate MSP material created outside the repository.

| Organization | MSP ID | Enrollment CA evidence | TLS CA evidence | Admin identity evidence | Node identity evidence | App identity evidence |
| --- | --- | --- | --- | --- | --- | --- |
| OrdererOrg | OrdererOrgMSP |  |  |  |  | N/A |
| Platform Operator | PlatformOperatorMSP |  |  |  |  |  |
| Buyer | BuyerMSP |  |  |  |  |  |
| Supplier | SupplierMSP |  |  |  |  |  |
| Financier | FinancierMSP |  |  |  |  |  |
| Regulator/Auditor | RegulatorAuditorMSP |  |  |  |  |  |

Evidence to paste or reference:

```text
<sanitized CA/MSP command outputs>
```

## Channels

Required channel:

```text
procurement-proof-channel
```

Channel creation evidence:

```text
<sanitized configtxgen / channel create / participation API output>
```

Peer join evidence by org:

```text
<sanitized peer channel join and peer channel list output for each org>
```

Anchor peer update evidence, if applicable:

```text
<sanitized output>
```

## Chaincode Lifecycle Evidence

Chaincode:

```text
audit-anchor
```

Package evidence:

```text
<ls -lh audit-anchor.tar.gz output>
<sha256sum audit-anchor.tar.gz output>
```

Installed package IDs:

| Organization | Peer | Package ID | Evidence |
| --- | --- | --- | --- |
| PlatformOperatorMSP | peer0.platform |  |  |
| BuyerMSP | peer0.buyer |  |  |
| SupplierMSP | peer0.supplier |  |  |
| FinancierMSP | peer0.financier |  |  |
| RegulatorAuditorMSP | peer0.regulatorauditor |  |  |

Approval evidence:

| Organization | Approved? | Evidence |
| --- | --- | --- |
| PlatformOperatorMSP |  |  |
| BuyerMSP |  |  |
| SupplierMSP |  |  |
| FinancierMSP |  |  |
| RegulatorAuditorMSP |  |  |

Check commit readiness output:

```json
{
  "approvals": {
    "PlatformOperatorMSP": false,
    "BuyerMSP": false,
    "SupplierMSP": false,
    "FinancierMSP": false,
    "RegulatorAuditorMSP": false
  }
}
```

Committed definition output:

```text
<sanitized peer lifecycle chaincode querycommitted output>
```

Endorsement evidence:

```text
<sanitized cross-organization invoke command and transaction committed output>
```

## Smoke Test Results

| Test | Result | Evidence |
| --- | --- | --- |
| anchorEvent |  |  |
| getAnchor |  |  |
| verifyEvent verified |  |  |
| verifyEvent mismatch |  |  |
| verifyEvent notFound |  |  |
| duplicate anchor rejected |  |  |
| backend fabric mode |  |  |
| frontend proof display |  |  |

Live `anchorEvent` input used:

```json
{
  "eventId": "evt-pbi438-live-001",
  "caseIdHash": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  "eventType": "escrowCreated",
  "payloadHash": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  "schemaVersion": "1.0",
  "canonicalization": "json-canonical-v1",
  "occurredAt": "2026-05-30T00:00:00.000Z"
}
```

Live smoke command output:

```text
<sanitized output from scripts/fabric/smoke-production-audit-anchor.ps1 or equivalent peer CLI commands>
```

## Application Readiness Output

Paste sanitized `/ready` output:

```json
{}
```

Paste sanitized `/api/v1/ops/status` output:

```json
{}
```

Required indicators:

```text
database mode = postgres
blockchain adapter = fabric or fabric-local where explicitly wired to live gateway proof mode
proof mode = live
channel = procurement-proof-channel
chaincode = audit-anchor
gateway reachable or explicit safe failure
```

## Proof API Evidence

Get proof output:

```json
{}
```

Verify correct hash output:

```json
{}
```

Verify mismatch output:

```json
{}
```

Expected:

```text
anchorStatus = anchored
verificationStatus = verified for correct hash
verificationStatus = mismatch for wrong hash
transactionId or Fabric reference present if gateway returns it
no raw sensitive payload exposed
```

## Frontend Evidence

Screenshots or sanitized notes:

| Surface | Result | Evidence |
| --- | --- | --- |
| Auditor Blockchain Proof |  |  |
| Regulator proof view |  |  |
| Security Status / Proof Failures |  |  |
| Buyer own proof status |  |  |
| Supplier own proof status |  |  |

Confirm:

```text
No fabricated transaction IDs
No fabricated verified state
No raw private business data
No role-card login shortcuts
No PBI/Sprint/Backlog labels in product UI
Local/simulated/live proof mode clearly labelled
```

## Security Boundary

Confirm no raw private data was written on-chain.

```text
<operator confirmation and evidence>
```

Data classes explicitly excluded from Fabric:

```text
raw KYC/AML documents
personal data
commercial documents
invoice payloads
payment credentials
bank account details
unrestricted escrow terms
full delivery evidence attachments
raw Shariah review rationale
full contract text
```

## Secrets Boundary

Confirm no private keys, wallets, CA admin secrets, TLS private keys, or production connection profiles with secrets were committed.

```text
<git status / git diff --check / secret scan output if available>
```

## Final Validation Commands

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` |  |  |
| `npm run frontend:build` |  |  |
| `npm test` |  |  |
| `npm run db:migrate -- --dry-run` |  |  |
| `npm run db:seed -- --dry-run` |  |  |
| `npm run chaincode:audit-anchor:build` |  |  |
| `npm run chaincode:audit-anchor:test` |  |  |
| `docker compose config` |  |  |
| `docker compose -f docker-compose.app.yml config` |  |  |
| `git diff --check` |  |  |
| `scripts/fabric/check-production-consortium-prereqs.ps1` |  |  |
| `scripts/fabric/production-chaincode-lifecycle-skeleton.ps1` |  |  |
| `scripts/fabric/initialize-production-lab-workspace.ps1` |  |  |
| `scripts/fabric/bootstrap-production-lab-identities.ps1` |  |  |
| `scripts/fabric/create-production-lab-channel.ps1` |  |  |
| `scripts/fabric/run-production-chaincode-lifecycle.ps1` |  |  |
| `scripts/fabric/collect-production-lab-evidence.ps1` |  |  |

## Known Limitations

- `<limitation>`

## Decision

PBI-438 closure recommendation:

- [ ] Not ready
- [ ] Ready for review
- [ ] Ready to mark Completed

Only select `Ready to mark Completed` if all live evidence above exists and all closure conditions are met.
