# Export Bundle App-Owned Fabric Anchor Validation

Date: 2026-05-31
Branch: `codex/issue-13-unified-backlog-export-anchor`
Related issue: GitHub Issue #13

## Scope

Issue #13 required an app-owned export bundle proof event so regulator/auditor
export evidence can create its own application-generated proof anchor rather
than only aggregating existing proof metadata.

Safe readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening and production-like Fabric lab validation; not commercial-ready or production-certified.
```

## Event Selected

Selected event:

```text
exportBundleGenerated
```

The generation event was selected because export bundle signing is optional and
uses a local software-key adapter. Anchoring the generated bundle gives the
regulator/auditor proof path a stable app-owned event without overstating local
signing as production key management.

## Proof Path

The implemented path is:

```text
authorized auditor/regulator creates export bundle
-> backend builds deterministic export manifest and bundle hashes
-> backend anchors exportBundleGenerated through BlockchainAnchorGateway
-> backend persists BlockchainAnchorMetadata
-> export bundle response includes honest export proof status
-> GET /api/v1/blockchain/anchors/{eventId} returns stored proof metadata
-> POST /api/v1/blockchain/anchors/{eventId}/verify verifies the bundle hash
```

## Data Boundary

Gateway input is proof-level only:

- event id
- hashed bundle identifier in the `caseIdHash` field
- event type
- bundle payload hash
- schema version
- canonicalization
- generated timestamp

The gateway input does not include raw export bundle contents, raw documents,
KYC data, commercial terms, payment credentials, actor emails, organization
names, or PII.

## Backend Changes

- Added export bundle proof anchoring helper.
- Added `blockchainAnchorGateway` dependency to export bundle route/service
  composition.
- Persisted export proof metadata through the shared blockchain anchor metadata
  repository.
- Kept export bundle persistence independent of anchor success.

## Frontend Surface

The export bundle page now displays export proof event, proof status, proof
hash, and Fabric transaction state without fabricating transaction IDs or
verified states.

## Failure Handling

When the configured gateway is unavailable:

- the export bundle remains persisted
- export proof metadata is saved as `failed`
- failure reason is visible
- no verified state is fabricated

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/reporting/api/export-bundle.routes.test.ts` | Passed; 10 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm test` | Passed; 826 tests. |
| `npm run chaincode:audit-anchor:build` | Passed. |
| `npm run chaincode:audit-anchor:test` | Passed; 9 tests. |
| `npm run db:migrate -- --dry-run` | Passed; validated 17 migration files. |
| `npm run db:seed -- --dry-run` | Passed; validated 9 demo accounts plus demo procurement, delivery evidence, lifecycle, anchor, escrow, export, and integration seed data. |
| `docker compose config` | Passed. |
| `docker compose -f docker-compose.app.yml config` | Passed. |
| Python unified backlog validation | Passed; 462 rows, PBI-436 through PBI-462 present, no duplicates, PBI-438 `Completed`. |
| Archived roadmap check | Passed; former production-extension roadmap CSV removed from active path and retained under `backlog/archive/`. |
| Tracked generated Fabric secret/artifact scan | Passed; no tracked generated Fabric secret/artifact material detected. |
| `git diff --check` | Passed. |

## Live Fabric Lab

Live Fabric lab validation was not rerun in this pass. Coverage is route-level
with controlled gateway doubles plus existing chaincode build/test validation.

## Known Limitations

- The export proof anchor validates the deterministic export bundle hash, not
  raw exported documents.
- Local export signing remains a software-key MVP boundary and does not claim
  production KMS/HSM-backed signing.
- This pass does not claim commercial-ready or production-certified operation.

## Decision

Issue #13 export bundle app-owned anchoring is satisfied: export bundle
generation now creates an app-owned proof event, persists anchor metadata,
supports proof lookup and verification, preserves the bundle on anchor failure,
and maintains safe data boundaries.
