# PBI-333 Blockchain Proof UI Validation

Date: 2026-05-25

## Scope

This evidence file was rewritten after the previous proof UI validation note was missing from the working tree. It reflects the current implemented frontend proof surface and the Sprint 6 blockchain proof UI contract.

Implemented proof UI surfaces:

- `src/frontend/components/blockchain/BlockchainProofPanel.tsx`
- `src/frontend/lib/blockchain-proof-client.ts`
- `src/frontend/pages/AuditEventDetailPage.tsx`
- `src/frontend/pages/EscrowDetailPage.tsx`

Reference documents:

- `docs/architecture/BLOCKCHAIN_PROOF_UI_CONTRACT.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/architecture/FRONTEND_PRODUCT_JOURNEY.md`
- `docs/process/design-spec-recovery-notes.md`

## What Was Implemented

- Added a reusable `BlockchainProofPanel` component for audit and escrow proof surfaces.
- Added frontend proof states for `notAnchored`, `pending`, `anchored`, `failed`, `verifying`, `verified`, `mismatch`, `notFound`, and `unavailable`.
- Added a proof client that calls the backend proof API when available.
- Added a clearly named local demo adapter fallback for frontend-only demonstration when the backend proof API is unreachable.
- Added an audit event proof review page that demonstrates all supported proof states.
- Added an escrow detail proof surface that shows escrow proof readiness without displaying raw escrow terms.

## Safety Checks

- `notAnchored`, `pending`, `notFound`, and `unavailable` states do not display fabricated Fabric transaction IDs.
- `mismatch` is visually and textually distinct from `verified`.
- Verification uses the proof client and can return `verified`, `mismatch`, `notFound`, or `unavailable`.
- Raw KYC data, invoice payloads, payment credentials, commercial documents, and raw escrow terms are not rendered.
- The proof panel displays only proof-level data: event id, payload hash, Fabric metadata when present, verification hashes, timestamp, and safe failure reason.
- Product copy uses domain language such as "Blockchain Proof", "Verify proof", "Mismatch", and "Unavailable".

## Known Limitations

- The local demo adapter remains available so the proof UI can be demonstrated before the backend proof service or Fabric network is running.
- The local demo adapter intentionally does not fabricate transaction IDs for demo records that are pending, missing, unavailable, failed, or not anchored.
- The escrow proof surface is a replaceable frontend demo surface until the executable escrow slice is connected in the next phase.

## Validation

Commands recorded after this evidence rewrite:

```text
pass - npm run build
pass - npm run frontend:build
pass - git diff --check
```

`npm run build` and `npm run frontend:build` passed during the follow-on escrow implementation validation pass, which exercised the proof panel code path on the buyer escrow screen.

`git diff --check` completed successfully. PowerShell output included existing LF-to-CRLF normalization warnings for modified files, but the command exited with status 0.
