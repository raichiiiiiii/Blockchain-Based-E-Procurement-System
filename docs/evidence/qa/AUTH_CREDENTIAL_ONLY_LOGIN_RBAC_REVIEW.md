# Auth Credential-Only Login and RBAC Review

Date: 2026-05-26  
Branch: `feature/auth-credential-only-login-rbac-review`  
Commit inspected before change: `f9ed9e6 feat(ui): harden demo accounts and responsive product shell`

## Files Changed

- `src/frontend/pages/LoginPage.tsx`
- `src/frontend/App.tsx`
- `src/frontend/lib/auth-client.ts`
- `src/frontend/styles/legacy.css`
- `src/app/server.ts`
- `src/modules/access-control/api/routes.ts`
- `src/modules/blockchain/api/blockchain-anchor.routes.ts`
- `src/modules/procurement/api/transaction-history.routes.ts`
- `src/modules/shared/api/access-history.routes.ts`
- `src/modules/shariah-review/api/routes.ts`
- `src/modules/auth/api/credential-login-rbac-review.test.ts`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md`
- `docs/evidence/qa/AUTH_CREDENTIAL_ONLY_LOGIN_RBAC_REVIEW.md`

## Login UI Before and After

Before:

- Login page rendered role-card shortcuts such as role-specific "Continue as" actions.
- Username and password fields were prefilled from frontend demo account metadata.
- `App.tsx` exposed a demo sign-in handler wired to `loginWithDemoAccount`.

After:

- Login page renders only username, password, Sign in, and Back to overview controls.
- Login helper text is: "Use issued credentials to access your workspace."
- Username and password fields default to empty strings.
- `onDemoSignIn`, role cards, frontend demo account metadata, local demo-token generation, and role shortcut CSS were removed from the product frontend path.
- Demo accounts remain available through database-seeded credentials and runbook documentation only.

## Backend RBAC Inspection Summary

- Auth/session middleware derives trusted actor context from bearer sessions and overwrites any legacy actor-header context for protected runtime routes.
- Product runtime now enables `enforceBearerAuthForLegacyActorRoutes`.
- Strict runtime mode was added for legacy actor-header seams:
  - access-control role routes
  - access-history routes
  - procurement transaction-history route
  - blockchain proof routes
  - Shariah review routes
- Admin role listing is protected by bearer session and administrator role in strict runtime mode.
- Blockchain proof reads reject forged `x-actor-role` headers without bearer session.
- Procurement orders, delivery evidence, escrow, export bundles, PLS financing, and security alerts already use authenticated server-derived actor context in their route handlers or registered prehandlers.
- Security alerts remain read-only and restricted to security operator or administrator.

Known backend policy gaps for future hardening:

- KYC/AML onboarding routes still use existing authorization seams for reviewer decisions; this pass did not redesign full compliance role policy.
- Shariah review routes still use the existing coordinator role-assignment model for review submission/decision authorization. Runtime now requires bearer authentication for those routes, but role taxonomy alignment with the product `shariahReviewer` actor remains future hardening.
- Public/member onboarding creation remains a legacy-compatible route shape and should be groomed separately if it becomes an administrator-only production workflow.

## Frontend RBAC Inspection Summary

- Dashboard role resolution is based on authenticated session actor context.
- Role navigation is derived from `getRoleNavigation` and not from a UI role picker.
- The login page no longer contains a frontend role switcher or shortcut sign-in path.
- Guided demo mode remains optional and does not inject actor identity or bypass authentication.
- Stored `localDemo` sessions continue to be rejected unless `VITE_ENABLE_LOCAL_DEMO_FALLBACK=true`.
- Logout clears stored frontend session state before returning to sign-in.

## Searches Performed

```text
rg "Continue as" src
Result: no matches.

rg "Continue as" src docs
Result: matches remain only in older historical QA evidence files that recorded the previous demo-button workflow. Current runbooks, product source, and current UAT script were updated to credential entry.

rg "demo-account-grid" src
Result: no matches.

rg "onDemoSignIn" src
Result: no matches.

rg "loginWithDemoAccount" src/frontend
Result: no matches.
```

## Tests Added or Updated

Added `src/modules/auth/api/credential-login-rbac-review.test.ts`.

Coverage:

- Login page source renders credential form only.
- Product frontend source does not contain role shortcut wiring.
- Strict runtime mode rejects forged admin actor headers on role routes.
- Strict runtime mode authorizes role access from bearer session, not client headers.
- Strict runtime mode rejects forged proof role headers without bearer session.
- Auditor bearer session can read blockchain proof route.

No React component test framework exists in the current repository setup; frontend component coverage is therefore static regression plus browser smoke.

## Validation Commands and Results

```text
npm run build
Result: passed.

npm run frontend:build
Result: passed.

npm test
Result: passed. 696 tests, 0 failures.

rg "Continue as" src
Result: no matches.

rg "demo-account-grid" src
Result: no matches.

rg "onDemoSignIn" src
Result: no matches.

rg "loginWithDemoAccount" src/frontend
Result: no matches.
```

```text
git diff --check
Result: passed. Git reported line-ending normalization warnings only.
```

## Browser Smoke Result

Target: `http://127.0.0.1:5173/login`

Login page:

- Username field visible.
- Password field visible.
- Sign in button visible.
- Back to overview button visible.
- Helper text visible.
- No role-card grid visible.
- No "Continue as" text visible.
- Fields were empty before entry.

Credential login smoke:

| Account | Result |
|---|---|
| `admin.demo` | Reached dashboard with Members, Roles, and Access History. |
| `buyer.demo` | Reached dashboard with Orders, Escrow, and Blockchain Proof. |
| `supplier.demo` | Reached dashboard with Received Orders, Delivery Evidence, and Escrow. |
| `auditor.demo` | Reached dashboard with Audit Trail, Blockchain Proof, and Export Bundle. |
| `security.demo` | Reached dashboard with Security Status, Access Alerts, Proof Failures, and Denied Actions. |

Buyer navigation smoke confirmed Members, Access History, Security Status, and Access Alerts were not visible.

## Known Limitations

- Historical QA evidence files still describe the old role-card sign-in path. They are preserved as historical evidence and should not be treated as current product runbooks.
- Compliance and Shariah backend authorization should receive a dedicated policy-alignment hardening slice before any pilot claim.
- Product remains supervisor demo ready, not pilot-ready or commercial-ready.

## Statement

Product UI no longer exposes role-card demo login. Demo accounts remain available through database-seeded credentials and runbook documentation only.
