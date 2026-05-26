# Guided Demo Mode Validation

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

This evidence covers the optional guided walkthrough added after the timed supervisor rehearsal. It helps a presenter follow the Amanah-Barakah-Mabrur story without changing authentication, authorization, proof verification, or business data.

## Files Changed

- `src/frontend/App.tsx`
- `src/frontend/components/demo/GuidedDemoPanel.tsx`
- `src/frontend/styles.css`
- `docs/evidence/spikes/GUIDED_DEMO_MODE_SPIKE.md`
- `docs/evidence/qa/GUIDED_DEMO_MODE_VALIDATION.md`

## Behavior

- `?demo=guided` enables a fixed walkthrough panel on landing, sign-in, and dashboard routes.
- The panel shows the current walkthrough step, actor, suggested demo account, expected outcome, and next step.
- The panel preserves normal product routing and can be closed.
- Changing actors still requires using the sign-in flow.
- Proof verification remains handled by the existing proof panel; no proof state is fabricated.

## Browser Validation

Passed against `http://localhost:5173` with the in-app browser:

- Opened `/?demo=guided`; the walkthrough rendered on the landing page.
- Used the walkthrough action to navigate to `/login?demo=guided`; the query parameter was preserved.
- Signed in as `buyer.demo`; the dashboard opened at `/dashboard?demo=guided`.
- Confirmed the guide showed the Buyer order step and prompted `Open Buyer order` before advancing to the next actor.
- Opened the buyer order workspace through the guide.
- Confirmed the next prompt moved to Supplier delivery without signing in automatically.
- Closed the guide and confirmed the URL returned to `/dashboard`.
- Checked sampled snapshots for forbidden backlog, sprint, task, story, roadmap, and PBI wording; none were present.
- Checked browser console warnings/errors; none were relevant.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run frontend:build` | Passed. |
| `npm run build` | Passed. |
| `npm test` | Passed: 687 tests, 0 failures. |
| `git diff --check` | Passed with Windows line-ending warnings only. |

## Known Limitations

- The guide is a presenter aid, not an automated demo runner.
- It does not seed or repair missing demo records.
- It does not verify live Fabric prerequisites.
- It should be refreshed if actor navigation or the supervisor demo sequence changes.
