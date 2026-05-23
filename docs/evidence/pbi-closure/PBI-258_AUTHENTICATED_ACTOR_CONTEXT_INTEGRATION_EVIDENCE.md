# PBI-258 Authenticated Actor Context Integration Evidence

## Scope

PBI-258 integrates authenticated actor context consumption into protected route and audit attribution patterns.

Feature: PBI-253  
Task: PBI-258  
ReqIDs: R03, R22

## Files Changed

- `src/modules/auth/api/request-actor-context.ts`
- `src/modules/access-control/api/routes.ts`
- `src/modules/membership/api/routes.ts`
- `src/app/server.ts`

## Implemented Behavior

The implementation adds a normalized request actor-context helper and updates selected protected-route/audit attribution paths to consume actor identity from the trusted request lifecycle.

The helper exposes:

- `actorUserId`
- `actorOrganizationId`
- `actorRoleCodes`
- `authenticationSessionId`
- `authenticationMethod`

The integration preserves compatibility with the transitional legacy actor-context fields:

- `userId`
- `authorizationContext.roles`

## Actor Attribution Behavior

Protected-route and audit paths now prefer the authenticated actor context where available and fall back to the legacy actor context only for compatibility with existing route tests and scaffolding.

This keeps current route behavior stable while enabling PBI-005, PBI-002, and PBI-017 branches to consume the shared authenticated actor context after integration.

## Protected Route Compatibility

The implementation avoids broad route lockdown in this task.

PBI-258 does not force every existing route to require bearer authentication yet. It proves the actor-source integration seam and preserves existing route behavior so business authorization rules are not changed during this task.

## Validation Coverage

Validated behavior:

- protected route actor attribution can consume authenticated request context
- audit attribution can consume the same normalized actor context
- legacy actor-context fields remain compatible
- existing protected route authorization behavior remains unchanged
- full regression tests pass

## Validation Evidence

Targeted auth tests passed:

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

This task implements PBI-258 only.

Out of scope and not implemented:

- logout endpoint
- route-specific authorization redesign
- role/permission policy redesign
- organization/user deactivation rule changes
- dashboard UI behavior
- broad protected route migration
- public registration
- external IdP
- SSO
- MFA
- password recovery

## Closure Decision

PBI-258 is ready to close because:

- protected routes have a normalized helper for trusted actor-context consumption
- selected audit attribution paths consume actor identity from the trusted request lifecycle
- legacy actor-context compatibility is preserved
- business authorization rules were not changed
- build and full regression tests pass
