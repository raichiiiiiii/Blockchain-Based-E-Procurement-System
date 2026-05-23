# PBI-257 Authenticated Request Validation Evidence

## Scope

PBI-257 implements shared authenticated-request validation middleware for protected routes.

Feature: PBI-253  
Task: PBI-257  
ReqIDs: R03, R22

## Files Changed

- `src/modules/auth/application/session-token.ts`
- `src/modules/auth/api/authenticated-request.ts`
- `src/modules/auth/api/authenticated-request.test.ts`
- `src/app/plugins/actor-context-plugin.ts`

## Implemented Behavior

The implementation adds:

- bearer authorization header parsing
- session token hashing for repository lookup
- session lookup through `AuthSessionRepository`
- missing authorization rejection
- malformed authorization header rejection
- unsupported authorization scheme rejection
- invalid session rejection
- expired session rejection
- revoked session rejection
- trusted actor-context population
- reusable authenticated-request preHandler seam for protected routes

## Trusted Actor Context

Valid authenticated requests populate:

```ts
{
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId: string;
  authenticationMethod: 'localPassword';
  isAuthenticated: true;
}
```

For compatibility with existing protected-route code, the actor-context seam also preserves transitional legacy fields:

```ts
{
  userId?: string;
  authorizationContext: {
    roles?: string[];
  };
}
```

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

Invalid, expired, or revoked session returns:

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

- valid bearer token populates trusted actor context
- actor context includes `actorUserId`
- actor context includes `actorOrganizationId` when present
- actor context includes `actorRoleCodes`
- actor context includes `authenticationSessionId`
- actor context includes `authenticationMethod`
- actor context includes `isAuthenticated: true`
- legacy compatibility fields remain available
- missing authorization header returns HTTP 401
- malformed authorization header returns HTTP 401
- unsupported authorization scheme returns HTTP 401
- invalid token returns HTTP 401
- expired session returns HTTP 401
- expired active session is marked `expired`
- revoked session returns HTTP 401
- authentication failure prevents protected handler execution

## Validation Evidence

Targeted authenticated-request test passed:

```text
node --loader ts-node/esm --test src/modules/auth/api/authenticated-request.test.ts
```

Auth regression tests passed:

```text
node --loader ts-node/esm --test src/modules/auth/api/authenticated-request.test.ts src/modules/auth/application/login-user.test.ts src/modules/auth/api/auth.routes.test.ts src/modules/auth/domain/auth-session.test.ts src/modules/auth/domain/platform-user-credential.test.ts
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

This task implements PBI-257 only.

Out of scope and not implemented:

- logout endpoint
- route-specific authorization rules
- role/permission policy redesign
- organization/user deactivation checks
- dashboard UI behavior
- broad protected route migration
- audit emitter integration
- public registration
- external IdP
- SSO
- MFA
- password recovery

## Closure Decision

PBI-257 is ready to close because:

- protected routes now have a reusable authenticated-request validation seam
- trusted actor context is populated from validated session state
- missing, invalid, expired, and revoked sessions are rejected before protected handlers run
- existing legacy actor-context consumers remain compatible
- build and full regression tests pass
