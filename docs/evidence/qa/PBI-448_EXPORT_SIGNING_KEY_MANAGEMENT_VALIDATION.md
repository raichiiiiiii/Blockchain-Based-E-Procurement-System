# PBI-448 Export Signing and Key Management Validation

Date: 2026-05-26
Branch: feature/PBI-448-export-signing-key-management
Commit inspected before change: 43a2fb6
Readiness statement: supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## Scope

PBI-448 adds detached export manifest signing and offline verification metadata for export bundles.

Implemented:

- export signing profile model and detached signature record.
- `ExportSigningPort`.
- local software-key Ed25519 adapter.
- export manifest canonicalization and hash helper.
- API routes to sign, retrieve, and verify export bundle signatures.
- frontend Export Bundle signature package panel.
- contract documentation: `docs/contracts/EXPORT_SIGNING_KEY_MANAGEMENT_CONTRACT.md`.

Not implemented:

- production KMS or HSM key custody.
- external regulator portal submission.
- production certificate authority lifecycle.
- legal attestation or digital-signature compliance certification.
- raw commercial document signing.

## API Routes Added

```text
POST /api/v1/export-bundles/:bundleId/sign
GET /api/v1/export-bundles/:bundleId/signature
POST /api/v1/export-bundles/:bundleId/verify-signature
```

These routes use the existing export-bundle authentication and reporting authorization policy for regulator/auditor access.

## Signing Behavior

The local software-key adapter:

- creates an in-process Ed25519 signing profile.
- signs the canonical export signing payload containing `bundleId`, `manifestHash`, `bundleHash`, and canonicalization version.
- stores a detached signature on the export bundle record.
- returns offline package metadata for `manifest.json`, signature file, public key PEM, and verification instructions.
- never returns the private key through the API or frontend.

Verification results are explicit:

- `verified`
- `invalid`
- `notFound`
- `unavailable`
- `keyInactive`

Tampered submitted manifest hashes return `invalid` and are not displayed as verified.

## Frontend Behavior

The Export Bundle page now shows a Signature Package panel after a bundle is created.

The panel shows:

- signing algorithm.
- key profile.
- manifest hash.
- detached signature.
- package filenames.
- local software-key claim boundary.
- signature verification result.

The UI explicitly states that this is not production KMS, HSM, or regulator portal integration.

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/EXPORT_SIGNING_KEY_MANAGEMENT_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/evidence/qa/PBI-448_EXPORT_SIGNING_KEY_MANAGEMENT_VALIDATION.md`
- `src/app/server.ts`
- `src/frontend/api/export-bundles.ts`
- `src/frontend/pages/ExportBundlePage.tsx`
- `src/modules/reporting/api/export-bundle.routes.ts`
- `src/modules/reporting/api/export-bundle.routes.test.ts`
- `src/modules/reporting/application/export-bundle-service.ts`
- `src/modules/reporting/application/export-canonicalization.ts`
- `src/modules/reporting/application/export-signing-port.ts`
- `src/modules/reporting/application/export-signing-service.ts`
- `src/modules/reporting/domain/export-bundle.ts`
- `src/modules/reporting/infrastructure/local-software-key-export-signing-adapter.ts`

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/reporting/api/export-bundle.routes.test.ts` | Passed, 8 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 749 tests |
| CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed, no duplicate PBI IDs |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed, no matches |
| `git diff --check` | Passed with existing LF/CRLF normalization warnings only |

Database migration/seed commands were not rerun for this phase because no database schema or seed data changed.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-448 `Completed` for local software-key detached export manifest signing and verification metadata.

Canonical `backlog/backlog.csv` was not changed because the production-extension PBI is tracked in `backlog/production-extension-roadmap.csv`.

## Known Limitations

- local software-key only; no production KMS/HSM custody.
- no external regulator portal submission.
- no production certificate authority lifecycle.
- no legal attestation or digital-signature compliance certification.
- the current local adapter does not persist historical public keys across process restarts.
- export bundle persistence remains in-memory unless a dedicated repository adapter is supplied.

## Recommended Next Slice

Proceed to PBI-447 formal Shariah certification artifact tracking after review/merge, or continue to the next approved phase if this branch stack is being validated as a continuous run. Keep wording limited to artifact tracking unless external certification is actually obtained and evidenced.
