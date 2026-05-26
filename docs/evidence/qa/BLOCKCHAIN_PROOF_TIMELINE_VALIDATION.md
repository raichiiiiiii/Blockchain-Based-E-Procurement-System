# Blockchain Proof Timeline Validation

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This evidence covers the Phase 8 proof timeline added for auditor/regulator comprehension. The timeline is a read-only presentation layer over existing proof metadata. It does not add blockchain writes, Fabric deployment, or new proof claims.

## Files Changed

- `src/frontend/components/blockchain/BlockchainProofTimeline.tsx`
- `src/frontend/lib/demo-proof-timeline.ts`
- `src/frontend/pages/AuditEventDetailPage.tsx`
- `src/frontend/pages/AuditorDashboard.tsx`
- `src/frontend/pages/RegulatorDashboard.tsx`
- `src/frontend/styles.css`
- `docs/evidence/spikes/BLOCKCHAIN_PROOF_TIMELINE_SPIKE.md`
- `docs/evidence/qa/BLOCKCHAIN_PROOF_TIMELINE_VALIDATION.md`

## Behavior

- Auditor and regulator proof pages now show a proof timeline before the proof panel.
- Audit event detail includes the same visual sequencing pattern for proof review.
- The timeline displays event labels, timestamps, event IDs, proof hashes when available, and honest proof-state badges.
- Verifying the anchored event updates the related timeline state to `Verified`.
- Not anchored, pending, failed, verified, mismatch, not found, and unavailable remain visually distinct.

## Browser Validation

Passed against `http://localhost:5173` with the in-app browser:

- Signed in as `auditor.demo`.
- Opened `Blockchain Proof`.
- Confirmed the proof timeline rendered with 6 events: Order created, Order accepted, Delivery evidence submitted, Escrow created, Shariah decision, and Export generated.
- Confirmed distinct visible states for not anchored, pending, anchored, failed, and verified after the existing verification action.
- Clicked `Verify proof` and confirmed the Order accepted event and proof panel displayed `Verified`.
- Confirmed sampled page text did not expose backlog, sprint, task, story, roadmap, or PBI labels.
- Checked browser console warnings/errors; none were relevant.

The timeline supports mismatch, not found, and unavailable verification states through the same status model used by the proof panel. Those states are displayed when the corresponding proof verification result is present; they are not pre-labeled as verification outcomes before a verification attempt.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run frontend:build` | Passed. |
| `npm run build` | Passed. |
| `npm test` | Passed: 687 tests, 0 failures. |
| `git diff --check` | Passed with Windows line-ending warnings only. |

## Known Limitations

- Timeline data is scoped to the supervisor demo path and existing proof records.
- It does not prove live Fabric network availability.
- It does not add export signing, external regulator integration, or document verification.
- It intentionally avoids showing raw private payloads or commercial documents.
