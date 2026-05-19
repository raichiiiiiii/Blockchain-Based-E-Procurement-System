# Access Audit Event Contract

## 1. Purpose

This document defines the minimum access audit event payload contract required for PBI-120 implementation. It specifies the structure, fields, and semantics for all audit events capturing protected access actions.

## 2. Scope

This contract applies to all audit events generated for:
- Governed write operations
- Denied protected actions
- Selected sensitive read operations

It defines the canonical event structure, field semantics, and evidence requirements for MVP implementation.

## 3. Requirement Traceability

- ReqID: R22
- Feature: PBI-022
- Story: PBI-120
- Task: PBI-123

## 4. MVP Non-Repudiation Interpretation

For MVP, "cryptographic or equivalent non-repudiation evidence" means a deterministic event evidence package based on canonicalized event data and hash evidence. Real digital signatures, certificates, external timestamping authorities, and production key-management infrastructure are out of scope unless later introduced by a separate security task.

The MVP approach uses:
- SHA-256 hashing of canonicalized event payloads
- Stable JSON serialization for canonicalization
- Optional previous event chaining for sequence integrity
- No real cryptographic signatures or key management

## 5. Minimum Access Audit Event Payload

Define the canonical TypeScript-style shape:

```ts
export type AccessAuditOutcome =
  | 'success'
  | 'forbidden'
  | 'validationError'
  | 'notFound'
  | 'conflict'
  | 'error';

export type AccessAuditEvent = {
  eventId: string;
  schemaVersion: 'access-audit-event.v1';
  occurredAt: string;
  requestId: string;
  actorUserId: string;
  actorSource: 'actorContext';
  action: string;
  targetType: string;
  targetId: string;
  outcome: AccessAuditOutcome;
  reason?: string;
  route?: string;
  method?: string;
  module: 'membership' | 'access-control' | 'shariah-review';
  evidence: {
    payloadHash: string;
    canonicalization: 'json-stable-v1';
    previousEventHash?: string;
  };
};
```

## 6. Field Rules

For each field:

- **eventId**: Unique identifier for this audit event
  - Required: Yes
  - Source: Generated UUID
  - Format: UUID v4 string
  - Example: "550e8400-e29b-41d4-a716-446655440000"

- **schemaVersion**: Version identifier for the audit event schema
  - Required: Yes
  - Source: Hardcoded constant
  - Format: "access-audit-event.v{major}.{minor}"
  - Example: "access-audit-event.v1"

- **occurredAt**: Timestamp when the event occurred
  - Required: Yes
  - Source: Current system time in UTC
  - Format: ISO 8601 UTC timestamp
  - Example: "2026-04-22T10:30:00Z"

- **requestId**: Request correlation identifier
  - Required: Yes
  - Source: Fastify request.id
  - Format: Opaque string
  - Example: "req-7f3d9a1c-4e2b-4d1a-9f8c-1a2b3c4d5e6f"

- **actorUserId**: Authenticated user identifier
  - Required: Yes
  - Source: request.actorContext.userId
  - Format: Opaque string
  - Example: "user_12345"

- **actorSource**: Source of actor identity
  - Required: Yes
  - Source: Hardcoded based on implementation
  - Format: Enum string
  - Example: "actorContext"

- **action**: Name of the action being audited
  - Required: Yes
  - Source: Route handler
  - Format: camelCase string
  - Example: "createRole", "submitShariahReview"

- **targetType**: Type of resource being acted upon
  - Required: Yes
  - Source: Route handler
  - Format: camelCase string
  - Example: "role", "shariahReview", "memberOrganization"

- **targetId**: Identifier of the resource being acted upon
  - Required: Yes
  - Source: Route parameters, generated IDs, or composite identifiers
  - Format: Opaque string
  - Example: "role_abc123", "review_def456"

- **outcome**: Result category of the action
  - Required: Yes
  - Source: Route handler logic
  - Format: Enum string from AccessAuditOutcome
  - Example: "success", "forbidden", "validationError"

- **reason**: Reason for failure or denial
  - Required: When outcome is not "success"
  - Source: Route handler logic
  - Format: Stable code string
  - Example: "admin_required", "role_not_found", "duplicate_assignment"

- **route**: HTTP route pattern
  - Required: No
  - Source: Route handler
  - Format: HTTP route pattern
  - Example: "/api/v1/roles/:roleId"

- **method**: HTTP method
  - Required: No
  - Source: Route handler
  - Format: Uppercase HTTP method
  - Example: "POST", "PATCH", "DELETE"

- **module**: Module generating the event
  - Required: Yes
  - Source: Route handler
  - Format: Enum string
  - Example: "access-control", "shariah-review"

- **evidence.payloadHash**: Hash of the canonicalized event payload
  - Required: Yes
  - Source: Computed from event data
  - Format: Hex-encoded SHA-256 hash
  - Example: "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890"

- **evidence.canonicalization**: Canonicalization method used
  - Required: Yes
  - Source: Hardcoded constant
  - Format: Enum string
  - Example: "json-stable-v1"

- **evidence.previousEventHash**: Hash of the previous audit event
  - Required: No (optional for PBI-120)
  - Source: Previous event's payloadHash
  - Format: Hex-encoded SHA-256 hash
  - Example: "f0e9d8c7b6a59483726150432109876543210987654321098765432109876543"

## 7. Actor Identity Rules

- Current actor context comes from transitional backend actor-context plugin
- Do not trust frontend-authored identity as final production source
- Future production source must be server-derived authenticated actor context
- Event payload should preserve actor source metadata
- Actor identity must be derived from trusted server-side request context, not client-supplied headers

## 8. Request Correlation Rules

- Use Fastify `request.id` as the primary request correlation source
- Request ID should be generated automatically by Fastify if not provided
- Request ID must be included in all audit events for troubleshooting and correlation
- Request ID format should be opaque and unique per request

## 9. Evidence Hash Rules

- Payload hash is computed over canonical event payload excluding `eventId`, `evidence.payloadHash`, and `evidence.previousEventHash`
- Canonicalization uses stable JSON ordering (json-stable-v1)
- Hash algorithm recommendation: SHA-256
- PreviousEventHash is optional for PBI-120 unless chain-style storage is implemented in PBI-124
- Signature/key-management is deferred to future work

Canonicalization process:
1. Remove `eventId`, `evidence.payloadHash`, and `evidence.previousEventHash` from the event object
2. Serialize the remaining fields using stable JSON ordering
3. Compute SHA-256 hash of the serialized string

## 10. Outcome Taxonomy

When to use each outcome:

- **success**: Operation completed successfully
- **forbidden**: Access denied due to authorization failure
- **validationError**: Business rule or data validation failure
- **notFound**: Resource not found when security-sensitive
- **conflict**: Duplicate or conflicting operation
- **error**: Unexpected system error (infrastructure failures)

## 11. Explicit Exclusions

This contract explicitly excludes:

- External SIEM integration requirements
- Auditor query/search API specifications
- Event detail/sequence inspection API specifications
- Production key management infrastructure
- Frontend-authored privileged actor headers as trusted sources
