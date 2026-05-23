# Auth Session API Consumer Note

Status: Approved PBI-261 consumer note  
Owner: Platform / Backend  
Related PBIs: PBI-253, PBI-254, PBI-255, PBI-256, PBI-257, PBI-258, PBI-259, PBI-260, PBI-261  
Related requirements: R03, R22  
Primary contract: `docs/contracts/AUTH_SESSION_CONTRACT.md`  
API baseline: `docs/contracts/API_CONTRACTS.md`

## 1. Purpose

This note records the durable API-consumer guidance for the MVP auth/session boundary after implementation and regression validation.

`API_CONTRACTS.md` continues to define the global API envelope, base path, error-envelope family, and protected endpoint convention. The detailed binding auth/session semantics are defined in `AUTH_SESSION_CONTRACT.md`.

## 2. Implemented auth endpoints

### Login

```text
POST /api/v1/auth/login
```

Valid credentials return:

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

Invalid credentials return:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid username or password"
  }
}
```

Validation failures use the standard `VALIDATION_ERROR` envelope.

### Logout

```text
POST /api/v1/auth/logout
```

Logout requires `Authorization: Bearer <sessionToken>`.

Valid active sessions return:

```json
{
  "data": {
    "loggedOut": true
  }
}
```

Logout revokes the current session. It does not delete user records, credential records, role assignments, or organization membership records.

## 3. Protected request validation

Protected requests use:

```text
Authorization: Bearer <sessionToken>
```

The server validates the opaque bearer session value by hashing the token and looking up the stored session token hash. Raw bearer token values must not be persisted or logged.

Rejected protected requests use these response families:

Missing authorization header:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Malformed or unsupported authorization header:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authorization header"
  }
}
```

Invalid, expired, or revoked session:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired session"
  }
}
```

## 4. Trusted actor context

Valid authenticated requests populate trusted actor context from server-validated session state.

Canonical fields:

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

Transitional compatibility fields remain available for existing protected-route tests and pre-auth scaffolding:

```ts
{
  userId?: string;
  authorizationContext: {
    roles?: string[];
  };
}
```

New protected-route and audit code must prefer the canonical fields through the shared request actor-context helper. Client-authored actor identifiers must not be treated as authoritative.

## 5. Auth vs authorization

Authentication proves a request has a valid session and produces trusted actor context.

Authorization remains route-specific and application-specific. Role checks, permission checks, deactivation-aware checks, and organization lifecycle checks are not replaced by authentication.

## 6. Consumer rules for feature branches

PBI-005, PBI-002, PBI-006, PBI-007, PBI-015, and PBI-017 consumers must:

- use the shared auth/session contract rather than defining local token semantics
- read actor attribution from trusted request actor context
- preserve route-specific authorization checks
- avoid trusting client-authored actor IDs for production behavior
- keep audit attribution aligned with trusted actor context
- preserve standardized `UNAUTHORIZED`, `FORBIDDEN`, and `VALIDATION_ERROR` response envelopes

PBI-017 may consume authenticated actor context for dashboard state and role-specific behavior, but PBI-017 does not own login, logout, session issuance, or session validation mechanics.
