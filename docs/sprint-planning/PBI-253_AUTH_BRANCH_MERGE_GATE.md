# PBI-253 Auth Branch Merge Gate

Status: Ready for review after local verification  
Owner: Scrum Master / Platform Engineer  
Related PBIs: PBI-253, PBI-254, PBI-255, PBI-256, PBI-257, PBI-258, PBI-259, PBI-260, PBI-261, PBI-262  
Related feature branches: PBI-005, PBI-002, PBI-017

## 1. Purpose

This note is the final PBI-253 merge gate for `feature/PBI-253-auth-session-management`.

It summarizes the evidence, impacted files/modules, known branch impacts, and post-merge verification steps needed before PBI-005, PBI-002, and PBI-017 resume integration work after auth lands on `main`.

## 2. Merge readiness status

PBI-253 is ready to be evaluated for merge after the branch owner confirms the latest local verification passes:

```text
npm run build
npm test
```

Current branch relationship observed during PBI-262 preparation:

```text
feature/PBI-253-auth-session-management was ahead of main and behind main.
```

Before final merge, rebase or merge the latest `main` into `feature/PBI-253-auth-session-management`, resolve conflicts, then rerun build and full tests.

## 3. Completed task evidence

The branch includes closure evidence for:

- PBI-254 auth/session contract
- PBI-255 auth domain repository seams
- PBI-256 login/session issuance
- PBI-257 authenticated request validation
- PBI-258 authenticated actor-context integration
- PBI-259 logout/session invalidation
- PBI-260 auth actor-context regression tests
- PBI-261 auth/session documentation and branch-consumer guidance

Evidence files are stored under:

```text
docs/evidence/pbi-closure/
```

## 4. Main changed areas

### Runtime code

- `src/modules/auth/`
- `src/app/server.ts`
- `src/app/plugins/actor-context-plugin.ts`
- `src/modules/access-control/api/routes.ts`
- `src/modules/membership/api/routes.ts`

### Durable documentation

- `docs/contracts/AUTH_SESSION_CONTRACT.md`
- `docs/contracts/AUTH_SESSION_API_CONSUMER_NOTE.md`
- `docs/architecture/AUTH_SESSION_ARCHITECTURE_NOTE.md`
- `docs/architecture/adr/ADR-002-auth-session-management-boundary.md`
- `docs/sprint-planning/PBI-253_AUTH_BRANCH_CONSUMPTION_NOTE.md`

### Tests

- `src/modules/auth/api/auth-regression.test.ts`
- `src/modules/auth/api/auth.routes.test.ts`
- `src/modules/auth/api/authenticated-request.test.ts`
- `src/modules/auth/application/login-user.test.ts`
- `src/modules/auth/application/logout-user.test.ts`
- `src/modules/auth/domain/auth-session.test.ts`
- `src/modules/auth/domain/platform-user-credential.test.ts`

## 5. Implemented auth/session behavior

The branch implements:

- MVP platform login
- opaque session token issuance
- token hash persistence
- login failure response with `UNAUTHORIZED`
- authenticated request validation via bearer token
- trusted actor-context population
- transitional legacy actor-context compatibility
- logout/session revocation
- invalid, expired, and revoked session rejection
- regression tests for protected-route and audit actor-context consumption

## 6. Known branch impact

### PBI-005 immutable audit trail

PBI-005 should consume trusted actor context for:

- procure-to-pay lifecycle event actor attribution
- transaction-history access attribution
- access-history records
- denied protected retrieval attempts

PBI-005 should not redefine audit actor semantics locally.

### PBI-002 KYC/AML onboarding

PBI-002 should consume trusted actor context for:

- onboarding case submitter attribution
- compliance reviewer actions
- KYC/AML decision audit evidence
- downstream eligibility protected checks

PBI-002 should not accept actor identity from request body fields for regulated actions.

### PBI-017 role-based UI and dashboards

PBI-017 may consume authenticated actor context for:

- dashboard routing
- role-specific dashboard state
- widget visibility
- authenticated user display state

PBI-017 must not implement login, logout, token issuance, token validation, public registration, SSO, MFA, or password recovery.

## 7. Post-merge order

After PBI-253 lands on `main`, use this sequence:

1. Rebase or merge latest `main` into `feature/PBI-005-immutable-audit-trail`.
2. Resolve conflicts and run PBI-005 targeted tests, `npm run build`, and `npm test`.
3. Rebase or merge latest `main` into `feature/PBI-002-kyc-aml-onboarding`.
4. Resolve conflicts and run PBI-002 targeted tests, `npm run build`, and `npm test`.
5. Rebase or merge latest `main` into `feature/PBI-017-role-based-ui-dashboards`.
6. Resolve conflicts and run PBI-017 targeted tests, `npm run build`, and `npm test`.

The original Sprint 5 feature merge order remains PBI-005, then PBI-002, then PBI-017 after auth/session lands.

## 8. Verification checklist

Before merging PBI-253:

```text
git fetch origin
git checkout feature/PBI-253-auth-session-management
git pull origin feature/PBI-253-auth-session-management
git merge origin/main
npm run build
npm test
```

Recommended targeted auth regression command:

```text
node --loader ts-node/esm --test src/modules/auth/api/auth-regression.test.ts src/modules/auth/application/logout-user.test.ts src/modules/auth/api/auth.routes.test.ts src/modules/auth/api/authenticated-request.test.ts src/modules/auth/application/login-user.test.ts src/modules/auth/domain/auth-session.test.ts src/modules/auth/domain/platform-user-credential.test.ts
```

## 9. Merge decision rule

Do not merge PBI-253 if any of these are true:

- build fails
- full regression suite fails
- auth regression tests fail
- merge from `main` introduces unresolved conflicts
- actor-context compatibility breaks existing protected route tests
- docs/evidence for PBI-254 through PBI-262 are missing

PBI-253 may be merged when all checks above pass and reviewers accept the known branch-impact notes.
