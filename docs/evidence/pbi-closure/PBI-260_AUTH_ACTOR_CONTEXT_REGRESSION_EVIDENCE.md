# PBI-260 Auth Actor Context Regression Evidence

## Scope

PBI-260 adds authentication and actor-context regression tests for protected-route consumers.

Feature: PBI-253  
Task: PBI-260  
ReqIDs: R03, R22

## Implemented Coverage

The regression tests cover:

- login success
- invalid login rejection
- authenticated protected request success
- missing bearer token rejection
- invalid bearer token rejection
- expired session rejection
- revoked session rejection
- logout invalidation
- logged-out/revoked token rejection
- trusted actor-context population
- protected-route consumption of trusted actor context
- audit attribution from trusted actor context
- legacy actor-context compatibility

## Validation Evidence

Targeted regression tests passed:

```text
node --loader ts-node/esm --test src/modules/auth/api/auth-regression.test.ts src/modules/auth/application/logout-user.test.ts src/modules/auth/api/auth.routes.test.ts src/modules/auth/api/authenticated-request.test.ts src/modules/auth/application/login-user.test.ts src/modules/auth/domain/auth-session.test.ts src/modules/auth/domain/platform-user-credential.test.ts
```

Build passed:

```text
npm run build
```

Full regression suite passed:

```text
npm test
```

## Notes

This task implements PBI-260 only.

Out of scope and not implemented:

- new auth/session features
- browser-level frontend tests
- external IdP tests
- SSO
- MFA
- password recovery
- public registration
- route authorization redesign
- broad protected-route lockdown
- PBI-261 documentation updates
- PBI-262 merge-gate/rebase guidance

## Closure Decision

PBI-260 is ready to close because:

- auth success and failure behavior is covered by automated tests
- protected request validation is covered
- logout invalidation is covered
- actor-context consumption is covered
- audit attribution from trusted actor context is covered
- build and full regression tests pass
