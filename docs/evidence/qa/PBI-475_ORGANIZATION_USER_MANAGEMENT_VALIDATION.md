# PBI-475 Organization User Management Validation

Date: 2026-05-31
Branch: `codex/issue-15-company-centric-ux`

## Scope

Validated the organization-scoped user management workspace required by GitHub Issue #15.

## API And UI Added

- `GET /api/v1/organizations/me/users`
- `POST /api/v1/organizations/me/users`
- `src/frontend/pages/OrganizationUsersPage.tsx`
- Navigation target: `Company Users`

## Authorization Behavior

- Platform `administrator` and organization `organizationAdmin` can list organization users.
- Platform `administrator` and organization `organizationAdmin` can prepare an organization-scoped user invitation.
- Non-admin company roles are denied by backend authorization.
- Dashboard responses never return a password.
- Invite preparation records scoped user/role metadata and a local outbox notification where supported.

## Tests

- `node --loader ts-node/esm --test src/modules/organization-network/api/organization-network.routes.test.ts`: passed.
- `npm test`: passed, 832 tests.

## Browser Smoke

Passed against the rebuilt Docker app stack:

- `amanah.admin / demo-password` opened Dashboard.
- Company Users navigation was visible.
- Company Users page rendered Amanah-scoped users.
- No `demo-password` or returned password was visible in the page text.

## Known Limitations

- This slice prepares organization-scoped user metadata and local outbox notification. It does not send real email, return generated credentials, or implement production identity lifecycle automation.
