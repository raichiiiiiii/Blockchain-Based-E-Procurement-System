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

### 9.2 Provisional protected functions list

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

## 10. Shariah review submission contracts

### 10.1 Submit review request

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
    "createdAt": "2026-03-15T00:00:00Z"
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

[FLAG-SHARIAH-SUBMISSION-METADATA]
Mandatory metadata is not yet fully approved. The current shape represents a minimal baseline with richer metadata remaining provisional.

[FLAG-REFERENCE-HANDLING]
Reference vs attachment storage policy is not yet finalized beyond metadata-level support.

## 11. Checklist contracts

### 11.1 Save checklist outcome

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

## 12. Decision contracts

### 12.1 Record decision

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

## 13. Status-history contracts

### 13.1 Get current status and history

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

[FLAG-READ-AUDIT]
History-read logging requirements are not yet finalized, but sensitive history access is expected to be auditable in Sprint 1.
