# PBI-438 Production-Like Fabric Lab Validation

Date: 2026-05-31
Branch: feature/PBI-438-live-fabric-lab-attempt
Commit inspected before change: 8dbf3444a85234849fc04cb6a24d2464aa161dfd

## Scope

PBI-438 was reviewed against the remaining action recorded in the roadmap:
run a production-like Fabric lab with real external CA/MSP/channel/lifecycle
material and record sanitized live backend/browser proof evidence.

This evidence closes the implementation slice for a production-like local lab.
It does not claim a production Fabric consortium, production CA governance,
HSM/KMS-backed keys, production private-data operations, or payment settlement.

Post-lab production operations gaps are tracked in:

```text
docs/architecture/PRODUCTION_FABRIC_OPERATIONS_GAP_REGISTER.md
```

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/architecture/FABRIC_RUNTIME_GATEWAY_INTEGRATION_GAP.md`
- `docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md`
- `fabric/production-consortium/compose/docker-compose.fabric-lab.template.yaml`
- `package.json`
- `package-lock.json`
- `src/modules/blockchain/infrastructure/fabric-contract-client-factory.ts`
- `src/modules/blockchain/infrastructure/fabric-runtime-gateway-composition.test.ts`
- `src/frontend/api/ops-status.ts`
- `src/frontend/pages/AuditorDashboard.tsx`
- `src/frontend/pages/RegulatorDashboard.tsx`
- `vite.config.ts`

## External Lab Material

External workspace:

```text
C:\fabric-labs\eprocure-consortium
```

External material generated outside the repository:

- CA bootstrap environment: `C:\fabric-labs\eprocure-consortium\compose\.env.local`
- Enrolled MSP/TLS material under `C:\fabric-labs\eprocure-consortium\crypto`
- Channel artifacts under `C:\fabric-labs\eprocure-consortium\channel-artifacts`
- Host backend connection profile: `C:\fabric-labs\eprocure-consortium\connection-profiles\procurement-proof-connection.localhost.yaml`
- Sanitized evidence under `C:\fabric-labs\eprocure-consortium\evidence`

No CA bootstrap secrets, private keys, MSP keystores, wallets, or raw generated
crypto material were copied into the repository.

## Implementation Summary

- Added official Fabric Gateway SDK runtime dependencies in the Node backend:
  `@hyperledger/fabric-gateway`, `@grpc/grpc-js`, and `yaml`.
- Replaced the previous placeholder Fabric contract factory with an
  infrastructure-only Fabric Gateway factory.
- The factory resolves YAML/JSON connection profiles, peer endpoint, TLS root
  certificate, MSP identity, private key signer, channel, and chaincode.
- Invalid Fabric configuration now fails safely with
  `fabric_gateway_configuration_invalid` and still does not fall back to the
  in-memory proof gateway.
- Fixed the production-like lab Compose template to use
  `ORDERER_ADMIN_TLS_CLIENTROOTCAS`, which is required for orderer admin mTLS.
- Added frontend runtime readiness awareness so auditor/regulator proof status
  surfaces show configured Fabric mode instead of a static local-proof banner.
- Added Vite proxy entries for `/ready` and `/health` so local browser proof
  pages can read backend runtime readiness through the dev server.

## Live Fabric Lab Result

The lab ran with:

- 6 Fabric CA containers:
  - Orderer
  - Platform Operator
  - Buyer
  - Supplier
  - Financier
  - Regulator/Auditor
- 3 orderers:
  - `orderer1.consortium.example.test`
  - `orderer2.consortium.example.test`
  - `orderer3.consortium.example.test`
- 5 peers:
  - `peer0.platform.example.test`
  - `peer0.buyer.example.test`
  - `peer0.supplier.example.test`
  - `peer0.financier.example.test`
  - `peer0.regulatorauditor.example.test`

Channel:

```text
procurement-proof-channel
```

Chaincode:

```text
audit-anchor 1.0.0 sequence 1
```

Lifecycle evidence summary:

- All orderers joined the channel.
- All five peers joined the channel.
- All five org approvals were true:
  - `PlatformOperatorMSP`
  - `BuyerMSP`
  - `SupplierMSP`
  - `FinancierMSP`
  - `RegulatorAuditorMSP`
- Chaincode commit returned valid commit status.
- Query committed reported version `1.0.0`, sequence `1`, and approvals true
  for all five org MSPs.

Sanitized external lifecycle evidence:

```text
C:\fabric-labs\eprocure-consortium\evidence\identity-bootstrap-docker.txt
C:\fabric-labs\eprocure-consortium\evidence\channel-lifecycle-procurement-proof-channel.txt
C:\fabric-labs\eprocure-consortium\evidence\chaincode-lifecycle-audit-anchor.txt
```

## Live Chaincode Smoke

Live event:

```text
eventId: evt-pbi438-live-1780156961
payloadHash: sha256:2222222222222222222222222222222222222222222222222222222222222222
transactionId: ccf2d3ed8aaa57c5d8cdbd532e3aca6ab9776806c33c3d22db664aa67fb79180
```

Smoke result:

- `anchorEvent` committed with valid peer commit status.
- `getAnchor` returned the submitted proof metadata.
- `verifyEvent` returned `verified` for the matching payload hash.
- `verifyEvent` returned `mismatch` for a different payload hash.
- `verifyEvent` returned `notFound` for a missing event.
- Duplicate `anchorEvent` was rejected with `DUPLICATE_ANCHOR`.

Sanitized external smoke evidence:

```text
C:\fabric-labs\eprocure-consortium\evidence\pbi438-audit-anchor-smoke.txt
```

## Backend Live Proof API Smoke

Backend command context:

```text
PORT=3198
PERSISTENCE_ADAPTER=postgres
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_CHANNEL_NAME=procurement-proof-channel
FABRIC_CHAINCODE_NAME=audit-anchor
FABRIC_CONNECTION_PROFILE=C:\fabric-labs\eprocure-consortium\connection-profiles\procurement-proof-connection.localhost.yaml
FABRIC_WALLET_PATH=C:\fabric-labs\eprocure-consortium\crypto\peerOrganizations\platform.example.test\users\Admin@platform.example.test\msp
FABRIC_IDENTITY=admin
```

Backend readiness:

- `GET /health` returned `status: ok`.
- `GET /ready` returned `status: ready`.
- Fabric readiness reported:
  - `proofAdapter: fabric`
  - `mode: configured`
  - `available: true`
  - `simulated: false`
  - `channelName: procurement-proof-channel`
  - `chaincodeName: audit-anchor`

Authenticated proof verification used database-seeded credentials:

```text
auditor.demo / demo-password
```

Proof API results:

- `POST /api/v1/blockchain/anchors/evt-pbi438-live-1780156961/verify`
  with the matching payload hash returned `verified`.
- The same endpoint with a different payload hash returned `mismatch`.
- `POST /api/v1/blockchain/anchors/missing-pbi438-live-event/verify`
  returned `notFound`.
- `GET /api/v1/blockchain/anchors/evt-pbi438-live-1780156961` returned
  `notAnchored` because the metadata endpoint reflects app-owned persisted
  anchor metadata, while this smoke event was anchored directly in the external
  Fabric lab.

## Browser Proof UI Smoke

Browser path:

```text
http://127.0.0.1:5198/login
auditor.demo / demo-password
Dashboard -> Blockchain Proof
```

Observed browser behavior:

- Credential-only login succeeded.
- Auditor navigation showed `Blockchain Proof`.
- The proof status overview read public `/ready` runtime state through the Vite
  proxy and displayed `Configured: Fabric gateway mode is configured for this
  runtime.`
- Proof statuses remained honest and distinct: pending, not anchored, verified,
  mismatch, not found, unavailable.
- No transaction ID or verified proof state was fabricated by the UI.

Browser DOM evidence was saved outside the repository:

```text
C:\fabric-labs\eprocure-consortium\evidence\browser-proof-ui-dom.txt
```

Screenshot capture was attempted through the in-app browser, but the browser
runtime timed out on screenshot capture. The DOM snapshot was retained as the
browser evidence artifact.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 818 tests |
| `npm run chaincode:audit-anchor:build` | Passed |
| `npm run chaincode:audit-anchor:test` | Passed, 9 tests |
| `npm run db:migrate -- --dry-run` | Passed, 17 migrations validated |
| `npm run db:seed -- --dry-run` | Passed, 9 demo accounts and demo records validated |
| `docker compose config` | Passed |
| `docker compose --env-file <external .env.local> -f <external fabric compose> config` | Passed; output contains external lab secrets and was not copied into this repo |
| CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed; no duplicate PBI IDs; PBI-438 is `Completed` in the production-extension roadmap |
| `git diff --check` | Passed; line-ending warnings only |

## Known Limitations

- This is a production-like local lab, not a production Fabric consortium.
- CA bootstrap secrets and private keys were generated for local lab use only
  and remain outside the repository.
- The backend connection profile currently resolves the first configured peer;
  production peer failover and multi-endpoint selection remain future hardening.
- Private data collection behavior is configured as a foundation but was not
  exercised by the AuditAnchor smoke, which anchors proof-level metadata only.
- App-owned anchor metadata is not automatically backfilled for anchors created
  directly through external Fabric CLI smoke scripts.
- Browser screenshot capture timed out; browser DOM evidence was captured.

## Status Decision

PBI-438 is marked `Completed` in `backlog/production-extension-roadmap.csv`
because the app can start in Fabric mode, connect to the configured Fabric
Gateway, verify live chaincode proof states through the backend proof API, and
fall back to explicit unavailable states when configuration is invalid.

Readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```
