# PBI-366 Dashboard Actor Readiness Validation

## Scope

Wave 1 extends the Sprint 6 product entry and dashboard baseline so mandatory demo actors can sign in and land on role-specific dashboard states.

Covered PBIs:

- PBI-366 administrator demo role
- PBI-384 compliance demo role
- PBI-394 Shariah reviewer and financier demo roles
- PBI-407 regulator reporting demo role
- PBI-414 security operator demo role

Related Sprint 6 baseline:

- PBI-263 product entry/login/dashboard journey
- PBI-282 dashboard UX and state-flow correction

## Files Changed

- `src/frontend/lib/auth-client.ts`
- `src/frontend/lib/dashboard-state-resolver.ts`
- `src/frontend/lib/role-navigation.ts`
- `src/frontend/components/layout/AppLayout.tsx`
- `src/frontend/pages/RoleDashboard.tsx`
- `src/frontend/App.tsx`
- `src/frontend/styles.css`
- `src/modules/auth/domain/platform-user-credential.ts`
- `src/modules/auth/application/login-user.ts`
- `src/modules/auth/infrastructure/postgres-platform-user-credential-repository.ts`
- `src/modules/auth/application/login-user.test.ts`
- `src/modules/auth/api/auth.routes.test.ts`
- `scripts/db/seed-demo-data.ts`
- `docs/runbooks/local-demo.md`

## Implemented Behavior

- Demo account catalogue now includes Administrator, Buyer, Supplier, Compliance Reviewer, Shariah Reviewer, Financier, Auditor, Regulator, and Security Operator.
- Dashboard resolver recognizes all Wave 1 demo roles from authenticated session actor role codes.
- Role navigation is explicit and role-specific; unrelated navigation is hidden from each role.
- New role dashboards render safe status surfaces for administrator, supplier, compliance reviewer, Shariah reviewer, financier, regulator, and security operator.
- Buyer and auditor continue to use their Sprint 6 dashboard slices.
- The dashboard actor remains derived from session state; there is no runtime role dropdown.
- PostgreSQL-backed credential lookup can now attach active organization and active role assignments to issued auth sessions.
- Demo seed now includes `regulator.demo`, bringing seed coverage to 9 demo accounts.

## Actor Coverage

| Actor | Demo username | Dashboard result |
|---|---|---|
| Administrator | `admin.demo` | Administrator dashboard with Members, Roles, Access History |
| Buyer | `buyer.demo` | Buyer dashboard with Orders, Escrow, Blockchain Proof |
| Supplier | `supplier.demo` | Supplier dashboard with Received Orders, Delivery Evidence, Escrow |
| Compliance Reviewer | `compliance.demo` | Compliance dashboard with Compliance and Eligibility Status |
| Shariah Reviewer | `shariah.demo` | Shariah Review dashboard |
| Financier | `financier.demo` | Financing dashboard with Shariah Review reference |
| Auditor | `auditor.demo` | Auditor dashboard with Audit Trail, Blockchain Proof, Export Bundle |
| Regulator | `regulator.demo` | Reporting dashboard with Export Bundle and Blockchain Proof |
| Security Operator | `security.demo` | Security dashboard with Security Status and alert views |

All demo accounts use password `demo-password`.

## Validation

| Command / Check | Result |
|---|---|
| `npm run frontend:build` | Passed |
| `npm run build` | Passed |
| `node --loader ts-node/esm --test src/modules/auth/application/login-user.test.ts src/modules/auth/api/auth.routes.test.ts` | Passed, 24 tests |
| `npm run db:seed -- --dry-run` | Passed: validated 9 demo accounts |
| `Import-Csv backlog/deployment-ready-roadmap.csv` | Passed |
| Frontend product-label scan | Passed: no forbidden product UI labels found |
| Browser smoke at `http://127.0.0.1:5173/` | Passed: 9 actor logins, role navigation, logout, and protected route redirect |
| `npm test` | Passed, 633 tests |
| `git diff --check` | Passed with existing LF-to-CRLF warnings |

Browser smoke verified:

- landing route renders public sign-in entry
- each demo account button appears once
- each actor reaches `/dashboard`
- each dashboard shows the expected actor id from session state
- each role sees expected navigation labels
- sampled unauthorized navigation labels are hidden
- logout returns to `/login`
- anonymous `/dashboard` access redirects to `/login`
- browser console captured no errors during the final pass

## Notes

- The browser smoke ran with only Vite active, so demo button sign-in used the local demo fallback after the backend login attempt could not reach a running API server.
- Backend-issued sessions now carry role context when PostgreSQL membership and role assignment rows are available.
- The dashboard surfaces for supplier, compliance reviewer, Shariah reviewer, financier, regulator, and security operator are safe entry states, not complete workflow implementations.
- UI copy uses product/domain wording and does not expose planning labels.

## Known Limitations

- Administrator member/RBAC workflows are still Wave 2 work.
- Buyer/supplier procurement and compliance eligibility enforcement are still Wave 3 work.
- Regulator export generation is still Wave 4 work.
- Full PLS/Shariah financing workflow is still Wave 6 work.
- Security operator remains a should-have workflow and currently has safe status surfaces only.

## Closure

Wave 1 acceptance is satisfied for demo actor catalogue coverage, session-driven role resolution, role-specific dashboard entry, hidden unrelated navigation, backend session role enrichment, and validation evidence.
