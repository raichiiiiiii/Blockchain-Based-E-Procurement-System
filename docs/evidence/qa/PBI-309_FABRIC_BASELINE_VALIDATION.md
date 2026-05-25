# PBI-309 Fabric Sandbox And AuditAnchorContract Validation

Date: 2026-05-25

## Scope

Implemented the Sprint 6 Fabric baseline chaincode workspace for `AuditAnchorContract`.
The contract anchors proof-level event hashes only and leaves operational state in the
backend/PostgreSQL layers.

## Files Added Or Updated

- `chaincode/audit-anchor/package.json`
- `chaincode/audit-anchor/package-lock.json`
- `chaincode/audit-anchor/tsconfig.json`
- `chaincode/audit-anchor/src/audit-anchor-contract.ts`
- `chaincode/audit-anchor/src/index.ts`
- `chaincode/audit-anchor/test/audit-anchor-contract.test.ts`
- `scripts/fabric/deploy-audit-anchor.ps1`
- `docs/runbooks/fabric-local-network.md`
- `docs/evidence/qa/PBI-309_FABRIC_BASELINE_VALIDATION.md`
- `package.json`

## Implemented Contract Functions

- `anchorEvent(anchorJson)`
  - Parses and validates anchor input.
  - Requires `eventId`, `caseIdHash`, `eventType`, `payloadHash`, `schemaVersion`,
    `canonicalization`, and `occurredAt`.
  - Requires `caseIdHash`, `payloadHash`, and `previousEventHash` to use
    `sha256:<64 hex>` format.
  - Rejects duplicate `eventId`.
  - Writes append-only anchor state and a case-hash secondary index.
  - Emits `AuditAnchorCreated`.

- `getAnchor(eventId)`
  - Returns the stored proof record.
  - Returns `null` when no anchor exists.

- `verifyEvent(eventId, payloadHash)`
  - Returns `verified` for matching hashes.
  - Returns `mismatch` for non-matching hashes.
  - Returns `notFound` when the event id is absent.

- `listAnchorsByCase(caseIdHash)`
  - Returns all anchors for a hashed case id.
  - Sorts deterministically by `occurredAt`, then `eventId`.

## Boundary Checks

- On-chain state is limited to proof metadata:
  - `eventId`
  - `caseIdHash`
  - `eventType`
  - `payloadHash`
  - `schemaVersion`
  - `canonicalization`
  - `occurredAt`
  - `anchoredAt`
  - optional `previousEventHash`
- Unsupported fields are rejected so raw invoice payloads, KYC data, escrow terms,
  payment credentials, personal data, and commercial documents cannot be anchored by
  accident through this contract surface.
- Fabric dependencies are isolated to `chaincode/audit-anchor`.
- No Fabric SDK imports were added to application/domain/backend runtime modules.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm view fabric-contract-api version` | Passed: latest reported version was `2.5.8`. |
| `npm view fabric-shim version` | Passed: latest reported version was `2.5.8`. |
| `npm install --prefix chaincode/audit-anchor` | Passed: 99 packages installed, 0 vulnerabilities reported. |
| `npm run chaincode:audit-anchor:build` | Passed. |
| `npm run chaincode:audit-anchor:test` | Passed: 9 tests, 9 pass, 0 fail. |
| `npm run build` | Passed. |
| `npm test` | Passed: 604 tests, 604 pass, 0 fail. |
| `rg -n "fabric-contract-api\|fabric-shim\|fabric-network\|fabric-gateway" src/modules src/app src/infrastructure` | Passed: no matches. |
| `git diff --check` | Passed. |

## Known Limitations

- The local Fabric test network was not started in this validation pass. The deployment
  wrapper and runbook are present, but live deployment requires a local
  `fabric-samples/test-network` checkout and Fabric CLI prerequisites.
- Backend gateway integration is not implemented in this phase; that belongs to the next
  blockchain gateway/API phase.
- The chaincode test suite uses a mocked Fabric stub to prove contract behavior without
  requiring a running peer.
