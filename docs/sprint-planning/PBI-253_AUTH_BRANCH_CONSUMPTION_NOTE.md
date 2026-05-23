# PBI-253 Auth Branch Consumption Note

Status: Approved PBI-261 sprint coordination note  
Owner: Scrum Master / Platform Engineer  
Audience: Team A - PBI-005, Team B - PBI-002, Team C - PBI-017  
Related PBIs: PBI-253, PBI-261, PBI-262, PBI-005, PBI-002, PBI-017

## 1. Purpose

This note records how Sprint 5 feature branches should consume the completed PBI-253 auth/session branch after it lands on `main`.

It complements `docs/sprint-planning/SPRINT5_TASKS.md` without rewriting the full sprint execution sheet.

## 2. Merge-gate position

`feature/PBI-253-auth-session-management` is a pre-merge integration gate for the three active feature branches.

Recommended order after PBI-253 closure:

1. Merge `feature/PBI-253-auth-session-management` into `main`.
2. Rebase or merge `main` into `feature/PBI-005-immutable-audit-trail`.
3. Rebase or merge `main` into `feature/PBI-002-kyc-aml-onboarding`.
4. Rebase or merge `main` into `feature/PBI-017-role-based-ui-dashboards`.

The original Sprint 5 relative feature order remains PBI-005, then PBI-002, then PBI-017 after auth/session lands.

## 3. Shared contract rule

Feature branches must consume the PBI-253 auth/session contract instead of defining local session, token, login, logout, or actor-context semantics.

Durable sources:

- `docs/contracts/AUTH_SESSION_CONTRACT.md`
- `docs/contracts/AUTH_SESSION_API_CONSUMER_NOTE.md`
- `docs/architecture/AUTH_SESSION_ARCHITECTURE_NOTE.md`
- `docs/architecture/adr/ADR-002-auth-session-management-boundary.md`

## 4. Actor-context consumption rule

Protected route code and audit emitters should read actor identity from trusted actor context.

Preferred canonical fields:

- `actorUserId`
- `actorOrganizationId`, when present
- `actorRoleCodes`
- `authenticationSessionId`
- `authenticationMethod`
- `isAuthenticated`

Existing compatibility fields may remain during migration:

- `userId`
- `authorizationContext.roles`

New feature work must not treat client-authored actor IDs, request body actor IDs, or ad hoc actor headers as authoritative production identity.

## 5. Team-specific guidance

### Team A - PBI-005 immutable audit trail

Use trusted actor context for:

- procure-to-pay lifecycle event actor attribution
- transaction-history access attribution
- access-history audit records
- denied protected retrieval attempts

Do not redefine audit actor semantics locally.

### Team B - PBI-002 KYC/AML onboarding

Use trusted actor context for:

- onboarding case submitter attribution
- compliance reviewer actions
- KYC/AML status decision audit evidence
- downstream eligibility protected checks

Do not accept actor identity from request body fields for regulated actions.

### Team C - PBI-017 role-based UI and dashboards

Consume authenticated actor context for:

- dashboard role/state routing
- role-specific widget visibility
- authenticated user display state
- dashboard API requests that require bearer auth

Do not implement login, logout, session issuance, token validation, public registration, SSO, MFA, or password recovery inside PBI-017.

## 6. Verification expected after rebase

Each feature branch should run:

```text
npm run build
npm test
```

Teams touching auth-adjacent protected routes should also run targeted auth tests where relevant:

```text
node --loader ts-node/esm --test src/modules/auth/api/auth-regression.test.ts src/modules/auth/api/authenticated-request.test.ts
```

## 7. Scope note

This note does not implement PBI-262's final merge checklist. PBI-262 will prepare the final merge gate and rebase guidance after PBI-261 documentation is complete.
