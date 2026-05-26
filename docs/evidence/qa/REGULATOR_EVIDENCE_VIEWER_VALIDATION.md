# Regulator Evidence Viewer Validation

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This evidence covers Phase 9 export bundle viewer polish for the regulator/reporting user. The change improves manifest readability and claim safety; it does not add external regulator integration, production signing, or document download infrastructure.

## Files Changed

- `src/frontend/pages/ExportBundlePage.tsx`
- `src/frontend/styles.css`
- `docs/evidence/qa/REGULATOR_EVIDENCE_VIEWER_VALIDATION.md`

## Behavior

- Export Bundle now shows a manifest summary with bundle ID, scope, date range, event count, manifest hash, verification status, and included proof reference count.
- Bundle detail shows verification status alongside bundle hash, manifest hash, and the controlled download reference.
- Manifest records show proof status when a blockchain anchor metadata reference is included.
- The viewer includes clear "what this proves" and "what this does not prove" language.
- Restricted documents, raw KYC data, raw commercial payloads, and payment credentials remain hidden.

## Browser Validation

Passed against `http://localhost:5173` with the in-app browser:

- Signed in as `regulator.demo`.
- Opened `Export Bundle`.
- Requested an export bundle.
- Confirmed the manifest summary rendered with bundle ID, scope, date range, event count, manifest hash, verification status, and included proof references.
- Confirmed "What this proves" and "What this does not prove" language was visible.
- Confirmed manifest records showed proof status for the included blockchain anchor metadata reference.
- Clicked `Verify bundle` and confirmed `Verified` plus the bundle hash verification message.
- Checked sampled page text for forbidden backlog, sprint, task, story, roadmap, and PBI wording; none were present.
- Checked browser console warnings/errors; none were relevant.

Browser screenshot capture timed out twice in the in-app browser after interaction validation. DOM and interaction checks passed, so this was treated as a non-blocking browser-tool capture issue.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run frontend:build` | Passed. |
| `npm run build` | Passed. |
| `npm test` | Passed: 687 tests, 0 failures. |
| `git diff --check` | Passed with Windows line-ending warnings only. |

## Known Limitations

- Bundle signing remains MVP-equivalent deterministic hash verification, not production key management.
- External regulator portal delivery is out of scope.
- The download reference remains controlled metadata, not a production file transfer service.
