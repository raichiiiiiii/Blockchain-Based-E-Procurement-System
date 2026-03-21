# API Contracts

Status: Draft for Sprint 1 baseline  
Owner: Backend + Frontend + QA  
Last updated: YYYY-MM-DD

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

[FLAG-USER-IDENTITY]
The identity provider and user provisioning model are not frozen. This contract only assumes a stable opaque `userId` is available to protected flows.

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

## 5. Membership contracts

### 5.1 Create member organization

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

### 5.2 Update member organization status

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

## 6. Role catalog contracts

[FLAG-ROLE-CATALOG]
Role catalog policy including reserved-role rules and exact permission vocabulary are not yet frozen.

### 6.1 Create role

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

### 6.2 Update role

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

### 6.3 List roles

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

## 7. Role assignment contracts

### 7.1 Assign role to user

`POST /api/v1/role-assignments`

Request:

```json
{
  "userId": "user_123",
  "organizationId": "org_123",
  "roleId": "role_123",
  "effectiveFrom": "2026-03-15T00:00:00Z",
  "effectiveTo": "2026-12-31T23:59:59Z"
}
```

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

### 7.2 Remove role assignment

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

## 8. Deactivation and protected-access contracts

### 8.1 Protected action failure

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

### 8.2 Provisional protected functions list

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

## 9. Shariah review submission contracts

### 9.1 Submit review request

`POST /api/v1/shariah-reviews`

Request:

```json
{
  "organizationId": "org_123",
  "submissionReference": "string",
  "title": "string",
  "summary": "string",
  "productType": "string",
  "contractType": "string",
  "effectiveDate": "2026-03-15",
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
    "submissionReference": "string",
    "status": "submitted",
    "submittedByUserId": "user_123",
    "createdAt": "2026-03-15T00:00:00Z"
  }
}
```

Provisional Sprint 1 rules:
- required request fields: `organizationId`, `submissionReference`, `title`, `summary`
- initial workflow state is `submitted`
- `submissionReference` should be unique within an organization
- `references` are optional in the transport contract, but reference metadata is supported from Sprint 1
- attachment handling in Sprint 1 guarantees reference metadata only; storage backend details are not part of this public contract
- submitting actor is derived from authenticated server-side context
- `submittedByUserId` is a server-derived field and must not be accepted from the request body
- submitting actor must have permission to submit a review for the organization

[FLAG-SHARIAH-SUBMISSION-METADATA]
Mandatory metadata is not yet fully approved. The current shape is a structured provisional baseline.

[FLAG-REFERENCE-HANDLING]
Reference vs attachment storage policy is not yet finalized beyond metadata-level support.

## 10. Checklist contracts

### 10.1 Save checklist outcome

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
  "reviewerComment": "string"
}
```

Allowed `outcome` values for Sprint 1 baseline:
- `pass`
- `fail`
- `notApplicable`

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
- the resulting status may be `checklistInProgress` or `checklistComplete` depending on completion rules

[FLAG-CHECKLIST-SOURCE]
Sprint 1 working assumption is seeded reference data, but fixed-vs-configurable policy is not yet fully final.

## 11. Decision contracts

### 11.1 Record decision

`POST /api/v1/shariah-reviews/{reviewId}/decision`

Request:

```json
{
  "outcome": "conditionalApproved",
  "rationale": "string",
  "conditions": [
    {
      "code": "string",
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

Rules:
- decision requires checklist to be complete
- `rejected` requires `rationale`
- `conditionalApproved` requires `rationale`
- `conditionalApproved` requires at least one condition
- Sprint 1 baseline assumes final decisions are not revised without a future reopen policy

[FLAG-CONDITIONAL-APPROVAL]
Condition structure is partly stabilized, but expiry, ownership, and closure enforcement are not yet fully approved.

## 12. Status-history contracts

### 12.1 Get current status and history

`GET /api/v1/shariah-reviews/{reviewId}/history`

Response:

```json
{
  "data": {
    "reviewId": "review_123",
    "currentStatus": "submitted",
    "history": [
      {
        "action": "reviewSubmitted",
        "fromStatus": null,
        "toStatus": "submitted",
        "performedAt": "2026-03-15T00:00:00Z",
        "performedByUserId": "user_123",
        "notes": "string"
      }
    ]
  }
}
```

Rules:
- intermediate histories must still return successfully
- absence of final decision is not an error
- `currentStatus` is derived from the latest accepted workflow transition
- history order should be stable and auditable

[FLAG-READ-AUDIT]
History-read logging requirements are not yet finalized, but sensitive history access is expected to be auditable in Sprint 1.

`submittedByUserId.md`


````md
# submittedByUserId Contract Fix

Status: Patch note for Sprint 1 baseline  
Owner: Backend / Architecture  
Last updated: YYYY-MM-DD

## 1. Problem

The Shariah review submission contract currently allows the client to send:

- `submittedByUserId`

inside the request body for a protected endpoint.

That is a contract flaw because actor identity for protected write actions must come from authenticated server-side context, not untrusted client input.

## 2. Decision

For Sprint 1:

- remove `submittedByUserId` from the request body of `POST /api/v1/shariah-reviews`
- derive the submitting actor from authenticated request context
- allow the server to expose `submittedByUserId` in responses or history only as a server-derived field

## 3. Assumptions

This patch assumes:

1. protected endpoints already require `Authorization: Bearer <token>`
2. authenticated runtime context can provide a stable opaque `userId`
3. Sprint 1 does not support delegated "submit on behalf of another user" behavior as part of the public API contract
4. if delegated submission is needed later, it will be modeled explicitly with separate actor/subject semantics

## 4. Granular flaws being patched

- client can spoof submitter identity
- token actor and body actor can disagree
- audit logs can become unreliable
- authorization semantics become ambiguous
- backend must invent a precedence rule that should not exist
- public contract leaks identity-model detail that should stay server-owned
- future delegated submission becomes harder to model cleanly

## 5. Exact contract patch target

Patch target in `API_CONTRACTS.md`:

- Section `9.1 Submit review request`

## 6. Replacement contract

### Request

```json
{
  "organizationId": "org_123",
  "submissionReference": "string",
  "title": "string",
  "summary": "string",
  "productType": "string",
  "contractType": "string",
  "effectiveDate": "2026-03-15",
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

### Response

```json
{
  "data": {
    "id": "review_123",
    "organizationId": "org_123",
    "submissionReference": "string",
    "status": "submitted",
    "submittedByUserId": "user_123",
    "createdAt": "2026-03-15T00:00:00Z"
  }
}
```

## 7. Replacement rules

Use these rules in place of the old request-body actor rule:

- required request fields: `organizationId`, `submissionReference`, `title`, `summary`
- initial workflow state is `submitted`
- `submissionReference` should be unique within an organization
- `references` are optional in the transport contract
- attachment handling in Sprint 1 guarantees reference metadata only; storage backend details are out of scope for the public contract
- submitting actor is derived from authenticated server-side context
- `submittedByUserId` is a server-derived field and must not be accepted from the request body
- the submitting actor must have permission to submit a review for the target organization

## 8. Validation and error handling

Recommended server behavior during transition:

- if client sends `submittedByUserId`, reject the request with `VALIDATION_ERROR`
- do not silently trust or persist the client value
- if a short compatibility window is needed, the server may temporarily ignore the client field, but the public docs should still mark it unsupported

Preferred long-term behavior:
- reject the field explicitly

## 9. Audit impact

For review submission audit events:

- `actorId` comes from authenticated context
- `targetType` = `shariahReview`
- `targetId` = created review ID
- `action` = `reviewSubmitted`
- `outcome` = `success` or failure outcome
- `requestId` should be captured where available

## 10. Forward-compatible placeholder

If delegated submission is needed later, do not restore client-authored `submittedByUserId`.

Instead, introduce an explicit delegated-action design such as:

- authenticated actor from token
- separate subject or beneficiary field only where business-approved
- explicit authorization rule for acting on behalf
- dual audit capture of actor and subject

That future change is out of Sprint 1 scope.

## 11. Implementation impact

Backend patch:
- remove `submittedByUserId` from request schema
- derive submitter from auth context
- persist submitter as server-derived metadata if required
- update tests for spoofed-body rejection

Frontend patch:
- stop sending `submittedByUserId`
- rely on authenticated session instead

QA patch:
- add negative test where body includes `submittedByUserId`
- expected result: validation failure or explicit unsupported-field rejection

## 12. Acceptance condition for this patch

This patch is complete when:

- `API_CONTRACTS.md` no longer accepts `submittedByUserId` in request body
- submission response/history may expose submitter only as server-derived data
- request validation rejects or ignores client-authored submitter during the transition strategy selected by the team
- audit uses authenticated actor identity, not payload identity
````
