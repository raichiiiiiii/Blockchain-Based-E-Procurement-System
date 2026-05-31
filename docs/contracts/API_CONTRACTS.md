# API Contracts

Status: Draft for Sprint 1 baseline  
Owner: Backend + Frontend + QA  
Last updated: 2026-04-22

## 1. Purpose

This document defines the shared external contract used by backend, frontend, tests, and Aider task sessions.

This file is allowed to carry Sprint 1 provisional assumptions, but those assumptions must be marked explicitly.

## 2. Global conventions

### protocol
- REST JSON
- Base path: `/api/v1`

### content type
- Request: `application/json`
- Response: `application/json`

### authentication
- Protected endpoints expect `Authorization: Bearer <token>`
- Protected endpoints assume a stable authenticated user context exists at runtime
- Protected write actions and sensitive reads must derive actor identity from authenticated server-side request context

[FLAG-USER-IDENTITY]
The identity provider and user provisioning model are not frozen. This contract only assumes a stable opaque `userId` is available to protected flows.

[FLAG-ACTOR-SOURCE]
The trusted actor source for protected actions is authenticated server-side request context. Temporary scaffolding such as client-supplied actor headers may exist in local or transitional implementations, but they are not authoritative public-contract inputs and must not be treated as the source of truth for authorization or audit attribution.

### naming
- JSON field names use `camelCase`

### timestamps
- Use ISO 8601 UTC strings unless a field is explicitly date-only

### identifiers
- Public IDs are opaque strings

[FLAG-ID-STRATEGY]
Final public ID format is not frozen. UUID is acceptable, but this document only guarantees opaque string semantics.

### business identifiers
Sprint 1 provisional assumption:
- member organizations use `registrationNumber` as the MVP business identifier
- future identifiers such as LEI may be added later without changing public system IDs

## 3. Standard success envelope

Default success shape:

```json
{
  "data": {}
}
```

List shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

[FLAG-PAGINATION-STANDARD]
Pagination is only draft-level here and should be finalized before list endpoints proliferate.

## 4. Standard error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {},
    "requestId": "req_123"
  }
}
```

Minimum error codes:
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `EXTERNAL_SERVICE_ERROR`
- `INTERNAL_ERROR`

## 5. Validation error response standard

All validation failures use a common error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "string",
    "details": {
      "issues": []
    }
  }
}
```

Rules:
- Both schema-validation failures and application-validation failures use this envelope
- The `details.issues` array is optional and may be omitted when no specific issues are available
- Raw framework validation payloads (e.g., Fastify validation errors) must not be exposed directly
- Schema validation and application validation share route-independent semantics
- The `message` field provides a human-readable summary of the validation failure
- The `issues` array, when present, contains specific validation issue descriptions

[FLAG-ERROR-ENVELOPE]
Schema-validation failures and application-level validation failures must converge on this standard error-envelope family. Routes must not invent route-specific error shapes while this flag remains open.

## 6. Membership contracts

### 6.1 Create member organization

`POST /api/v1/member-organizations`

Request:

```json
{
  "registrationNumber": "string",
  "legalName": "string",
  "displayName": "string",
  "organizationType": "string",
  "businessType": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "countryCode": "string",
  "notes": "string"
}
```

Validation and sanitization behavior:
- Leading and trailing whitespace is trimmed from all string fields
- Required fields (`registrationNumber`, `legalName`, `organizationType`) must not be empty after trimming
- Optional string fields that are empty or contain only whitespace are treated as absent
- Unicode characters are preserved in all string fields
- Ordinary punctuation and special characters are accepted in all string fields
- Field lengths are not currently limited by validation
- Email format is not currently enforced for `contactEmail`
- Country code format is not currently enforced for `countryCode`
- Character whitelisting is not currently enforced

Response:

```json
{
  "data": {
    "id": "org_123",
    "registrationNumber": "string",
    "legalName": "string",
    "displayName": "string",
    "organizationType": "string",
    "businessType": "string",
    "status": "pendingReview",
    "createdAt": "2026-03-15T00:00:00Z",
    "updatedAt": "2026-03-15T00:00:00Z"
  }
}
```

Business rules:
- `registrationNumber` must be unique for Sprint 1
- `legalName` is required
- `organizationType` is required
- duplicate registration returns `CONFLICT`
- newly created organizations are provisionally stored as `pendingReview`

[FLAG-MEMBERSHIP-INITIAL-STATE]
The initial status is provisionally drafted as `pendingReview`, but backlog acceptance text previously expected `active`. Reconcile before treating the contract as fully final.

[FLAG-MEMBERSHIP-UNIQUENESS]
The canonical MVP uniqueness key is drafted as `registrationNumber`; confirm later whether additional jurisdiction-specific identifiers are required.

### 6.2 Update member organization status

`PATCH /api/v1/member-organizations/{organizationId}/status`

Request:

```json
{
  "status": "active",
  "reason": "string"
}
```

Allowed status values for Sprint 1 baseline:
- `active`
- `inactive`
- `suspended`
- `deleted`

Response:

```json
{
  "data": {
    "id": "org_123",
    "status": "active",
    "updatedAt": "2026-03-15T00:00:00Z"
  }
}
```

Rules:
- `deleted` is logical/administrative, not a destructive delete contract
- inactive organizations remain historically readable
- non-active organizations may be blocked from protected actions
- status transitions must conform to the organization lifecycle model defined in `STATE_MODELS.md`
- permitted transitions for the Sprint 1 baseline are:
  - `pendingReview -> active`
  - `pendingReview -> inactive`
  - `active -> inactive`
  - `active -> suspended`
  - `inactive -> active`
  - `suspended -> active`
  - `inactive -> deleted`
- prohibited transitions for the Sprint 1 baseline include:
  - direct `pendingReview -> deleted` in normal flow
  - direct `suspended -> deleted` in normal flow
  - any transition from `deleted` to another state

[FLAG-MEMBERSHIP-STATE-SET]
The organization lifecycle used by this endpoint follows the current provisional five-state Sprint 1 baseline defined in `STATE_MODELS.md`.

## 7. Role catalog contracts

[FLAG-ROLE-CATALOG]
Role catalog policy including reserved-role rules and exact permission vocabulary are not yet frozen.

### 7.1 Create role

`POST /api/v1/roles`

Request:

```json
{
  "roleCode": "string",
  "displayName": "string",
  "scope": "organization",
  "description": "string",
  "permissions": ["string"],
  "status": "active",
  "isSystemReserved": false
}
```

Required fields:
- `roleCode`
- `displayName`
- `scope`
- `permissions`
- `status`
- `isSystemReserved`

Allowed scope values:
- `organization`

Allowed status values:
- `active`
- `inactive`

Response (success):

```json
{
  "data": {
    "id": "role_123",
    "roleCode": "string",
    "displayName": "string",
    "scope": "organization",
    "description": "string",
    "permissions": ["string"],
    "status": "active",
    "isSystemReserved": false
  }
}
```

Authorization:
- Requires admin privileges
- Non-admin requests receive `403 FORBIDDEN`

Error responses:
- `409 CONFLICT` when attempting to create a role with a `roleCode` that already exists within the same `scope`
- `400 VALIDATION_ERROR` when:
  - Required fields are missing
  - `scope` is not one of the allowed values
  - `status` is not one of the allowed values

Audit behavior:
- Successful creation emits a `createRole` audit event with `outcome: "success"`
- Duplicate role creation attempts emit a `createRole` audit event with `outcome: "conflict"`
- Forbidden attempts (non-admin) do not emit audit events
- Invalid requests (validation failures) do not emit audit events

### 7.2 Update role

`PATCH /api/v1/roles/{roleId}`

Request:

```json
{
  "displayName": "string",
  "description": "string",
  "permissions": ["string"],
  "status": "inactive"
}
```

Mutable fields:
- `displayName`
- `description`
- `permissions`
- `status`

Immutable fields (attempts to modify will result in `400 VALIDATION_ERROR`):
- `roleCode`
- `scope`
- `isSystemReserved`

Allowed status values:
- `active`
- `inactive`

Response (success):

```json
{
  "data": {
    "id": "role_123",
    "roleCode": "string",
    "displayName": "string",
    "scope": "organization",
    "description": "string",
    "permissions": ["string"],
    "status": "inactive",
    "isSystemReserved": false
  }
}
```

Authorization:
- Requires admin privileges
- Non-admin requests receive `403 FORBIDDEN`

Error responses:
- `404 NOT_FOUND` when attempting to update a role that does not exist
- `400 VALIDATION_ERROR` when:
  - Attempting to modify immutable fields
  - `status` is not one of the allowed values
  - Request body is empty

Audit behavior:
- Successful updates emit an `updateRole` audit event with `outcome: "success"`
- Attempts to update non-existent roles emit an `updateRole` audit event with `outcome: "notFound"`
- Forbidden attempts (non-admin) do not emit audit events
- Invalid requests (validation failures) do not emit audit events

### 7.3 List roles

`GET /api/v1/roles`

Response:

```json
{
  "data": [
    {
      "id": "role_123",
      "roleCode": "string",
      "displayName": "string",
      "scope": "organization",
      "description": "string",
      "permissions": ["string"],
      "status": "active",
      "isSystemReserved": false
    }
  ]
}
```

Behavior:
- Returns all roles in the system
- No pagination is implemented
- No filtering or sorting is supported
- No admin authorization is currently enforced for this endpoint

## 8. Role assignment contracts

### 8.1 Assign role to user

`POST /api/v1/role-assignments`

Request:

```json
{
  "userId": "user_123",
  "organizationId": "org_123",
  "roleId": "role_123"
}
```

Authorization:
- Requires admin privileges from trusted server-derived actor context
- Non-admin requests receive `403 FORBIDDEN`

Response:

```json
{
  "data": {
    "id": "assign_123",
    "userId": "user_123",
    "organizationId": "org_123",
    "roleId": "role_123",
    "status": "active",
    "createdAt": "2026-03-15T00:00:00Z"
  }
}
```

Provisional Sprint 1 rules:
- `userId`, `organizationId`, and `roleId` are required
- assignment requires active role and non-deleted organization
- duplicate active assignment of the same `roleId` to the same `userId` in the same `organizationId` returns `CONFLICT`
- one user may hold multiple distinct active roles in the same organization unless a later separation-of-duties rule forbids a specific combination
- one user may hold roles across multiple organizations
- assignment requires that the user exists and is a member of the specified organization, otherwise returns `400 VALIDATION_ERROR`

### 8.2 Remove role assignment

`DELETE /api/v1/role-assignments/{assignmentId}`

Response:

```json
{
  "data": {
    "id": "assign_123",
    "status": "revoked"
  }
}
```

Rules:
- revoked assignments remain historically visible
- expired assignments remain read-only historical records

[FLAG-USER-IDENTITY]
The source of truth for `userId` is not confirmed.

[FLAG-ASSIGNMENT-MULTIPLICITY]
General many-to-many assignment is the current working assumption, but internal-vs-member dual-role constraints are not yet frozen.

### 8.3 Assignment contract baseline

This section documents the minimal assignment contract baseline needed to support safe implementation of role assignment features. It serves as a prerequisite for PBI-050 and subsequent assignment work.

#### Concept
A role assignment depends on:
- a user reference
- an organization reference
- a role reference

#### Operational states
- only `active` assignments are operational
- `revoked` assignments remain historical / visible for auditability

#### Provisional assumptions
- user identity semantics are still provisional
- assignment multiplicity policy is still unresolved
- assignment implementation must not assume a final multiplicity rule until the flag is resolved

This baseline exists to support safe future assignment implementation, not to finalize the full assignment feature contract yet.

## 9. Deactivation and protected-access contracts

### 9.1 Protected action failure

When a deactivated organization or user attempts a protected action:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "This actor is not allowed to perform the requested action in its current status",
    "details": {
      "organizationStatus": "inactive",
      "userStatus": "active"
    },
    "requestId": "req_123"
  }
}
```

### 9.2 Deactivation behavior definitions

#### Active vs Inactive User Behavior

An active user is one whose account status permits access to the system. An inactive user is one whose account has been deactivated and no longer has access privileges.

When a user is deactivated:
- All protected write operations initiated by that user are denied with the standard protected action failure response
- Access to sensitive read operations may be restricted depending on implementation
- General read operations remain accessible unless specifically restricted by sensitive read policies

#### Active vs Inactive Organization Behavior

An active organization is one whose status permits full functionality within the system. An inactive organization is one whose status has been deactivated, restricting certain operations.

When an organization is deactivated:
- New role assignments targeting the organization are denied with the standard protected action failure response
- Modifications to existing role assignments for the organization are denied with the standard protected action failure response
- New Shariah review submissions targeting the organization are denied with the standard protected action failure response
- Checklist operations on existing reviews for the organization are denied with the standard protected action failure response
- Decision recording for reviews associated with the organization are denied with the standard protected action failure response
- General read operations remain accessible unless specifically restricted by sensitive read policies

### 9.3 Protected function enforcement rules

Protected function enforcement follows the approved matrix in PROTECTED_FUNCTION_INVENTORY.md. The key principles are:

1. **Deactivated Actor Protection**: All protected write operations initiated by a deactivated actor are denied with the standard protected action failure response (FORBIDDEN).

2. **Organization-Scoped Protection**: Organization-scoped protected write operations targeting a deactivated organization are denied with the standard protected action failure response (FORBIDDEN).

3. **Sensitive Read Access**: Access to sensitive read operations for deactivated actors or organizations may be conditionally restricted based on implementation policies.

4. **General Read Access**: General read operations remain accessible unless specifically restricted by sensitive read policies.

Standard denial behavior:
- Protected actions blocked by deactivation return the documented FORBIDDEN response with appropriate details
- Error responses follow the existing error envelope format and do not introduce new error families

Protected functions are defined in detail in PROTECTED_FUNCTION_INVENTORY.md, which serves as the source of truth for all protected function behaviors and deactivation effects.

### 9.4 Provisional protected functions list

Protected functions draft:
- create member organization
- manage role catalog
- assign or revoke roles
- submit Shariah review request
- save checklist completion
- record governance decision
- read sensitive review history
- perform any other write action gated by organization or user active status

[FLAG-PROTECTED-FUNCTIONS]
The exact protected function list is still provisional, but the categories above are the current Sprint 1 baseline.

## 10. Access history contracts

### 10.1 Query access history

`GET /api/v1/access-history`

Request:

Query parameters:
- `actorUserId`: Filter by actor user ID
- `targetType`: Filter by target resource type
- `targetId`: Filter by target resource ID
- `action`: Filter by action name
- `outcome`: Filter by outcome category
- `occurredFrom`: Filter by earliest occurrence timestamp (inclusive)
- `occurredTo`: Filter by latest occurrence timestamp (inclusive)
- `module`: Filter by module
- `route`: Filter by HTTP route pattern
- `method`: Filter by HTTP method

Authorization:
- Requires `auditor` role
- Non-auditor requests receive `403 FORBIDDEN`

Response (success):

```json
{
  "data": {
    "items": []
  }
}
```

Allowed `outcome` values:
- `success`
- `forbidden`
- `validationError`
- `notFound`
- `conflict`
- `error`

Allowed `module` values:
- `membership`
- `access-control`
- `shariah-review`

Allowed `method` values:
- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Validation rules:
- Timestamps (`occurredFrom`, `occurredTo`) must be ISO 8601 UTC-compatible strings
- `occurredFrom` must be <= `occurredTo` when both are provided
- `outcome` must be one of the allowed values
- `module` must be one of the allowed values
- `method` must be one of the allowed values
- Unknown query parameters are rejected with `400 VALIDATION_ERROR`
- Unsupported pagination parameters (`limit`, `cursor`) are rejected with `400 VALIDATION_ERROR`

Ordering:
- Results are ordered by `occurredAt` ascending, then `eventId` ascending

Empty result behavior:
- Returns `200 OK` with `data.items = []`

Error responses:
- `403 FORBIDDEN` when actor does not have `auditor` role
- `400 VALIDATION_ERROR` for invalid query parameters

Examples:

Basic query:
```
GET /api/v1/access-history
```

Filter by actor:
```
GET /api/v1/access-history?actorUserId=user-1
```

Filter by target:
```
GET /api/v1/access-history?targetType=role&targetId=role-1
```

Filter by action and outcome:
```
GET /api/v1/access-history?action=changeRoleAssignment&outcome=forbidden
```

Filter by time range:
```
GET /api/v1/access-history?occurredFrom=2026-04-01T00:00:00Z&occurredTo=2026-04-30T23:59:59Z
```

Filter by module, route, and method:
```
GET /api/v1/access-history?module=shariah-review&route=/api/v1/shariah-reviews/:reviewId/history&method=GET
```

Successful response with events:

```json
{
  "data": {
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "access-audit-event.v1",
        "occurredAt": "2026-04-01T10:30:00Z",
        "requestId": "req-123",
        "actorUserId": "auditor-target-user",
        "actorSource": "actorContext",
        "action": "viewShariahReviewHistory",
        "targetType": "shariahReview",
        "targetId": "review-001",
        "outcome": "success",
        "module": "shariah-review",
        "route": "/api/v1/shariah-reviews/:reviewId/history",
        "method": "GET",
        "evidence": {
          "payloadHash": "sha256-placeholder",
          "canonicalization": "json-stable-v1"
        }
      }
    ]
  }
}
```

Empty response:

```json
{
  "data": {
    "items": []
  }
}
```

Validation error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "issues": [
        {
          "path": "outcome",
          "message": "Invalid outcome value: invalidOutcome. Must be one of: success, forbidden, validationError, notFound, conflict, error"
        }
      ]
    }
  }
}
```

Forbidden response:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query access history"
  }
}
```

### 10.2 Get access audit event detail

`GET /api/v1/access-history/events/{eventId}`

Request:

Path parameters:
- `eventId`: The unique identifier of the access audit event to retrieve

Authorization:
- Requires `auditor` role
- Non-auditor requests receive `403 FORBIDDEN`

Response (success):

```json
{
  "data": {
    "event": {
      "eventId": "550e8400-e29b-41d4-a716-446655440000",
      "schemaVersion": "access-audit-event.v1",
      "occurredAt": "2026-04-01T10:30:00Z",
      "requestId": "req-event-detail-sample",
      "actorUserId": "admin-user",
      "actorSource": "actorContext",
      "action": "changeRoleAssignment",
      "targetType": "roleAssignment",
      "targetId": "user-001:org-001:role-reviewer",
      "outcome": "forbidden",
      "reason": "admin_required",
      "module": "access-control",
      "route": "/api/v1/role-assignments/change",
      "method": "PATCH",
      "evidence": {
        "payloadHash": "sha256-placeholder",
        "canonicalization": "json-stable-v1"
      }
    }
  }
}
```

Preserved event fields:
- `eventId`
- `schemaVersion`
- `occurredAt`
- `requestId`
- `actorUserId`
- `actorSource`
- `action`
- `targetType`
- `targetId`
- `outcome`
- `reason` (where present)
- `module`
- `route` (where present)
- `method` (where present)
- `evidence.payloadHash`
- `evidence.canonicalization`
- `evidence.previousEventHash` (where present)

Error responses:
- `404 NOT_FOUND` when the event with the specified `eventId` does not exist
- `403 FORBIDDEN` when actor does not have `auditor` role

Examples:

Get event detail:
```
GET /api/v1/access-history/events/550e8400-e29b-41d4-a716-446655440000
```

Missing event response:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Access audit event not found"
  }
}
```

Forbidden response:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query access history"
  }
}
```

### 10.3 Get access audit event sequence

`GET /api/v1/access-history/sequences`

Request:

Query parameters:
- `scope`: Required. Defines the sequence scope. Must be either `actor` or `target`.
- `actorUserId`: Required when `scope=actor`. The user ID to retrieve events for.
- `targetType`: Required when `scope=target`. The target resource type to retrieve events for.
- `targetId`: Required when `scope=target`. The target resource ID to retrieve events for.
- `occurredFrom`: Optional. Filter by earliest occurrence timestamp (inclusive).
- `occurredTo`: Optional. Filter by latest occurrence timestamp (inclusive).

Authorization:
- Requires `auditor` role
- Non-auditor requests receive `403 FORBIDDEN`

Response (success):

```json
{
  "data": {
    "scope": {
      "type": "actor",
      "actorUserId": "actor-1"
    },
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "completeness_not_proven",
      "message": "Available events are returned, but the repository cannot prove the sequence is complete."
    },
    "items": []
  }
}
```

Scope types:
- `actor`: Retrieve events related to a specific actor user ID
- `target`: Retrieve events related to a specific target resource

Validation rules:
- `scope` is required and must be either `actor` or `target`
- When `scope=actor`, `actorUserId` is required and `targetType`/`targetId` are not allowed
- When `scope=target`, `targetType` and `targetId` are required and `actorUserId` is not allowed
- Timestamps (`occurredFrom`, `occurredTo`) must be ISO 8601 UTC-compatible strings
- `occurredFrom` must be <= `occurredTo` when both are provided
- Unknown query parameters are rejected with `400 VALIDATION_ERROR`
- Unsupported search parameters (`action`, `outcome`, `module`, `route`, `method`, `limit`, `cursor`) are rejected with `400 VALIDATION_ERROR`

Ordering:
- Results are ordered by `occurredAt` ascending, then `eventId` ascending

Completeness:
- Completeness status is always `unknown` with reason `completeness_not_proven`
- The repository cannot prove the sequence is complete

Empty result behavior:
- Returns `200 OK` with `data.items = []`

Error responses:
- `403 FORBIDDEN` when actor does not have `auditor` role
- `400 VALIDATION_ERROR` for invalid query parameters

Examples:

Actor sequence:
```
GET /api/v1/access-history/sequences?scope=actor&actorUserId=user-1
```

Target sequence:
```
GET /api/v1/access-history/sequences?scope=target&targetType=role&targetId=role-1
```

Actor sequence with time range:
```
GET /api/v1/access-history/sequences?scope=actor&actorUserId=user-1&occurredFrom=2026-04-01T00:00:00Z&occurredTo=2026-04-30T23:59:59Z
```

Successful actor sequence response:

```json
{
  "data": {
    "scope": {
      "type": "actor",
      "actorUserId": "actor-1"
    },
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "completeness_not_proven",
      "message": "Available events are returned, but the repository cannot prove the sequence is complete."
    },
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "access-audit-event.v1",
        "occurredAt": "2026-04-01T10:30:00Z",
        "requestId": "req-123",
        "actorUserId": "actor-1",
        "actorSource": "actorContext",
        "action": "createRole",
        "targetType": "role",
        "targetId": "role-1",
        "outcome": "success",
        "module": "access-control",
        "evidence": {
          "payloadHash": "sha256-placeholder",
          "canonicalization": "json-stable-v1"
        }
      }
    ]
  }
}
```

Successful target sequence response:

```json
{
  "data": {
    "scope": {
      "type": "target",
      "targetType": "roleAssignment",
      "targetId": "user-001:org-001:role-reviewer"
    },
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "completeness_not_proven",
      "message": "Available events are returned, but the repository cannot prove the sequence is complete."
    },
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "access-audit-event.v1",
        "occurredAt": "2026-04-01T10:30:00Z",
        "requestId": "req-123",
        "actorUserId": "admin-user",
        "actorSource": "actorContext",
        "action": "createRoleAssignment",
        "targetType": "roleAssignment",
        "targetId": "user-001:org-001:role-reviewer",
        "outcome": "success",
        "module": "access-control",
        "evidence": {
          "payloadHash": "sha256-placeholder",
          "canonicalization": "json-stable-v1"
        }
      }
    ]
  }
}
```

Validation error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid sequence query parameters",
    "details": {
      "issues": [
        {
          "path": "scope",
          "message": "Scope is required"
        }
      ]
    }
  }
}
```

Forbidden response:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query access history"
  }
}
```

### 10.4 Security alert read model

`GET /api/v1/security/alerts`

Purpose:
- Provide a security-operator read model for recent denied actions and blockchain proof failures.
- Avoid granting security operators administrator, compliance, finance, or auditor mutation permissions.
- Avoid using frontend-local fabricated alert data.

Authorization:
- Requires an authenticated `securityOperator` or `administrator` role.
- Anonymous requests receive `401 UNAUTHORIZED`.
- Other roles receive `403 FORBIDDEN`.

Response (success):

```json
{
  "data": {
    "generatedAt": "2026-05-26T00:00:00.000Z",
    "items": [
      {
        "alertId": "security-alert-denied-access-denied-1",
        "alertType": "deniedAction",
        "severity": "warning",
        "source": "accessAudit",
        "actorUserId": "buyer-user",
        "relatedEventId": "access-denied-1",
        "message": "changeRoleAssignment was denied for roleAssignment assignment-1. Reason: admin_required.",
        "occurredAt": "2026-05-25T04:04:00.000Z"
      },
      {
        "alertId": "security-alert-proof-proof-event-failed",
        "alertType": "proofFailure",
        "severity": "critical",
        "source": "blockchainAnchor",
        "relatedEventId": "proof-event-failed",
        "relatedProofStatus": "failed",
        "message": "Blockchain proof anchoring failed for event proof-event-failed. Reason: blockchain_unavailable.",
        "occurredAt": "2026-05-25T04:09:00.000Z"
      }
    ]
  }
}
```

Alert fields:
- `alertId`: Stable read-model alert identifier.
- `alertType`: `deniedAction` or `proofFailure`.
- `severity`: `info`, `warning`, or `critical`.
- `source`: `accessAudit` or `blockchainAnchor`.
- `actorUserId`: Included only when available from the source event.
- `actorOrganizationId`: Included only when available from the source event.
- `relatedEventId`: Access-audit event id or blockchain event id.
- `relatedProofStatus`: Included for blockchain proof alerts.
- `message`: Safe operational message. It must not expose credentials, private documents, raw KYC data, payment data, or raw commercial payloads.
- `occurredAt`: Source event timestamp.

Proof-state rules:
- `failed` proof metadata may become a `proofFailure` alert.
- Missing, pending, unavailable, or mismatched proof must not be displayed as verified.
- Fabric transaction IDs are not fabricated. If the source metadata does not contain one, the alert must not invent one.

Empty result behavior:
- Returns `200 OK` with `data.items = []`.

Error responses:
- `401 UNAUTHORIZED` when no valid authenticated session is supplied.
- `403 FORBIDDEN` when the authenticated actor lacks `securityOperator` or `administrator`.

## 11. Shariah review submission contracts

### 11.1 Submit review request

`POST /api/v1/shariah-reviews`

Request:

```json
{
  "organizationId": "org_123",
  "title": "string",
  "summary": "string",
  "references": [
    {
      "type": "attachment",
      "name": "document.pdf",
      "uri": "string",
      "description": "string",
      "mediaType": "application/pdf"
    }
  ]
}
```

Response:

```json
{
  "data": {
    "id": "review_123",
    "organizationId": "org_123",
    "title": "string",
    "summary": "string",
    "status": "submitted",
    "submittedByUserId": "user_123",
    "createdAt": "2026-03-15T00:00:00Z",
    "references": [
      {
        "type": "attachment",
        "name": "document.pdf",
        "uri": "string",
        "description": "string",
        "mediaType": "application/pdf"
      }
    ]
  }
}
```

Provisional Sprint 1 rules:
- required request fields: `organizationId`, `title`, `summary`
- initial workflow state is `submitted`
- `references` are optional in the transport contract, but reference metadata is supported from Sprint 1. Reference metadata provides information about attachments or links but does not include the attachment data itself.
- attachment handling in Sprint 1 guarantees reference metadata only; storage backend details are not part of this public contract
- submitting actor is derived from authenticated server-side context
- `submittedByUserId` is a server-derived field and must not be accepted from the request body
- if a client sends `submittedByUserId` in the request body, the request should be rejected with `VALIDATION_ERROR`
- the submitting actor must hold the coordinator role for the target organization

Access control:
- `POST /api/v1/shariah-reviews` requires a trusted actor context
- The actor must have an active coordinator role assignment for the target organization
- Unauthorized submissions return `403 FORBIDDEN`

Audit fields:
- `action`: "submitShariahReview"
- `targetType`: "shariahReview"
- `targetId`: The ID of the created review
- `timestamp`: ISO 8601 UTC timestamp
- `requestId`: Request correlation ID
- `actorId`: ID of the submitting user
- `outcome`: "success" for successful submissions, "forbidden" for denied submissions
- `reason`: Present for denied submissions (e.g., "coordinator_required")

Reference / attachment metadata handling:
- `references` is optional
- References are metadata only; no external binary storage optimization is introduced in this PBI
- Supported metadata fields:
  - `type`: Type of reference (e.g., "document", "uri", "attachment")
  - `name`: Display name of the reference
  - `uri`: URI to the reference
  - `description`: Description of the reference
  - `mediaType`: MIME type of the reference
- Reference metadata is persisted with the Shariah review entity
- Reference metadata is returned in successful submission responses
- Attachment handling is metadata-only at this stage; uploaded binary/object storage remains out of scope

[FLAG-SHARIAH-SUBMISSION-METADATA]
Mandatory metadata is not yet fully approved. The current shape represents a minimal baseline with richer metadata remaining provisional.

[FLAG-REFERENCE-HANDLING]
Reference vs attachment storage policy is not yet finalized beyond metadata-level support.

## 12. Checklist contracts

### 12.1 Save checklist outcome

`PUT /api/v1/shariah-reviews/{reviewId}/checklist`

Request:

```json
{
  "entries": [
    {
      "itemCode": "string",
      "outcome": "pass",
      "comment": "string",
      "evidenceRefs": ["string"]
    }
  ],
  "reviewerComment": "string",
  "completeChecklist": true
}
```

Allowed `outcome` values for Sprint 1 baseline:
- `pass`
- `fail`
- `notApplicable`

Each checklist entry consists of:
- `itemCode`: A unique identifier for the checklist item (required)
- `outcome`: The result for this checklist item (required)
- `comment`: Additional notes about the outcome (optional, but required when outcome is `fail`)
- `evidenceRefs`: References to supporting evidence (optional, but may be required based on item configuration)

Save semantics:
- Partial checklist saves are allowed
- When `completeChecklist` is omitted or false, the checklist may be saved in an incomplete state
- When `completeChecklist` is true, all completion rules must be satisfied or the request will be rejected with `VALIDATION_ERROR`
- The resulting status will be either `checklistInProgress` or `checklistComplete` depending on completion rules and the `completeChecklist` flag

Completion criteria:
- A review is considered `checklistComplete` when:
  - All mandatory checklist items have been evaluated
  - Required comments are provided for all `fail` outcomes
  - Required evidence references are provided for items that mandate them
- A review remains in `checklistInProgress` when:
  - Not all mandatory checklist items have been evaluated
  - Required comments are missing for any `fail` outcomes
  - Required evidence references are missing for items that mandate them

Response:

```json
{
  "data": {
    "reviewId": "review_123",
    "status": "checklistComplete"
  }
}
```

Rules:
- checklist items are provisionally assumed to come from seeded reference data
- `itemCode` must map to a valid checklist item
- failed items must carry a comment
- evidence may be required for selected seeded items later
- the resulting status may be `checklistInProgress` or `checklistComplete` depending on completion rules and the `completeChecklist` flag
- mandatory checklist items are defined in the seeded reference data
- mandatory items may use any outcome value including "notApplicable"
- duplicate itemCode entries are not allowed in one checklist submission
- when `completeChecklist` is true, all mandatory checklist items must be provided
- when `completeChecklist` is true, all other completion rules must be satisfied

[FLAG-CHECKLIST-SOURCE]
Sprint 1 working assumption is seeded reference data, but fixed-vs-configurable policy is not yet fully final.

## 13. Decision contracts

### 13.1 Record decision

`POST /api/v1/shariah-reviews/{reviewId}/decision`

Request:

```json
{
  "outcome": "conditionalApproved",
  "rationale": "string",
  "conditions": [
    {
      "description": "string",
      "dueDate": "2026-04-01"
    }
  ]
}
```

Allowed `outcome` values:
- `approved`
- `rejected`
- `conditionalApproved`

Response:

```json
{
  "data": {
    "reviewId": "review_123",
    "status": "conditionalApproved",
    "decidedAt": "2026-03-15T00:00:00Z"
  }
}
```

Authorization:
- Decision recording is a protected action
- Actor identity comes from trusted server-derived request context
- Only an authorized coordinator for the target organization may record a decision
- Unauthorized attempts return `403 FORBIDDEN`

Audit behavior:
- Successful decision recording emits a decision audit event
- Forbidden decision attempts emit a decision audit event
- Invalid-state decision attempts emit a decision audit event
- Not-found decision attempts emit a decision audit event if the backend records it

Rules:
- Decision recording is valid only when review status is `checklistComplete`
- `submitted` and `checklistInProgress` cannot be decision-recorded directly
- `rationale` is required for all final decisions
- `conditions` are required for `conditionalApproved`
- `conditions` must not be present for `approved` or `rejected`
- Each condition requires:
  - `description` (required)
  - `dueDate` (required)

Error responses:
- If the review is not found, the endpoint returns `404 NOT_FOUND`
- If the review is not in `checklistComplete` status, the endpoint returns `400 VALIDATION_ERROR`
- If `rationale` is missing or empty, the endpoint returns `400 VALIDATION_ERROR`
- If `outcome` is `conditionalApproved` but no conditions are provided, the endpoint returns `400 VALIDATION_ERROR`
- If `outcome` is `approved` or `rejected` but conditions are provided, the endpoint returns `400 VALIDATION_ERROR`
- If any condition is missing `description` or `dueDate`, the endpoint returns `400 VALIDATION_ERROR`

[FLAG-CONDITIONAL-APPROVAL]
Condition structure is partly stabilized, but expiry, ownership, and closure enforcement are not yet fully approved.

## 14. Status-history contracts

### 14.1 Get current status and history

`GET /api/v1/shariah-reviews/{reviewId}/history`

Response:

```json
{
  "data": {
    "reviewId": "review_123",
    "organizationId": "org_123",
    "currentStatus": "conditionalApproved",
    "history": [
      {
        "action": "reviewSubmitted",
        "fromStatus": null,
        "toStatus": "submitted",
        "performedAt": "2026-03-15T00:00:00Z",
        "performedByUserId": "user_123",
        "notes": "Initial submission for review"
      },
      {
        "action": "checklistSaved",
        "fromStatus": "submitted",
        "toStatus": "checklistInProgress",
        "performedAt": "2026-03-16T10:30:00Z",
        "performedByUserId": "user_456"
      },
      {
        "action": "checklistCompleted",
        "fromStatus": "checklistInProgress",
        "toStatus": "checklistComplete",
        "performedAt": "2026-03-17T14:45:00Z",
        "performedByUserId": "user_456",
        "notes": "All mandatory items evaluated"
      },
      {
        "action": "decisionRecorded",
        "fromStatus": "checklistComplete",
        "toStatus": "conditionalApproved",
        "performedAt": "2026-03-18T09:15:00Z",
        "performedByUserId": "user_789",
        "rationale": "Approved with conditions due to minor compliance issues",
        "conditions": [
          {
            "description": "Update disclosure documentation",
            "dueDate": "2026-04-30"
          }
        ]
      }
    ]
  }
}
```

Allowed history action names:
- `reviewSubmitted`
- `checklistSaved`
- `checklistCompleted`
- `decisionRecorded`

Action-to-status mapping rules:
- `reviewSubmitted` => `toStatus: submitted`, `fromStatus: null`
- `checklistSaved` => `toStatus: checklistInProgress`
- `checklistCompleted` => `toStatus: checklistComplete`
- `decisionRecorded` => `toStatus: approved`, `rejected`, or `conditionalApproved`

History entry fields:
- `action`: The event name that triggered the state change (required)
- `fromStatus`: The previous status before the change (nullable, null for initial state)
- `toStatus`: The resulting status after the change (required)
- `performedAt`: ISO 8601 UTC timestamp of when the action occurred (required)
- `performedByUserId`: Opaque user identifier of the actor who performed the action (required when available)
- `notes`: Optional textual notes about the action or state change
- `rationale`: Required for decision actions, contains the decision justification
- `conditions`: Required for conditionalApproved decisions, contains the list of conditions with descriptions and due dates

Response behavior for different workflow states:
- For submitted reviews with no checklist yet: Returns a single history entry with action "reviewSubmitted" and currentStatus "submitted"
- For reviews with checklistInProgress: Returns history entries up to the current "checklistInProgress" state
- For reviews with checklistComplete but no final decision: Returns history entries up to the "checklistComplete" state
- For reviews with final decisions: Returns the complete history including the decision entry

Rules:
- The `currentStatus` field is derived from the latest valid recorded state in the progression model
- History entries are ordered chronologically from earliest to latest
- Intermediate histories (submitted only, checklistInProgress, checklistComplete with no decision) must return successfully without error
- Absence of a final decision is not an error condition
- History entries include all state transitions and significant actions in the review lifecycle
- Sensitive history access may be subject to audit logging requirements

History-view access rules:
- `GET /api/v1/shariah-reviews/{reviewId}/history` requires trusted actor context
- Actor must hold an allowed active role assignment for the review organization
- Current backend allow-list: `coordinator`
- Unauthorized history reads return `403 FORBIDDEN`

Read audit fields:
- `action`: `viewShariahReviewHistory`
- `targetType`: `shariahReview`
- `targetId`: review id
- `timestamp`: ISO 8601 UTC timestamp
- `requestId`: Request correlation ID
- `actorId`: ID of the requesting user
- `outcome`: `success` or `forbidden`
- `reason`: Present for denied reads
- `historyEntryCount`: Number of history entries returned (for successful reads)

Safe response behavior:
- Empty history returns `history: []`
- Incomplete/intermediate history returns available entries only
- Response must not expose internal audit implementation details
- PBI-075 response shape remains stable

[FLAG-READ-AUDIT]
History-read logging requirements are not yet finalized, but sensitive history access is expected to be auditable in Sprint 1.

## 15. Procure-to-Pay Transaction History Contracts

For procure-to-pay transaction history contracts, see the dedicated document at `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`.

This section defines the lifecycle event fields, ordering rules, identifier semantics, and completeness/gap detection behavior for procure-to-pay transactions.
## 16. KYC/AML onboarding contracts

### 16.1 Submit onboarding case

`POST /api/v1/kyc-aml-onboarding-cases`

Purpose:
- Accept a regulated onboarding case into the KYC/AML compliance review workflow.
- Capture required KYC fields, AML declarations, and evidence references.
- Create a traceable onboarding case in the initial `submitted` state.
- This endpoint does not record final review outcomes.

Request:

```json
{
  "memberOrganizationId": "org_123",
  "kyc": {
    "legalName": "string",
    "registrationNumber": "string",
    "countryCode": "MYS",
    "businessType": "string"
  },
  "aml": {
    "declaredBusinessActivity": "string",
    "expectedMonthlyTransactionValue": "10000.00",
    "declaredSanctionsExposure": false,
    "declaredPepExposure": false,
    "riskSummary": "string"
  },
  "evidenceReferences": [
    {
      "type": "companyRegistration",
      "name": "ssm-registration.pdf",
      "uri": "string",
      "mediaType": "application/pdf",
      "checksum": "sha256-placeholder"
    }
  ]
}
```

Required top-level fields:
- `memberOrganizationId`
- `kyc`
- `aml`
- `evidenceReferences`

Required KYC fields:
- `legalName`
- `registrationNumber`
- `countryCode`
- `businessType`

Required AML fields:
- `declaredBusinessActivity`
- `expectedMonthlyTransactionValue`
- `declaredSanctionsExposure`
- `declaredPepExposure`

Evidence reference rules:
- `evidenceReferences` must be a non-empty array.
- Each evidence reference requires:
  - `type`
  - `name`
  - `uri`
  - `mediaType`
- `checksum` is optional for MVP but recommended.
- JSON field names use `camelCase`.

Allowed evidence `type` values:
- `companyRegistration`
- `authorizedRepresentativeIdentity`
- `beneficialOwnership`
- `amlDeclaration`
- `supportingDocument`

Required evidence types for accepted intake:
- `companyRegistration`
- `authorizedRepresentativeIdentity`
- `amlDeclaration`

Response:

```json
{
  "data": {
    "id": "kyc_aml_case_123",
    "memberOrganizationId": "org_123",
    "status": "submitted",
    "submittedByUserId": "user_123",
    "createdAt": "2026-03-15T00:00:00Z",
    "updatedAt": "2026-03-15T00:00:00Z",
    "evidenceReferences": [
      {
        "type": "companyRegistration",
        "name": "ssm-registration.pdf",
        "uri": "string",
        "mediaType": "application/pdf",
        "checksum": "sha256-placeholder"
      }
    ]

  }
}
```

Response field rules:
- `id` is an opaque onboarding case identifier.
- `submittedByUserId` is derived from trusted server-side actor context, not from a client-authored request field.
- `status` is always `submitted` for newly accepted onboarding intake cases.
- `createdAt` and `updatedAt` use ISO 8601 UTC strings.

Initial status:
- `submitted`

Initial status meaning:
- The onboarding case has been accepted into the compliance review workflow.
- No KYC/AML review outcome has been recorded yet.
- Review outcome states and transitions are intentionally deferred to PBI-156.

Validation rules:
- Missing required top-level fields return `400 VALIDATION_ERROR`.
- Missing required KYC fields return `400 VALIDATION_ERROR`.
- Missing required AML fields return `400 VALIDATION_ERROR`.
- Empty `evidenceReferences` returns `400 VALIDATION_ERROR`.
- Missing required evidence metadata returns `400 VALIDATION_ERROR`.
- Missing required evidence types returns `400 VALIDATION_ERROR`.
- Validation responses use the standard validation error envelope from section 5.

Validation error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "issues": [
        {
          "path": "kyc.legalName",
          "message": "Legal name is required"
        }
      ]
    }
  }
}
```

Out of scope for this contract section:
- Review decision outcomes.
- Final approval, rejection, blocked, or flagged states.
- Downstream onboarding eligibility checks.
- Audit event schema changes.
- Dashboard UI behavior.

[FLAG-KYC-AML-OUTCOME-STATES]
KYC/AML review outcome states and transition rules are defined in section 15.2 for MVP.

### 16.2 Record KYC/AML review decision

`POST /api/v1/kyc-aml-onboarding-cases/{caseId}/decision`

Purpose:
- Record a compliance reviewer's decision on a submitted KYC/AML onboarding case.
- Transition the onboarding case to an outcome state based on review findings.
- Capture required rationale and reason codes for auditability.
- This endpoint does not implement downstream eligibility enforcement, which is handled by PBI-150/PBI-184 onward.

Request:

```json
{
  "outcome": "flag",
  "rationale": "Beneficial ownership evidence requires manual compliance follow-up.",
  "reasonCodes": [
    "beneficial_ownership_unverified",
    "manual_compliance_concern"
  ]
}
```

Required fields:
- `outcome`
- `rationale`

Allowed outcome values:
- `pass`
- `fail`
- `flag`
- `block`

Outcome-to-status mapping:
- `pass` -> `approved`
- `fail` -> `rejected`
- `flag` -> `flagged`
- `block` -> `blocked`

Required reason fields:
- `rationale` is required for every outcome
- `fail`, `flag`, and `block` require at least one `reasonCode`
- `pass` may include `reasonCodes`, but does not require them

Allowed reason codes:
- `identity_verification_failed`
- `beneficial_ownership_unverified`
- `sanctions_exposure`
- `pep_exposure`
- `inconsistent_business_activity`
- `missing_or_invalid_evidence`
- `high_risk_activity`
- `manual_compliance_concern`

Response:

```json
{
  "data": {
    "id": "kyc_aml_case_123",
    "memberOrganizationId": "org_123",
    "status": "flagged",
    "decision": {
      "outcome": "flag",
      "rationale": "Beneficial ownership evidence requires manual compliance follow-up.",
      "reasonCodes": [
        "beneficial_ownership_unverified",
        "manual_compliance_concern"
      ],
      "decidedByUserId": "user_456",
      "decidedAt": "2026-03-15T00:00:00Z"
    },
    "updatedAt": "2026-03-15T00:00:00Z"
  }
}
```

Validation rules:
- Missing `outcome` returns `400 VALIDATION_ERROR`
- Unknown `outcome` returns `400 VALIDATION_ERROR`
- Missing or blank `rationale` returns `400 VALIDATION_ERROR`
- `fail`, `flag`, and `block` with empty or missing `reasonCodes` return `400 VALIDATION_ERROR`
- Unknown reason code returns `400 VALIDATION_ERROR`
- Invalid state transition returns `400 VALIDATION_ERROR`
- Missing case returns `404 NOT_FOUND`
- Unauthorized reviewer behavior belongs to PBI-158 hardening, but reviewer identity is server-derived

Transition rules:
- `submitted` -> `approved` through outcome `pass`
- `submitted` -> `rejected` through outcome `fail`
- `submitted` -> `flagged` through outcome `flag`
- `submitted` -> `blocked` through outcome `block`

Invalid transitions:
- No review decision may be recorded for a missing onboarding case
- No review decision may be recorded when the current status is already `approved`, `rejected`, `flagged`, or `blocked`
- No direct transition from `approved`, `rejected`, `flagged`, or `blocked` to another outcome state is allowed in this PBI.
- Reopen, remediation, expiry, and appeal behavior are not defined by this contract.

Finality assumption:
- For the current MVP contract, `approved`, `rejected`, `flagged`, and `blocked` are treated as decision states with no further transition until a later PBI defines reopen or remediation behavior

Actor/source rules:
- Decision maker identity must come from trusted actor context in implementation
- Do not document `reviewedByUserId` or `decisionByUserId` as a client-authored request field
- Response examples may include reviewer identity as a server-derived field

Out of scope for this contract section:
- Downstream workflow enforcement (handled by PBI-150/PBI-184 onward)
- Sanctions screening implementation
- Eligibility API implementation
- Dashboard UI implementation

[FLAG-KYC-AML-OUTCOME-STATES]
KYC/AML review outcome states and transition rules are now defined for MVP. Reopen, remediation, expiry, and appeal behavior remain deferred to future PBIs.

### 16.3 Get KYC/AML onboarding case status and history

`GET /api/v1/kyc-aml-onboarding-cases/{caseId}/status-history`

Purpose:
- Retrieve the current onboarding status and decision history for an onboarding case.
- Support backend/API consumers and future dashboard consumers.
- This endpoint is backend/read-contract capability, not dashboard UI.

Response for submitted case with no decision:

```json
{
  "data": {
    "id": "kyc_aml_case_123",
    "memberOrganizationId": "org_123",
    "currentStatus": "submitted",
    "isFinal": false,
    "history": [
      {
        "type": "caseSubmitted",
        "fromStatus": null,
        "toStatus": "submitted",
        "actorUserId": "user_123",
        "occurredAt": "2026-03-15T00:00:00Z"
      }
    ]
  }
}
```

Response for decided case:

```json
{
  "data": {
    "id": "kyc_aml_case_123",
    "memberOrganizationId": "org_123",
    "currentStatus": "flagged",
    "isFinal": true,
    "history": [
      {
        "type": "caseSubmitted",
        "fromStatus": null,
        "toStatus": "submitted",
        "actorUserId": "user_123",
        "occurredAt": "2026-03-15T00:00:00Z"
      },
      {
        "type": "decisionRecorded",
        "fromStatus": "submitted",
        "toStatus": "flagged",
        "outcome": "flag",
        "rationale": "Beneficial ownership evidence requires manual compliance follow-up.",
        "reasonCodes": [
          "beneficial_ownership_unverified",
          "manual_compliance_concern"
        ],
        "actorUserId": "user_456",
        "occurredAt": "2026-03-15T01:00:00Z"
      }
    ]
  }
}
```

Status values:
- `submitted`
- `approved`
- `rejected`
- `flagged`
- `blocked`

History event types:
- `caseSubmitted`
- `decisionRecorded`

Ordering rule:
- History entries are returned chronologically from oldest to newest.
- `caseSubmitted` appears before `decisionRecorded`.
- If no decision exists, history contains only the `caseSubmitted` event.

Intermediate-state behavior:
- `submitted` with no decision is valid and not an error.
- `currentStatus` is `submitted`.
- `isFinal` is false.
- History contains the intake/submission event only.

Final-state behavior:
- `approved`, `rejected`, `flagged`, and `blocked` are final MVP decision states.
- `isFinal` is true for `approved`, `rejected`, `flagged`, and `blocked`.
- No reopen/remediation/appeal behavior is defined in this contract.

Authorization semantics:
- Retrieval is protected.
- Caller identity must come from trusted actor context.
- Authorized compliance, banking, or platform users may retrieve status/history according to later implementation policy.
- Unauthorized retrieval returns `403 FORBIDDEN`.
- Missing actor context returns `400 VALIDATION_ERROR` or `401/403` only if an existing project-wide rule requires it.

Privacy semantics:
- Response must not expose raw KYC evidence content.
- Response may expose evidence/reference identifiers only if later implementation needs them.
- Decision rationale and reason codes are compliance-sensitive and should be returned only to authorized readers.

Negative-path behavior:
- Missing case returns `404 NOT_FOUND`.
- Malformed caseId returns `400 VALIDATION_ERROR` if route validation detects it.
- Unauthorized reader returns `403 FORBIDDEN`.
- Empty history should not occur for a valid case; if implementation cannot reconstruct any history later, it must return an explicit incomplete-history signal rather than pretending completeness.
## 17. Dashboard shell contracts

### 17.1 Dashboard shell purpose and ownership

The dashboard shell is the primary landing experience for authenticated users in the platform. It provides a role-tailored interface with navigation and widgets relevant to the user's responsibilities. This contract is owned by PBI-017 (Role-based UI and operational dashboards) and specifically supports PBI-146 (Role-tailored dashboard landing experience).

### 17.2 Role-to-dashboard mapping contract

The dashboard shell uses the user's assigned roles to determine which navigation items and widgets to display. Roles are identified by their `roleCode` values from the access control system.

#### Canonical dashboard roleCode values

Dashboard role profiles use these canonical `roleCode` values:

| roleCode | Dashboard profile |
|---|---|
| `administrator` | Administrator |
| `buyer` | Buyer |
| `supplier` | Supplier |
| `financier` | Financier |
| `complianceReviewer` | Compliance Reviewer |
| `shariahReviewer` | Shariah Reviewer |
| `auditor` | Auditor |
| `securityOperator` | Security Operator |

These role codes are dashboard-contract inputs. They must not be treated as a full backend role-catalog freeze beyond PBI-017 unless the role catalog contract is explicitly updated.

#### Dashboard role profiles

The following role profiles are defined for the dashboard:

##### Administrator (`administrator`)
- **Purpose**: Membership and access-control operations
- **Primary downstream story**: PBI-147
- **Navigation/widgets**: Member onboarding, role management, role assignment, access-control status placeholders

##### Buyer (`buyer`)
- **Purpose**: Procurement buyer operational landing
- **Primary downstream story**: PBI-146 base shell only for now
- **Navigation/widgets**: Procurement workspace placeholder, orders/tenders placeholder, delivery/invoice status placeholder

##### Supplier (`supplier`)
- **Purpose**: Supplier operational landing
- **Primary downstream story**: PBI-146 base shell only for now
- **Navigation/widgets**: Supplier workspace placeholder, tender/order response placeholder, delivery evidence placeholder

##### Financier (`financier`)
- **Purpose**: Financing operational landing
- **Primary downstream story**: PBI-146 base shell only for now
- **Navigation/widgets**: Financing workspace placeholder, PLS/receivables placeholder, settlement status placeholder

##### Compliance Reviewer (`complianceReviewer`)
- **Purpose**: KYC/AML and compliance review landing
- **Primary downstream story**: PBI-148
- **Navigation/widgets**: KYC/AML queue placeholder, onboarding status/history placeholder, governed action placeholder

##### Shariah Reviewer (`shariahReviewer`)
- **Purpose**: Shariah governance workflow landing
- **Primary downstream story**: PBI-148
- **Navigation/widgets**: Shariah review submission/checklist/decision/history placeholders, governed action placeholder

##### Auditor (`auditor`)
- **Purpose**: Audit and access-history investigation landing
- **Primary downstream story**: PBI-151
- **Navigation/widgets**: Access-history search placeholder, event detail placeholder, investigation queue placeholder

##### Security Operator (`securityOperator`)
- **Purpose**: Security investigation and protected-action monitoring landing
- **Primary downstream story**: PBI-151
- **Navigation/widgets**: Access-history investigation placeholder, forbidden action monitoring placeholder, event evidence placeholder

### 17.3 Navigation model

Navigation items have the following properties:

- `id`: Stable identifier for the navigation item
- `label`: Display text for the navigation item
- `target`: Route or page key the navigation item leads to
- `allowedRoles`: Array of roleCodes that can access this item
- `requiredPermissions`: Optional array of specific permissions required
- `visibility`: Visibility rule (visible, hidden, conditional)
- `blockedBehavior`: How to handle access when user doesn't have permission (hide, show blocked state)

Navigation behavior:
- Disallowed navigation items are hidden from normal menus by default
- If a user directly reaches a known route outside their role, render a blocked state instead of silently exposing the page
- Blocked states must not imply backend authorization was performed successfully
- Backend remains final enforcement for protected actions
- Frontend must consume standard backend error envelopes

### 17.4 Widget-zone model

The dashboard uses predefined zones to organize widgets consistently:

#### Summary Zone
- **Purpose**: High-level overview information
- **Allowed content type**: Key metrics, status summaries
- **Ordering rule**: Priority-based
- **Empty/placeholder rule**: Show "No summary data available"
- **Accessibility expectation**: Primary information area
- **Downstream widget ownership**: Various role-specific widgets

#### Primary Zone
- **Purpose**: Main functional area for primary role activities
- **Allowed content type**: Action panels, workflow tools
- **Ordering rule**: Fixed workflow order
- **Empty/placeholder rule**: Show "No primary widgets available"
- **Accessibility expectation**: Main working area
- **Downstream widget ownership**: Role-specific functional widgets

#### Secondary Zone
- **Purpose**: Supporting information and tools
- **Allowed content type**: Reports, supplementary data
- **Ordering rule**: Fixed category order
- **Empty/placeholder rule**: Show "No secondary widgets available"
- **Accessibility expectation**: Supplementary information area
- **Downstream widget ownership**: Contextual information widgets

#### Actions Zone
- **Purpose**: Quick access to common actions
- **Allowed content type**: Action buttons, shortcuts
- **Ordering rule**: Fixed priority order
- **Empty/placeholder rule**: Show "No quick actions available"
- **Accessibility expectation**: Easy access to frequent actions
- **Downstream widget ownership**: Role-specific action widgets

#### Alerts Zone
- **Purpose**: Notifications and warnings
- **Allowed content type**: Alert messages, notifications
- **Ordering rule**: Chronological (newest first)
- **Empty/placeholder rule**: Show "No alerts"
- **Accessibility expectation**: Prominent notification area
- **Downstream widget ownership**: System and workflow alert widgets

#### Investigation Zone
- **Purpose**: Specialized area for investigative workflows
- **Allowed content type**: Search tools, evidence viewers
- **Ordering rule**: Workflow step order
- **Empty/placeholder rule**: Show "No investigation tools available"
- **Accessibility expectation**: Focused investigation environment
- **Downstream widget ownership**: Auditor/security investigation widgets

### 17.5 Widget placement rules

Widget placement follows these rules:
- PBI-173 may render placeholders using this mapping
- PBI-176/PBI-179 add administrator widgets into the approved zones
- PBI-180/PBI-183 add compliance/review widgets into the approved zones
- PBI-188/PBI-191 add auditor/security investigation widgets into the approved zones
- No downstream story may create a new top-level shell or alternate navigation model without updating this contract

### 17.6 Shell states

The dashboard shell can be in the following states:

- `ready`: Dashboard is fully loaded and ready for use
- `noRole`: Authenticated user has no assigned roles
- `unsupportedRole`: User has roles that are not mapped to dashboard profiles
- `forbidden`: User attempted to access restricted content
- `loading`: Dashboard is initializing
- `error`: An error occurred during dashboard initialization

### 17.7 Fallback semantics

- **No authenticated role**: Safe blocked/no-role state, no sensitive widgets
- **Unsupported roleCode**: Safe unsupported-role state, no sensitive widgets
- **Multiple roles**: If authenticated/session context supplies an explicit active dashboard role, use it only when it exists in the user's assigned `roleCode` list and is one of the supported dashboard role codes. Otherwise, choose the landing shell using this deterministic priority:
  1. `administrator`
  2. `auditor`
  3. `securityOperator`
  4. `complianceReviewer`
  5. `shariahReviewer`
  6. `financier`
  7. `buyer`
  8. `supplier`

  This priority selects only the active landing shell. It must not merge privileged widgets across roles. Role switching is allowed only among assigned supported role codes.
- **Empty widgets**: Render documented placeholder/empty state, not an error

### 17.8 Contract data structures

#### DashboardShell
```typescript
interface DashboardShell {
  userContext: {
    userId: string;
    displayName?: string;
  };
  activeRoleCode?: string;
  availableRoleCodes: string[];
  navigationGroups: DashboardNavigationGroup[];
  widgetZones: Record<string, DashboardWidgetZone>;
  widgets: DashboardWidget[];
  shellState: 'ready' | 'noRole' | 'unsupportedRole' | 'forbidden' | 'loading' | 'error';
}
```

#### DashboardNavigationGroup
```typescript
interface DashboardNavigationGroup {
  id: string;
  label: string;
  items: DashboardNavigationItem[];
}
```

#### DashboardNavigationItem
```typescript
interface DashboardNavigationItem {
  id: string;
  label: string;
  target: string; // route or page key
  allowedRoles: string[]; // roleCodes
  requiredPermissions?: string[]; // Optional specific permissions
  visibility: 'visible' | 'hidden' | 'conditional';
  blockedBehavior: 'hide' | 'showBlockedState';
}
```

#### DashboardWidgetZone
```typescript
interface DashboardWidgetZone {
  id: string;
  label: string;
  purpose: string;
  ordering: 'priority' | 'workflow' | 'chronological' | 'fixed'
  emptyState: {
    message: string;
    icon?: string;
  };
}
```

#### DashboardWidget
```typescript
interface DashboardWidget {
  id: string;
  title: string;
  zoneId: string; // References a widget zone
  allowedRoles: string[]; // roleCodes
  requiredPermissions?: string[]; // Optional specific permissions
  status: 'placeholder' | 'loading' | 'active' | 'unavailable' | 'error';
  downstreamPbi: string; // Reference to the PBI that implements this widget
  placeholder?: boolean; // Whether this is a placeholder widget
}
```

### 17.9 Backend authorization and frontend guards

- Backend authorization remains authoritative
- Frontend guards are UX-only and must not be treated as security enforcement
- All protected actions must be validated by backend services
- Frontend must properly handle FORBIDDEN responses from backend
- Error envelopes must be consumed as defined in section 4

### 17.10 Dashboard response semantics

Dashboard shell responses use the standard success envelope:

```
{
  {
    "shellState": "ready",
    "activeRoleCode": "administrator",
    "availableRoleCodes": ["administrator"],
    "navigationGroups": [],
    "widgetZones": {},
    "widgets": []
  }
}
```

No-role and unsupported-role states may still return a successful dashboard shell response when the user is authenticated but cannot be mapped to a supported dashboard profile:

```
{
  "data": {
    "shellState": "unsupportedRole",
    "availableRoleCodes": ["legacyRole"],
    "navigationGroups": [],
    "widgetZones": {},
    "widgets": []

Direct access to a known dashboard route outside the active role renders the dashboard `forbidden` shell state. This frontend blocked state is a UX guard only and must not be treated as backend authorization success.

Backend authorization failures continue to use the standard error envelope:

```
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User is not allowed to access this resource"
  }
}
```

## 18. Organization network contracts

The detailed organization network contract is maintained in
`docs/contracts/ORGANIZATION_NETWORK_CONTRACT.md`. This section records the
public API surface in the central API contract index so frontend, backend, and
QA work share the same discovery point.

Organization network endpoints use the global conventions in this document:

- Base path: `/api/v1`
- Protected reads and writes use `Authorization: Bearer <token>`
- Actor identity is derived from trusted server-side session context
- Responses use the standard success envelope
- Validation, authentication, authorization, missing-record, and conflict
  failures use the standard error envelope
- Safe public organization metadata may be returned
- Raw KYC data, private commercial documents, payment credentials, bearer
  tokens, private keys, and unrestricted commercial terms must not be returned
  or sent through email notification bodies

### 18.1 Public organization registration

`POST /api/v1/organizations/register`

Purpose:

- Register a new organization with safe profile metadata.
- Bootstrap a primary organization administrator user and credential.
- Create or link a pending KYC/AML onboarding case.

Important boundary:

- Registration does not make the organization transaction-eligible.
- Eligibility remains controlled by onboarding/compliance gates.
- The response must not return a raw password.

### 18.2 Organization profile

`GET /api/v1/organizations/me/profile`

`PATCH /api/v1/organizations/me/profile`

Purpose:

- Return and update safe organization profile metadata such as alias, unique
  identifier, logo reference, business category, public summary, status, and
  eligibility summary.

Authorization:

- Profile read requires an authenticated user with an organization context.
- Profile update requires an administrator or organization-admin role according
  to the implementation contract.

### 18.3 Organization discovery

`GET /api/v1/organizations/search?identifier=<uniqueIdentifier>`

Purpose:

- Find a target organization by unique identifier and return safe public
  profile metadata for network establishment.

### 18.4 Network relationship requests

`POST /api/v1/organization-network/requests`

`GET /api/v1/organization-network/requests`

`POST /api/v1/organization-network/requests/:requestId/accept`

`POST /api/v1/organization-network/requests/:requestId/reject`

Purpose:

- Request, inspect, accept, or reject network relationships between
  organizations.
- Accepted requests create or update a relationship record and local email
  notification outbox records.

Network request states:

- `draft`
- `sent`
- `received`
- `accepted`
- `rejected`
- `cancelled`
- `blocked`
- `expired`

Relationship/deal roles:

- `buyer`
- `supplier`
- `financier`
- `logistics`
- `auditorRegulator`
- `mixed`

### 18.5 Graph projection and blockchain trail

`GET /api/v1/organization-network/graph`

`GET /api/v1/organization-network/graph/:edgeId/trail`

Purpose:

- Return graph nodes and directional vectors for the authenticated
  organization.
- Return proof-level blockchain trail metadata for a selected edge.

Channel/scope aliases:

- `sharedChannelA`
- `sharedChannelB`
- `privateChannelC`
- `localProofOnly`
- `unavailable`

These are proof/visibility-scope aliases. They must not be described as live
production Fabric channel membership unless that is independently implemented
and validated.

### 18.6 Email notification outbox

`GET /api/v1/email-notifications/outbox`

Purpose:

- Return local notification outbox records for authorized governance/operator
  users.

Notification status values:

- `queued`
- `sent`
- `failed`
- `skipped`

Current implementation boundary:

- Local outbox records are persisted metadata.
- No production SMTP delivery is claimed.

## 19. Company Productivity and API Contract Baseline

Issue #24 extends the company-centric workspace with productivity and API
readiness endpoints.

### 19.1 Company channel matrix

`GET /api/v1/organizations/me/channel-matrix`

Purpose:

- Return partner organization, relationship role, channel/proof scope, active
  deal count, latest proof state, eligibility status, and a compact risk
  summary for the authenticated organization.
- The values are safe projections from organization network and company ledger
  read models.

Boundary:

- `sharedChannelA`, `sharedChannelB`, `privateChannelC`, `localProofOnly`, and
  `unavailable` remain proof-scope aliases. They do not claim production Fabric
  channel membership.

### 19.2 Productivity workspace

`GET /api/v1/company-productivity/summary`

`GET /api/v1/company-productivity/money-tracker`

`GET /api/v1/company-productivity/pipeline`

`GET /api/v1/company-productivity/action-inbox`

`PATCH /api/v1/company-productivity/action-inbox/:taskId`

`GET /api/v1/company-productivity/supplier-scorecards`

`GET /api/v1/company-productivity/evidence-checklist`

`GET /api/v1/company-productivity/saved-views`

`POST /api/v1/company-productivity/saved-views`

Compatibility aliases:

- `GET /api/v1/productivity/tasks`
- `PATCH /api/v1/productivity/tasks/:taskId`
- `GET /api/v1/productivity/saved-views`
- `POST /api/v1/productivity/saved-views`

Purpose:

- Return company-scoped money tracker, procurement pipeline, action inbox,
  supplier scorecards, evidence checklist, and saved views.
- Allow the authenticated user to mark a task complete and create a lightweight
  saved workspace view.

Boundary:

- Current productivity state is a backend read model with in-memory task/view
  persistence for the process lifetime. PostgreSQL persistence can be added
  later if product ownership requires durable saved views.
- Amounts are planning/demo figures and do not imply payment execution.

### 19.3 Lightweight company ledger export

`POST /api/v1/company-ledger/exports`

Purpose:

- Create a safe export manifest summary for the authenticated company's ledger
  projection.
- Return `exportId`, `itemCount`, `manifestHash`, `proofScope`, `status`, and a
  safe summary.

Boundary:

- This is not a production signed export bundle.
- Raw documents, private terms, KYC data, payment credentials, and unrestricted
  commercial payloads are not returned.

### 19.4 Notification center

`GET /api/v1/notifications`

Purpose:

- Return safe local notification records mapped from the existing notification
  outbox for the authenticated organization or governance read scope.

Boundary:

- No real email delivery, SMTP integration, or user-device push delivery is
  claimed.

### 19.5 OpenAPI 3.1

The machine-readable API contract lives at:

- `docs/contracts/openapi/openapi.yaml`

The companion local API client collection lives at:

- `docs/contracts/openapi/postman_collection.json`

Validation command:

```bash
npm run openapi:validate
```
