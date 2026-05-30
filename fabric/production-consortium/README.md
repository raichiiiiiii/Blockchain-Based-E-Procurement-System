# Production Fabric Consortium Templates

These files stage the production-extension Fabric foundation for the Digital Procurement and PLS Seedbed.

They are templates only. They do not include certificates, private keys, CA material, peer/orderer binaries, production network artifacts, wallets, real connection profiles, or live deployment claims.

## Template Files

- `channel-plan.json`: participant, channel, endorsement, and operations plan.
- `chaincode-definitions.json`: intended chaincode modules and lifecycle metadata.
- `collections-config.json`: private data collection template for proof hashes and metadata.
- `connection-profile-template.yaml`: gateway connection-profile shape with placeholder endpoints and certificate paths.

## PBI-438 Production-Like Lab Guidance

Use the dedicated operator runbook for the real external lab setup required before PBI-438 can close:

```text
docs/runbooks/pbi-438-production-like-fabric-lab.md
```

Use the live evidence template only after the real lab has been executed:

```text
docs/evidence/templates/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION_TEMPLATE.md
```

Copy it to the QA evidence folder only when sanitized live output is ready:

```text
docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md
```

PBI-438 remains `Planned` until a real production-like lab exists with separate MSPs, reachable TLS-enabled peers/orderers, `procurement-proof-channel`, committed `audit-anchor`, cross-organization endorsement, live anchor/verify smoke results, application proof-surface evidence, and a secrets boundary review.

## Operator Scripts

Run the prerequisite checker in non-mutating mode while building the external lab workspace:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1 `
  -RequireFabricBinaries `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium" `
  -RequireExternalWorkspace `
  -RequireLiveFabricConfig
```

Print the lifecycle skeleton before executing any live Fabric lifecycle commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/production-chaincode-lifecycle-skeleton.ps1
```

After `audit-anchor` is committed in the production-like lab, run the live proof smoke script against the prepared peer/orderer context:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/smoke-production-audit-anchor.ps1 `
  -EventId evt-pbi438-live-001 `
  -EvidenceOutputPath "$HOME/fabric-labs/eprocure-consortium/evidence/pbi438-audit-anchor-smoke.txt"
```

The smoke script validates `anchorEvent`, `getAnchor`, `verifyEvent` verified, `verifyEvent` mismatch, `verifyEvent` notFound, and duplicate-anchor rejection using metadata/hash-only proof input.

## Secrets Boundary

Keep all real lab material outside the repository, including:

```text
private keys
wallets
MSP keystore folders
CA admin secrets
TLS private keys
production connection profiles with secrets
channel blocks or artifacts containing environment-specific material
```
