# PBI-282 Dashboard UX State Validation

## Scope

Phase 2 refines the authenticated dashboard experience:

- shared application layout for authenticated workspaces
- role-aware navigation for Buyer and Auditor
- dashboard state resolver for safe non-ready states
- buyer-only dashboard surfaces
- auditor-only dashboard surfaces
- guarded operational content for blocked or unsupported states

No PostgreSQL, Fabric, proof API, or escrow backend work was added in this phase.

## Files Changed

- `src/frontend/App.tsx`
- `src/frontend/styles.css`
- `src/frontend/components/layout/AppLayout.tsx`
- `src/frontend/components/dashboard/DashboardStateView.tsx`
- `src/frontend/lib/dashboard-state-resolver.ts`
- `src/frontend/lib/role-navigation.ts`
- `src/frontend/pages/BuyerDashboard.tsx`
- `src/frontend/pages/AuditorDashboard.tsx`

## Implemented Behavior

- Dashboard rendering is resolved from the authenticated frontend session actor.
- The ready dashboard state renders a shared layout with actor and organization context.
- Buyer navigation is limited to Dashboard, Orders, Escrow, Blockchain Proof, Settings, and Logout.
- Auditor navigation is limited to Dashboard, Audit Trail, Blockchain Proof, Export Bundle, Settings, and Logout.
- Buyer-only navigation is not rendered for Auditor.
- Auditor-only navigation is not rendered for Buyer.
- Navigation attempts outside the actor role are guarded by the dashboard state flow.
- Non-ready states render safe status views instead of operational widgets.
- Supported non-ready states are loading, noRole, unsupportedRole, pendingReview, inactiveUser, suspendedOrganization, forbidden, and backendUnavailable.
- Product copy uses procurement and account wording and does not expose planning terminology.

## State Model Notes

The resolver currently accepts user status, organization status, role assignment status, backend availability, and actor context as inputs. The frontend passes active defaults where the Phase 1 auth response does not yet expose those lifecycle fields. This keeps the state-flow seam explicit without inventing new backend API fields in the frontend.

## Validation

| Command / Check | Result |
|---|---|
| `npm run frontend:build` | Passed |
| `npm run build` | Passed |
| `npm test` | Passed, 604 tests |
| `git diff --check` | Passed with LF-to-CRLF warnings |
| Frontend copy scan for planning/internal terms | No matches |
| Browser dashboard smoke test at `http://127.0.0.1:5173/` | Passed |

Browser smoke checks passed:

- root route opens the landing page
- anonymous direct `/dashboard` access opens sign-in
- Buyer demo sign-in opens the dashboard
- Buyer navigation renders Dashboard, Orders, Escrow, Blockchain Proof, Settings, and Logout
- Buyer navigation hides Audit Trail and Export Bundle
- Buyer Orders, Escrow, Blockchain Proof, and Settings views open from navigation
- sign out returns to sign-in
- Auditor demo sign-in opens the dashboard
- Auditor navigation renders Dashboard, Audit Trail, Blockchain Proof, Export Bundle, Settings, and Logout
- Auditor navigation hides Orders and Escrow
- Auditor Audit Trail, Blockchain Proof, Export Bundle, and Settings views open from navigation
- browser console captured no errors or warnings during the final smoke pass

## Known Limitations

- The browser smoke test used the local demo auth fallback because only the Vite frontend server was running.
- The dashboard resolver is ready for richer account and organization lifecycle inputs, but those fields are not yet returned by the Phase 1 auth session response.
- Buyer and Auditor surfaces are credible first slices; procurement data, proof details, export generation, and account settings remain follow-up work.
- Blockchain proof states are intentionally not rendered as verified until the proof frontend/backend phases provide real proof data.

## Closure

Phase 2 acceptance is satisfied for buyer/auditor role-specific navigation, shared dashboard layout, visible safe state handling, session-derived actor context, and protected operational content.
