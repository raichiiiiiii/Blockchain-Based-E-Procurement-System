# PBI-263 Product Entry Validation

## Scope

Phase 1 implements the public product entry journey:

- landing page at `/`
- sign-in page at `/login`
- guarded dashboard route at `/dashboard`
- buyer and auditor demo entry points
- dashboard actor derived from frontend session state
- sign out clears local session state

No PostgreSQL, Fabric, escrow, or blockchain proof API work was added in this phase.

## Files Changed

- `src/frontend/App.tsx`
- `src/frontend/index.html`
- `src/frontend/main.tsx`
- `src/frontend/styles.css`
- `src/frontend/lib/auth-client.ts`
- `src/frontend/lib/session-state.ts`
- `src/frontend/lib/dashboard-contract.ts`
- `src/frontend/pages/LandingPage.tsx`
- `src/frontend/pages/LoginPage.tsx`
- `src/frontend/pages/RunwayPage.tsx`
- `src/frontend/components/dashboard/DashboardShell.tsx`
- `src/frontend/components/dashboard/DashboardWidgetZone.tsx`

## Implemented Behavior

- Root route now renders the public landing page instead of the dashboard.
- `/login` renders a sign-in form with Buyer and Auditor demo entries.
- `/dashboard` requires an authenticated frontend session.
- Anonymous direct access to `/dashboard` redirects to `/login`.
- Successful buyer demo sign-in reaches the buyer dashboard with actor `demo-buyer-user`.
- Successful auditor demo sign-in reaches the auditor dashboard with actor `demo-auditor-user`.
- Dashboard initialization no longer uses the previous hardcoded `demoUserContext`.
- Sign out clears stored session state and returns to the sign-in page.
- Landing and login pages do not render authenticated dashboard navigation or proof panels.
- Frontend-rendered TSX/HTML copy was scanned for forbidden planning terms.

## Auth Notes

The frontend auth client first attempts the documented backend contract:

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

The current local browser smoke test ran with only the Vite frontend server active, so demo login used the explicit local demo fallback after the backend proxy reported connection refusal. This fallback is scoped to Buyer and Auditor demo entry and is marked as `source: 'localDemo'` in session state. Backend-owned session/role seeding remains a follow-up for the persistence phase.

## Validation

| Command / Check | Result |
|---|---|
| `npm run frontend:build` | Passed |
| `npm run build` | Passed |
| `npm test` | Passed, 604 tests |
| `git diff --check` | Passed with existing LF-to-CRLF warnings |
| Frontend copy scan for forbidden TSX/HTML terms | No matches |
| Browser smoke test at `http://127.0.0.1:5173/` | Passed |

Browser smoke checks passed:

- root landing heading visible
- root route remained `/`
- sign-in route reached from landing
- Buyer and Auditor demo entries visible
- Buyer demo sign-in reached `/dashboard`
- buyer dashboard showed `demo-buyer-user` and `Role: buyer`
- buyer dashboard showed domain widgets including Blockchain Proof
- sign out returned to `/login`
- anonymous direct `/dashboard` access redirected to `/login`
- Auditor demo sign-in reached `/dashboard`
- auditor dashboard showed `demo-auditor-user` and `Role: auditor`
- auditor navigation showed Access History Search
- browser console captured no errors

## Known Limitations

- The browser smoke test used the local demo fallback because the backend server was not running alongside Vite.
- The backend auth route exists, but local demo account persistence and role seeding are not part of this phase.
- Buyer dashboard widgets are intentionally minimal until the dashboard UX/state-flow phase.
- No proof API, escrow route, PostgreSQL adapter, or Fabric adapter was introduced.

## Closure

Phase 1 acceptance is satisfied for the product entry, sign-in, protected dashboard route, buyer demo, auditor demo, session-backed dashboard actor, and sign-out path.
