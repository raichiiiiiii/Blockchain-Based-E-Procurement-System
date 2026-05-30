# PBI-438 Production-Like Fabric Lab Runbook

Date: 2026-05-30
Owner: human Fabric operator / blockchain engineer
Related PBI: PBI-438
Status: reusable lab guidance; PBI-438 closure evidence is recorded separately.

Current status note, 2026-05-31:

PBI-438 is Completed for the first production-like local Fabric lab and runtime
Fabric Gateway validation. See
`docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md` and
`docs/evidence/qa/POST_PBI438_RELEASE_RECONCILIATION.md`. This runbook remains
the operator path for rerunning or extending the lab. It does not by itself
claim managed production Fabric operations.

## Purpose

Use this runbook to prepare or rerun the production-like Fabric lab. The lab
must be created outside the Git repository and must produce live evidence from
real CA-generated MSPs, TLS-enabled peers/orderers, channel lifecycle commands,
committed `audit-anchor` chaincode, and application proof surfaces running in
Fabric mode.

This runbook deliberately does not provide a shortcut for simulated completion.
For future reruns, do not treat a simulated or dry-run-only environment as
production-like Fabric evidence.

## Completion Boundary

PBI-438 can move from `Planned` to `Completed` only when all of the following are true:

- A real production-like Fabric consortium lab exists.
- Separate MSPs exist for all required organizations.
- TLS is enabled.
- Peer and orderer endpoints are reachable.
- `procurement-proof-channel` exists.
- `audit-anchor` is packaged, installed, approved, committed, and queryable.
- Cross-organization endorsement works.
- `anchorEvent`, `getAnchor`, `verifyEvent` verified, `verifyEvent` mismatch, `verifyEvent` notFound, and duplicate-anchor rejection have all been observed live.
- The backend runs against the Fabric proof adapter/mode.
- Frontend or API proof surfaces show live proof metadata.
- Evidence is recorded in a sanitized evidence file.
- No secrets are committed.
- No raw sensitive business data is written on-chain.

Do not use the Fabric test network as PBI-438 production-readiness proof. The test network is acceptable only for learning and chaincode confidence.

## Minimum Topology

Recommended minimum production-like consortium lab:

| Fabric organization | MSP ID | Nodes |
| --- | --- | --- |
| Orderer organization | `OrdererOrgMSP` | `orderer1`, `orderer2`, `orderer3` |
| Platform operator | `PlatformOperatorMSP` | `peer0.platform` |
| Buyer | `BuyerMSP` | `peer0.buyer` |
| Supplier | `SupplierMSP` | `peer0.supplier` |
| Financier | `FinancierMSP` | `peer0.financier` |
| Regulator / auditor | `RegulatorAuditorMSP` | `peer0.regulatorauditor` |

A reduced lab may be useful for rehearsal, but must be labelled `consortium rehearsal only` and is not sufficient to close PBI-438.

A one-machine Docker Compose lab is acceptable for the first production-like
PBI-438 lab only when it has separate CA containers, separate MSPs, TLS-enabled
peer/orderer containers, distinct ledger volumes, reachable endpoints, real
channel creation, real lifecycle commands, cross-organization endorsement,
backend Fabric mode, and recorded evidence.

## Required Channel

Start with one channel:

```text
procurement-proof-channel
```

Required members:

```text
PlatformOperatorMSP
BuyerMSP
SupplierMSP
FinancierMSP
RegulatorAuditorMSP
```

Optional future channels, not required for the first PBI-438 closure pass:

```text
regulated-export-channel
pls-governance-channel
```

## Required Chaincode

Start with only:

```text
audit-anchor
```

Repository path:

```text
chaincode/audit-anchor
```

Do not start `escrow-governance`, `export-proof`, or `pls-certification-proof` until `audit-anchor` is stable and the first production-like proof path is proven.

## Host Prerequisites

Recommended host environment:

```text
Linux VM, Linux host, or WSL2 Ubuntu
Docker
Docker Compose plugin
Git
Node.js 18+
npm
PowerShell 7 if using repo .ps1 scripts
Hyperledger Fabric binaries: peer, configtxgen, fabric-ca-client, osnadmin
```

Record versions:

```bash
docker --version
docker compose version
git --version
node --version
npm --version
peer version
configtxgen --version
fabric-ca-client version
osnadmin version
```

If any Fabric binary is missing, install Fabric samples, binaries, and Docker images before proceeding.

## Workspace Boundary

Keep the repository separate from the lab workspace.

Recommended external lab workspace:

```text
~/fabric-labs/eprocure-consortium/
├── bin/
├── config/
├── crypto/
│   ├── orderer-org/
│   ├── platform-operator/
│   ├── buyer/
│   ├── supplier/
│   ├── financier/
│   └── regulator-auditor/
├── channel-artifacts/
├── connection-profiles/
├── wallets/
├── logs/
├── evidence/
└── compose/
```

Repository remains separate, for example:

```text
~/projects/Blockchain-Based-E-Procurement-System/
```

Never commit private keys, wallets, MSP keystores, CA admin secrets, TLS private keys, or production connection profiles containing secrets.

## Repository Precheck

From the repository root:

```bash
npm install
npm run build
npm run frontend:build
npm test
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
```

Run the production-consortium prerequisite script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1 -RequireFabricBinaries -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium" -RequireExternalWorkspace
```

Run the dry-run lifecycle skeleton:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/production-chaincode-lifecycle-skeleton.ps1
```

Initialize the external workspace in dry-run mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/initialize-production-lab-workspace.ps1 `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium"
```

After confirming the target path is outside the repository, create the external
workspace and copy templates:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/initialize-production-lab-workspace.ps1 `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium" `
  -Execute
```

This creates external directories for `crypto`, `channel-artifacts`,
`connection-profiles`, `wallets`, `logs`, `evidence`, `compose`, and `ledgers`.

Expected before a live environment exists:

```text
templates present
JSON files parse
lifecycle command skeleton prints
live Fabric prerequisites may still be missing until the lab is installed and configured
```

## CA and MSP Setup

For every peer organization, create:

```text
enrollment CA
TLS CA
organization admin identity
peer node identity
application client identity
organization MSP
peer local MSP
TLS certificates
```

For the orderer organization, create:

```text
orderer enrollment CA
orderer TLS CA
orderer admin identity
orderer1/orderer2/orderer3 node identities
orderer organization MSP
local MSP for each orderer
TLS certificates for each orderer
```

Record evidence for:

```text
CA containers running
enrollment commands run
MSP folders created
TLS folders created
admin identities created
node identities created
application wallet identity created
no private keys copied into repo
```

Use the bootstrap helper as an operator-reviewed dry run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/bootstrap-production-lab-identities.ps1 `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium"
```

Only run with `-Execute` after the CA containers are running and required
bootstrap secrets are supplied from an untracked local environment.

## Deploy Peers and Orderers

Use Docker Compose or Kubernetes. For a local production-like lab, Docker Compose is the simplest target.

Each peer needs at minimum:

```text
CORE_PEER_ID
CORE_PEER_LOCALMSPID
CORE_PEER_MSPCONFIGPATH
CORE_PEER_ADDRESS
CORE_PEER_LISTENADDRESS
CORE_PEER_CHAINCODEADDRESS
CORE_PEER_CHAINCODELISTENADDRESS
CORE_PEER_GOSSIP_EXTERNALENDPOINT
CORE_PEER_TLS_ENABLED=true
CORE_PEER_TLS_CERT_FILE
CORE_PEER_TLS_KEY_FILE
CORE_PEER_TLS_ROOTCERT_FILE
ledger volume
MSP volume
TLS volume
operations endpoint
```

Each orderer needs at minimum:

```text
ORDERER_GENERAL_LOCALMSPID
ORDERER_GENERAL_LOCALMSPDIR
ORDERER_GENERAL_LISTENADDRESS
ORDERER_GENERAL_LISTENPORT
ORDERER_GENERAL_TLS_ENABLED=true
ORDERER_GENERAL_TLS_PRIVATEKEY
ORDERER_GENERAL_TLS_CERTIFICATE
ORDERER_GENERAL_TLS_ROOTCAS
ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE
ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY
ORDERER_GENERAL_CLUSTER_ROOTCAS
ledger volume
MSP volume
TLS volume
operations endpoint
```

Recommended state database for first proof-only lab:

```text
LevelDB
```

Start the network and record logs:

```bash
docker compose -f $HOME/fabric-labs/eprocure-consortium/compose/docker-compose.fabric-lab.yaml up -d
docker ps
docker logs orderer1 --tail 100
docker logs peer0.platform --tail 100
docker logs peer0.buyer --tail 100
docker logs peer0.supplier --tail 100
docker logs peer0.financier --tail 100
docker logs peer0.regulatorauditor --tail 100
```

## Channel Creation

Generate channel artifacts from the production-like `configtx.yaml`:

```bash
export FABRIC_CFG_PATH=$HOME/fabric-labs/eprocure-consortium/config

configtxgen \
  -profile ProcurementProofChannel \
  -outputCreateChannelTx $HOME/fabric-labs/eprocure-consortium/channel-artifacts/procurement-proof-channel.tx \
  -channelID procurement-proof-channel
```

Create the channel with the orderer, or use the channel participation API if that is the selected deployment pattern.

Join each peer:

```bash
peer channel join -b procurement-proof-channel.block
```

Run `peer channel list` from each organization admin context and record the output.

The repository also provides a dry-run-safe wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/create-production-lab-channel.ps1 `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium"
```

Run with `-Execute` only when the external MSP/TLS material and Fabric admin
context are ready.

## Package and Install `audit-anchor`

From the repository root:

```bash
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test

peer lifecycle chaincode package audit-anchor.tar.gz \
  --path chaincode/audit-anchor \
  --lang node \
  --label audit-anchor_1.0

ls -lh audit-anchor.tar.gz
sha256sum audit-anchor.tar.gz
```

Install on each required endorsing org peer:

```bash
peer lifecycle chaincode install audit-anchor.tar.gz
peer lifecycle chaincode queryinstalled
```

Record the package ID:

```bash
export CC_PACKAGE_ID="audit-anchor_1.0:<hash>"
```

## Approve and Commit Chaincode

Review the guarded lifecycle wrapper before executing live commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/run-production-chaincode-lifecycle.ps1 `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium"
```

The wrapper requires both `-Execute` and
`-ConfirmExecution EXECUTE_PBI438_CHAINCODE_LIFECYCLE` before it will package
chaincode. Install, approval, readiness, commit, and querycommitted still require
the operator to run from the correct organization admin contexts and record
sanitized evidence.

Approve from each required organization admin context:

```bash
peer lifecycle chaincode approveformyorg \
  -o <orderer-endpoint> \
  --channelID procurement-proof-channel \
  --name audit-anchor \
  --version 1.0 \
  --package-id "$CC_PACKAGE_ID" \
  --sequence 1 \
  --tls \
  --cafile <orderer-tls-ca-file>
```

Check readiness:

```bash
peer lifecycle chaincode checkcommitreadiness \
  --channelID procurement-proof-channel \
  --name audit-anchor \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile <orderer-tls-ca-file> \
  --output json
```

Expected approvals must be true for all organizations required by the lifecycle policy. Do not commit while required orgs are false.

Commit after readiness passes:

```bash
peer lifecycle chaincode commit \
  -o <orderer-endpoint> \
  --channelID procurement-proof-channel \
  --name audit-anchor \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile <orderer-tls-ca-file> \
  --peerAddresses <peer0.platform-endpoint> \
  --tlsRootCertFiles <platform-peer-tls-ca> \
  --peerAddresses <peer0.buyer-endpoint> \
  --tlsRootCertFiles <buyer-peer-tls-ca> \
  --peerAddresses <peer0.supplier-endpoint> \
  --tlsRootCertFiles <supplier-peer-tls-ca>
```

Record:

```bash
peer lifecycle chaincode querycommitted \
  --channelID procurement-proof-channel \
  --name audit-anchor
```

## Live Chaincode Smoke

Use safe proof metadata only. Do not write raw KYC, raw contract terms, payment credentials, PII, invoices, bank details, or unrestricted commercial documents to Fabric.

Set the production-like smoke variables:

```powershell
$env:FABRIC_CHANNEL_NAME = "procurement-proof-channel"
$env:FABRIC_CHAINCODE_NAME = "audit-anchor"
$env:FABRIC_ORDERER_ADDRESS = "<orderer-endpoint>"
$env:FABRIC_ORDERER_TLS_CA_FILE = "<orderer-tls-ca-file>"
$env:FABRIC_PEER_ADDRESSES = "<peer0.platform-endpoint>,<peer0.buyer-endpoint>,<peer0.supplier-endpoint>"
$env:FABRIC_PEER_TLS_ROOT_CERT_FILES = "<platform-peer-tls-ca>,<buyer-peer-tls-ca>,<supplier-peer-tls-ca>"
$env:CORE_PEER_LOCALMSPID = "PlatformOperatorMSP"
$env:CORE_PEER_MSPCONFIGPATH = "<platform-admin-or-app-client-msp>"
```

Run the production-like smoke script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/smoke-production-audit-anchor.ps1 `
  -EventId evt-pbi438-live-001 `
  -EvidenceOutputPath "$HOME/fabric-labs/eprocure-consortium/evidence/pbi438-audit-anchor-smoke.txt"
```

The script checks:

```text
anchorEvent -> success / transaction committed
getAnchor -> returns anchor record
verifyEvent correct hash -> verified
verifyEvent wrong hash -> mismatch
verifyEvent unknown event -> notFound
duplicate anchorEvent same eventId -> rejected
```

## Connection Profile and Wallet

Create the real connection profile outside the repository from:

```text
fabric/production-consortium/connection-profile-template.yaml.template
```

Store the real version outside the repo:

```text
~/fabric-labs/eprocure-consortium/connection-profiles/procurement-proof-connection.yaml
```

Create the app wallet outside the repo:

```text
~/fabric-labs/eprocure-consortium/wallets/platform-app/
```

The wallet identity should be a scoped client identity for the selected proof-access organization, usually `PlatformOperatorMSP`, not a broad organization admin identity.

## Application Fabric Mode Smoke

Start PostgreSQL and the application stack with the real connection profile and wallet paths. Example environment:

```bash
export PERSISTENCE_ADAPTER=postgres
export DATABASE_URL=postgres://pls_app:pls_app_password@localhost:5432/pls_platform
export DATABASE_SSL_MODE=disable

export BLOCKCHAIN_ANCHOR_ADAPTER=fabric
export FABRIC_CHANNEL_NAME=procurement-proof-channel
export FABRIC_CHAINCODE_NAME=audit-anchor
export FABRIC_CONNECTION_PROFILE=$HOME/fabric-labs/eprocure-consortium/connection-profiles/procurement-proof-connection.yaml
export FABRIC_WALLET_PATH=$HOME/fabric-labs/eprocure-consortium/wallets/platform-app
```

Run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
npm run frontend:dev
```

Readiness must identify PostgreSQL, Fabric/live proof mode, channel, chaincode, and gateway reachability or an explicit safe failure. It must not silently downgrade to simulated proof mode.

```bash
curl -s http://127.0.0.1:3100/ready
curl -s http://127.0.0.1:3100/api/v1/ops/status -H "Authorization: Bearer $TOKEN"
```

Then verify the live anchor through the API:

```bash
curl -s http://127.0.0.1:3100/api/v1/blockchain/anchors/evt-pbi438-live-001 \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://127.0.0.1:3100/api/v1/blockchain/anchors/evt-pbi438-live-001/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payloadHash":"sha256:2222222222222222222222222222222222222222222222222222222222222222"}'

curl -s -X POST http://127.0.0.1:3100/api/v1/blockchain/anchors/evt-pbi438-live-001/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payloadHash":"sha256:9999999999999999999999999999999999999999999999999999999999999999"}'
```

Expected:

```text
anchorStatus = anchored
verificationStatus = verified for correct hash
verificationStatus = mismatch for wrong hash
transactionId or Fabric reference present if the gateway returns it
no raw sensitive payload exposed
```

## Browser Smoke

Open a normal browser:

```text
http://127.0.0.1:5173
```

Check proof surfaces for:

```text
Auditor -> Blockchain Proof -> live proof state
Regulator -> Export Bundle / Blockchain Proof -> read-only proof state
Security -> Security Status / Proof Failures -> Fabric readiness and proof mode
Buyer -> own escrow/proof status only
Supplier -> own delivery/proof status only
```

Required UI behavior:

```text
No fabricated transaction IDs
No fabricated verified state
No raw private business data
No role-card login shortcuts
No PBI/Sprint/Backlog labels in product UI
Local/simulated/live proof mode clearly labelled
```

Record screenshots in the external evidence folder. Do not commit screenshots that expose secrets, raw private business data, or internal endpoints that should not be public.

## Evidence File

After a successful live lab, create a sanitized copy from:

```text
docs/evidence/templates/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION_TEMPLATE.md
```

to:

```text
docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md
```

Only recommend `Ready to mark Completed` when live evidence exists. Otherwise select `Not ready` and keep PBI-438 `Planned`.

To create an external draft from the template without touching the repository QA
evidence folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/collect-production-lab-evidence.ps1 `
  -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium" `
  -Execute
```

Review and sanitize that external draft before copying anything into
`docs/evidence/qa/`.

## Final Validation

From repository root:

```bash
npm run build
npm run frontend:build
npm test
npm run db:migrate -- --dry-run
npm run db:seed -- --dry-run
npm run chaincode:audit-anchor:build
npm run chaincode:audit-anchor:test
docker compose config
docker compose -f docker-compose.app.yml config
git diff --check
```

Also run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fabric/check-production-consortium-prereqs.ps1 -RequireFabricBinaries -ExternalWorkspace "$HOME/fabric-labs/eprocure-consortium" -RequireExternalWorkspace
powershell -ExecutionPolicy Bypass -File scripts/fabric/production-chaincode-lifecycle-skeleton.ps1
```

If the live lab is running, attach actual lifecycle and smoke outputs to the evidence file.
