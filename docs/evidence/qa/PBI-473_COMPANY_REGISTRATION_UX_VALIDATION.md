# PBI-473 Company Registration UX Validation

Date: 2026-05-31
Branch: `codex/issue-15-company-centric-ux`
Commit inspected before change: `9567d3f1ebd5ecd5887f559ef8ec7e2cc965520a`

## Scope

Validated the company registration and registration-to-dashboard company context slice from GitHub Issue #15.

## Files Inspected Or Changed

- `src/frontend/pages/CompanyRegistrationPage.tsx`
- `src/frontend/pages/LandingPage.tsx`
- `src/frontend/App.tsx`
- `src/frontend/components/organization/CompanyContextBanner.tsx`
- `src/frontend/pages/AccountSettingsPage.tsx`
- `src/frontend/api/organization-network.ts`
- `src/modules/organization-network/api/organization-network.routes.ts`
- `src/modules/organization-network/application/organization-network-service.ts`
- `src/modules/organization-network/infrastructure/postgres-organization-network-repository.ts`
- `docs/contracts/ORGANIZATION_NETWORK_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`

## Validation Result

- Public route added: `/register-company`.
- Registration form captures company legal name, unique identifier, business category, contact email, admin username, admin password, and safe public summary.
- Successful registration calls `POST /api/v1/organizations/register`.
- Registration creates pending organization/admin context only; it does not grant transaction eligibility.
- Dashboard now shows company context from server-derived session state via `GET /api/v1/organizations/me/dashboard-summary`.
- Settings now show authenticated account context and safe company profile maintenance.

## Browser Smoke

Passed against the rebuilt Docker app stack at `http://127.0.0.1:5173`.

- Login page showed credential-only helper text.
- Login page did not show role shortcut cards or "Continue as" controls.
- `buyer.demo / demo-password` reached Dashboard and showed Amanah company context.
- `amanah.admin / demo-password` reached Dashboard and could open Company Users.

## Claim Boundary

Registration does not imply eligibility, payment capability, production Fabric membership, ERP connectivity, or formal Shariah certification.

## Known Limitations

- Registration creates a pending organization and admin bootstrap only.
- KYC/AML approval and transaction eligibility remain separate governed workflows.
