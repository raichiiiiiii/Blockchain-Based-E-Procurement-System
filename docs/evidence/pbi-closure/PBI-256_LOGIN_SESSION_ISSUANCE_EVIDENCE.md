# PBI-256 Login and Session Issuance Evidence

## Scope

PBI-256 implements the MVP login endpoint and session/token issuance behavior.

Feature: PBI-253  
Task: PBI-256  
ReqIDs: R03, R22

## Files Changed

- `src/modules/auth/application/login-user.ts`
- `src/modules/auth/application/login-user.test.ts`
- `src/modules/auth/api/auth.routes.ts`
- `src/modules/auth/api/auth.routes.test.ts`
- `src/app/server.ts`

## Implemented Behavior

The implementation adds:

- login application service
- credential verification against `PlatformUserCredentialRepository`
- active auth session creation through `AuthSessionRepository`
- opaque session token generation
- token hash persistence
- raw session token return only in successful login response
- `POST /api/v1/auth/login` route
- validation handling for blank username/password
- invalid credential handling with `UNAUTHORIZED`

## Route Implemented

```text
POST /api/v1/auth/login
```

## Success Response Shape

```json
{
  "data": {
    "sessionToken": "opaque-session-value",
    "sessionId": "auth-session-id",
    "expiresAt": "2026-05-23T12:00:00.000Z",
    "actor": {
      "actorUserId": "user-123",
      "actorRoleCodes": [],
      "authenticationSessionId": "auth-session-id",
      "authenticationMethod": "localPassword"
    }
  }
}
```

## Validation and Failure Behavior

Validated behavior:

- valid credentials return HTTP 200 with session data
- username is trimmed before credential lookup
- password is not trimmed before verification
- blank username returns HTTP 400 with `VALIDATION_ERROR`
- blank password returns HTTP 400 with `VALIDATION_ERROR`
- unknown username returns HTTP 401 with `UNAUTHORIZED`
- wrong password returns HTTP 401 with `UNAUTHORIZED`
- invalid credential failures do not reveal whether username or password failed
- invalid credential failures do not create a session
- route maps login validation and unauthorized errors to the approved response shapes

## Security Behavior

Validated security expectations:

- raw session token is returned only in the login success response
- persisted auth session stores `tokenHash`
- persisted auth session does not store raw session token
- issued session status is `active`
- issued session uses `authenticationMethod = "localPassword"`
- default session expiry follows the MVP contract duration

## Validation Evidence

Targeted auth tests passed:

```text
node --loader ts-node/esm --test src/modules/auth/application/login-user.test.ts src/modules/auth/api/auth.routes.test.ts src/modules/auth/domain/auth-session.test.ts src/modules/auth/domain/platform-user-credential.test.ts
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

This task implements PBI-256 only.

Out of scope and not implemented:

- account creation
- password reset
- MFA
- SSO
- external IdP integration
- public registration
- authenticated request middleware
- protected route integration
- logout endpoint
- audit emitter integration
- dashboard/UI behavior

## Closure Decision

PBI-256 is ready to close because:

- valid platform credentials can issue a session/token
- invalid credentials are rejected with the approved response
- session persistence uses token hash semantics
- the login route follows the accepted auth/session contract
- build and full regression tests pass
