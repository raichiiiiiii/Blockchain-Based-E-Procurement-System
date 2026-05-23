# PBI-259 Logout Session Invalidation Evidence

## Scope

PBI-259 implements MVP logout/session invalidation behavior and verifies that invalidated sessions no longer authorize protected request validation.

Feature: PBI-253  
Task: PBI-259  
ReqIDs: R03, R22

## Files Changed

- `src/modules/auth/application/logout-user.ts`
- `src/modules/auth/application/logout-user.test.ts`
- `src/modules/auth/api/auth.routes.ts`
- `src/modules/auth/api/auth.routes.test.ts`
- `docs/evidence/pbi-closure/PBI-259_LOGOUT_SESSION_INVALIDATION_EVIDENCE.md`

## Implemented Behavior

The implementation adds:

- logout application service
- logout API route
- current-session invalidation through session revocation
- revoked-session handling
- expired-session handling
- invalid-session response mapping
- route tests for logout success and failure paths
- service tests for session revocation semantics

## Route Implemented

```text
POST /api/v1/auth/logout
```

## Success Response Shape

A valid active bearer session returns:

```json
{
  "data": {
    "loggedOut": true
  }
}
```

## Session Invalidation Semantics

When logout succeeds:

- the matching active session is retained
- the matching active session status becomes `revoked`
- `revokedAt` is recorded as an ISO timestamp
- actor/session metadata is preserved
- credential records are not deleted
- user records are not deleted
- role/permission data is not changed

## Failure Behavior

Missing authorization header returns:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Malformed or unsupported authorization header returns:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authorization header"
  }
}
```

Invalid, expired, or already revoked session returns:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired session"
  }
}
```

## Validation Coverage

Validated behavior:

- logout with valid bearer token returns HTTP 200 with `{ data: { loggedOut: true } }`
- logout revokes the matching active session
- revoked session has `status = "revoked"`
- revoked session has `revokedAt`
- missing authorization header returns HTTP 401 `UNAUTHORIZED`
- malformed authorization header returns HTTP 401 `UNAUTHORIZED`
- unsupported authorization scheme returns HTTP 401 `UNAUTHORIZED`
- invalid token returns HTTP 401 `UNAUTHORIZED`
- expired session returns HTTP 401 `UNAUTHORIZED`
- repeated logout with an already revoked token returns HTTP 401 `UNAUTHORIZED`
- logout does not delete platform credential records
- logout does not alter actor role data
- existing PBI-257 invalid/expired/revoked session behavior remains covered by authenticated-request middleware tests
- raw bearer token is not persisted

## Validation Evidence

Targeted logout/auth tests passed:

```text
node --loader ts-node/esm --test src/modules/auth/application/logout-user.test.ts src/modules/auth/api/auth.routes.test.ts src/modules/auth/api/authenticated-request.test.ts src/modules/auth/application/login-user.test.ts src/modules/auth/domain/auth-session.test.ts src/modules/auth/domain/platform-user-credential.test.ts
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

This task implements PBI-259 only.

Out of scope and not implemented:

- password reset
- account recovery
- external IdP logout propagation
- SSO
- MFA
- public registration
- browser/UI logout behavior
- route-specific authorization redesign
- broad protected-route migration
- audit emitter redesign
- PBI-260 regression closure task

## Closure Decision

PBI-259 is ready to close because:

- authenticated logout invalidates the current session
- revoked sessions are rejected by auth/session validation semantics
- invalid, expired, and revoked sessions return the approved `UNAUTHORIZED` responses
- credential/user/role records are preserved
- build and full regression tests pass
