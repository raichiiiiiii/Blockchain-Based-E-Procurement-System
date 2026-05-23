# MVP Authentication and Session Contract

Status: Approved for PBI-254 implementation baseline  
Owner: Security Engineer / Backend Engineer  
Related PBIs: PBI-253, PBI-254, PBI-255, PBI-256, PBI-257, PBI-258, PBI-259, PBI-260, PBI-261, PBI-262  
Related requirements: R03, R22  
Related ADR: `docs/architecture/adr/ADR-002-auth-session-management-boundary.md`

## 1. Purpose

This document defines the MVP authentication and session contract for platform users. It is the binding source for login, issued-session handling, authenticated request validation, logout or invalidation, trusted actor-context derivation, auth failure responses, and downstream protected-route consumption.

This contract prevents feature branches from inventing local authentication or actor-context semantics.

## 2. Scope

In scope:

- platform-user login
- local MVP session issuance
- bearer authenticated requests
- session expiry
- logout or session invalidation
- missing, invalid, expired, or revoked session handling
- trusted actor-context population
- auth failure response shape
- consumer guidance for protected routes and audit emitters

Out of scope:

- external identity provider integration
- SSO
- MFA
- password recovery
- public account creation
- public SME self-registration
- DID/VC federation
- browser session UI
- route-specific authorization policy redesign

## 3. Authentication strategy

MVP authentication uses a platform-owned opaque bearer session value. API consumers must not parse the bearer value or infer authorization decisions from its shape. Backend validation owns session verification and actor-context derivation.

Protected requests use the standard authorization header with the bearer scheme.

## 4. Login endpoint

`POST /api/v1/auth/login`

Request fields:

- `username`: required string
- `password`: required string

Request rules:

- trim leading and trailing whitespace from `username`
- do not trim the submitted secret value before credential comparison
- empty `username` or secret returns `VALIDATION_ERROR`
- invalid credentials return `UNAUTHORIZED`
- login does not create accounts
- login does not reveal which credential factor failed

Success response shape:

```json
{
  "data": {
    "sessionToken": "opaque-session-value",
    "sessionId": "auth-session-123",
    "expiresAt": "2026-05-23T12:00:00.000Z",
    "actor": {
      "actorUserId": "user-123",
      "actorOrganizationId": "org-123",
      "actorRoleCodes": ["auditor"],
      "authenticationSessionId": "auth-session-123",
      "authenticationMethod": "localPassword"
    }
  }
}
```

## 5. Logout endpoint

`POST /api/v1/auth/logout`

Logout requires a valid bearer session. Successful logout invalidates the current session so it cannot authorize later protected requests.

Success response shape:

```json
{
  "data": {
    "loggedOut": true
  }
}
```

Logout does not delete user records and does not revoke roles or organization membership.

## 6. Session model

Session records use this semantic shape:

```ts
export type AuthSession = {
  sessionId: string;
  tokenHash: string;
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  status: 'active' | 'revoked' | 'expired';
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  authenticationMethod: 'localPassword';
};
```

Status semantics:

- `active`: may authenticate requests until `expiresAt`
- `expired`: past `expiresAt` and must be rejected
- `revoked`: explicitly invalidated and must be rejected

Default MVP session duration is 8 hours. This value may later become configurable.

## 7. Authenticated request validation

Protected-route middleware must:

1. read the authorization header
2. require the bearer scheme
3. validate the session through the session repository or validation seam
4. reject missing, malformed, invalid, expired, or revoked sessions before business logic runs
5. populate trusted actor context for route handlers and audit emitters

## 8. Trusted actor context

Authenticated request validation populates:

```ts
export type TrustedActorContext = {
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId: string;
  authenticationMethod: 'localPassword';
  isAuthenticated: true;
};
```

Rules:

- protected routes must read actor identity from trusted actor context
- protected routes must not trust client-authored actor headers for production behavior
- client-authored actor headers may remain only as documented test scaffolding
- audit emitters for protected actions must use the same trusted actor context

## 9. Auth failure responses

Authentication failures use the standard error envelope.

Missing credentials:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Malformed authorization header:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authorization header"
  }
}
```

Invalid login credentials:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid username or password"
  }
}
```

Invalid or unusable session:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired session"
  }
}
```

## 10. Authorization boundary

Authentication proves that a request has a valid actor session. Authorization remains route-specific.

Examples:

- auditor-only routes still check the auditor role after authentication
- administrator-only routes still check administrator role or permission after authentication
- organization status and deactivation checks remain separate unless a later task integrates them explicitly

## 11. Audit expectations

Authentication-sensitive events should be auditable where applicable:

- successful login
- failed login
- logout or session invalidation
- invalid protected request attempt
- expired or revoked session use

Audit records must not store raw credential secrets or raw bearer session values. Session references should use `sessionId` or token hash metadata only.

## 12. Threat assumptions

MVP threat assumptions:

- attackers may send forged actor headers
- attackers may omit or modify bearer sessions
- attackers may replay revoked or expired sessions
- attackers may attempt invalid login
- attackers may attempt protected routes without authentication
- server-side code is trusted to validate sessions and populate actor context
- transport-layer protection is assumed for deployment, but not implemented in application code

## 13. Security rules

- credential secrets must not be returned in responses
- credential secrets must not be logged
- raw bearer session values must not be logged
- session validation uses token hashes or equivalent validation seams where stored
- error responses must not reveal whether a username exists
- protected-route business logic must not run when authentication fails

## 14. Consumer guidance

Backend protected routes must consume trusted actor context populated by auth middleware. They must not parse bearer values directly.

Audit emitters must use trusted actor context for actor attribution.

PBI-017 dashboard routing and role-specific widgets may consume authenticated actor context but must not implement login or session mechanics.

PBI-005, PBI-002, PBI-006, PBI-007, and PBI-015 protected workflow branches must derive actor attribution from the shared auth/session middleware once it lands on `main`.

## 15. Later implementation ownership

- PBI-255 owns repository seams and in-memory adapter.
- PBI-256 owns login endpoint and session issuance.
- PBI-257 owns authenticated request validation middleware.
- PBI-258 owns protected-route and audit-emitter integration.
- PBI-259 owns logout/session invalidation.
- PBI-260 owns full auth regression tests.
- PBI-261 owns durable doc updates after implementation.
- PBI-262 owns merge-gate/rebase guidance.
