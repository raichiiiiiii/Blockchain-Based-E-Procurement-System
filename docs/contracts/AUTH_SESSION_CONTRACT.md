# Auth Session Contract

Status: Proposed
Date: 2026-05-23
Owners: Security / Platform
Related ADR: docs/architecture/adr/ADR-002-auth-session-management-boundary.md
Related PBIs: PBI-253, PBI-254, PBI-255, PBI-256, PBI-257, PBI-258, PBI-259, PBI-260, PBI-261, PBI-262
Related requirements: R03, R22

## 1. Purpose

This document defines the MVP authentication and session contract used by protected backend routes and consuming feature branches.

The goal is to provide a stable contract for login, session or token issuance, authenticated request validation, trusted actor-context derivation, logout or session invalidation, and standardized auth failure behavior.

This contract exists so PBI-005, PBI-002, PBI-017, PBI-006, PBI-007, and PBI-015 can consume actor context consistently without redefining authentication behavior in each feature branch.

## 2. Non-goals

The MVP auth/session contract does not include external enterprise identity-provider integration, SSO, MFA, password recovery, public account creation, public SME self-registration, DID/VC federation, authorization policy redesign, role assignment redesign, or dashboard UI implementation.

## 3. Contract principles

1. Authentication proves the user/session identity.
2. Authorization decides whether the authenticated actor may perform a specific action.
3. Audit attribution must use server-derived actor context, not client-authored actor headers.
4. Protected routes must not trust userId, organizationId, role, or permission values supplied directly by request payload or arbitrary headers.
5. Authentication failures must use the standardized API error-envelope family.
6. Feature branches must consume this contract rather than defining local auth behavior.

## 4. Login contract

Endpoint:

```text
POST /auth/login
```

Request fields:

```text
user identifier: string
secret credential: string
```

The exact user identifier field may be finalized during PBI-254. If email is used instead of username, update this contract before implementation closes.

Successful response shape:

```text
status: 200
session.accessToken: string
session.tokenType: Bearer
session.expiresAt: ISO-8601 timestamp
actor.actorUserId: string
actor.actorOrganizationId: string or null
actor.roleCodes: string array
```

The access token may represent a signed token or opaque session reference depending on the implementation decision made in PBI-254.

Failed login response shape:

```text
status: 401
error.code: AUTHENTICATION_FAILED
error.message: Invalid credentials
error.details: object
```

## 5. Authenticated request contract

Protected routes must receive authentication through the approved transport mechanism.

Recommended MVP form:

```text
Authorization: Bearer <access-token>
```

Protected routes must not rely on raw client-authored actor headers for trusted decisions.

## 6. Trusted actor context

After authentication succeeds, middleware or plugin code must populate trusted actor context for route handlers and audit emitters.

Minimum actor context fields:

```text
actorUserId: string
actorOrganizationId: optional string
roleCodes: optional string array
sessionId: optional string
authenticationMethod: mvp-session or mvp-token
```

Route handlers should consume the request actor context through a shared helper or typed request extension, not by parsing sessions or tokens directly inside business routes.

## 7. Invalid or missing authentication

Missing authentication response shape:

```text
status: 401
error.code: AUTHENTICATION_REQUIRED
error.message: Authentication is required
error.details: object
```

Invalid, expired, or revoked session response shape:

```text
status: 401
error.code: INVALID_SESSION
error.message: The session is invalid or expired
error.details: object
```

Authorization failures after successful authentication remain authorization failures and should use the approved forbidden response pattern rather than authentication errors.

## 8. Logout or session invalidation

Endpoint:

```text
POST /auth/logout
```

Authentication:

```text
Authorization: Bearer <access-token>
```

Successful response shape:

```text
status: 204
body: empty
```

After logout or invalidation, the same session or token must no longer authorize protected requests.

## 9. Audit expectations

The MVP auth/session implementation should support audit attribution for protected actions.

Minimum expectations:

- protected action audit events use actorUserId from trusted actor context
- actorOrganizationId is included when available and relevant
- auth/session failures may be logged internally if the audit policy requires it
- route handlers must not use client-authored actor identity for audit attribution

## 10. Consumer guidance

### PBI-005

Use trusted actor context when recording procure-to-pay lifecycle events.

### PBI-002

Use trusted actor context for compliance officer, reviewer, and requester attribution.

### PBI-017

Use trusted actor context for dashboard state resolution. PBI-017 must not implement login, session issuance, logout, account creation, or public registration.

### PBI-006 and PBI-007

Use trusted actor context for escrow, PLS contract, activation, distribution, release, and status-change audit records.

### PBI-015

Use trusted actor context for export requester identity, export job creation, retrieval, and audit evidence.

## 11. Test expectations

The auth/session implementation should include tests for:

- successful login
- invalid login
- missing authentication rejection
- invalid authentication rejection
- expired or revoked session rejection, if represented
- logout or session invalidation
- protected route access with valid auth
- protected route rejection without valid auth
- trusted actor context population
- audit attribution through trusted actor context

## 12. Open implementation decisions

PBI-254 must finalize:

- signed token versus opaque session reference
- exact login identifier field
- session expiration duration
- whether refresh tokens are excluded from MVP
- storage adapter for session or token state
- test-only handling for legacy actor headers, if any

Until PBI-254 closes, this file is a proposed contract and should not be treated as fully accepted implementation detail.
