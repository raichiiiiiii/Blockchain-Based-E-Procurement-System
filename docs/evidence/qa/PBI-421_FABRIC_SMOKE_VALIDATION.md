# PBI-421 Fabric Smoke Validation

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This evidence records a repeatable Fabric smoke validation path for the local
`AuditAnchorContract` baseline. The path verifies proof-level anchoring behavior
only. It does not claim a production Fabric consortium, production CA lifecycle,
or production chaincode deployment.

## Files Changed

- `scripts/fabric/smoke-audit-anchor.ps1`
- `docs/runbooks/fabric-local-network.md`

## Smoke Path Added

The new script supports:

- chaincode build
- chaincode unit tests
- prerequisite checks for `FABRIC_TEST_NETWORK_DIR`, `network.sh`, peer CLI, TLS CA files, and Org1 admin MSP
- optional live deployment through the existing `deploy-audit-anchor.ps1`
- live anchor submission when Fabric prerequisites exist
- live verification checks for `verified`, `mismatch`, and `notFound`

## Validation Results

| Command | Result |
| --- | --- |
| `npm run chaincode:audit-anchor:build` | Passed. |
| `npm run chaincode:audit-anchor:test` | Passed; 9 tests, 0 failures. |
| `.\scripts\fabric\smoke-audit-anchor.ps1 -PrerequisiteCheckOnly` | Passed; chaincode build/test passed and the script reported missing local Fabric prerequisites. |
| `git diff --check` | Passed; line-ending warnings only. |

## Prerequisite Check Result

Live Fabric smoke was not executed in this environment because the following
local prerequisites were not configured:

- `FABRIC_TEST_NETWORK_DIR` / test-network path
- `fabric-samples/test-network/network.sh`
- Fabric peer CLI
- orderer TLS CA file
- peer TLS root certificate
- Org1 admin MSP config path

This is not considered a code failure for the supervisor-demo baseline. The
script now gives operators an explicit path to confirm prerequisites and run the
live smoke when a local Fabric test-network is available.

## Expected Live Smoke Behavior

When Fabric prerequisites exist, the script submits a metadata-only anchor and
verifies:

- matching payload hash returns `verified`
- mismatching payload hash returns `mismatch`
- missing event returns `notFound`

No raw KYC data, invoice payloads, escrow terms, payment credentials, personal
data, organization names, actor names, commercial documents, or raw delivery
evidence are submitted on-chain.

## Known Limitations

- Live deployment was not executed because the local Fabric test-network was not configured.
- The script targets the Hyperledger Fabric sample test-network, not a production consortium.
- Production CA lifecycle, private data collections, consortium governance, and external deployment automation remain post-MVP concerns.

## Recommended Next Step

Run the script without `-PrerequisiteCheckOnly` after installing Fabric samples
and setting `FABRIC_TEST_NETWORK_DIR`, then record the live smoke result in the
release-candidate validation evidence.
