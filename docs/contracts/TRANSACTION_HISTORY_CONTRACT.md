# Procure-to-Pay Transaction History Contract

## 1. Purpose

This document defines the procure-to-pay transaction history contract for PBI-005. It establishes the lifecycle event fields, ordering rules, identifier semantics, and completeness/gap detection behavior required for downstream implementation tasks.

## 2. Traceability

- ReqID: R05
- Feature: PBI-005
- Task: PBI-145
- Consumers: PBI-143, PBI-144, PBI-149

## 3. Lifecycle Event Fields

Define the canonical TypeScript-style shape:

```ts
export type ProcureToPayLifecycleEvent = {
  eventId: string;
  schemaVersion: 'procure-to-pay-lifecycle-event.v1';
  occurredAt: string;
  recordedAt: string;
  requestId: string;
  correlationId: string;
  caseId: string;
  lifecycleStage: 'purchaseOrder' | 'delivery' | 'invoice' | 'settlement';
  eventType: string;
  actorUserId: string;
  actorSource: 'actorContext';
  targetType: string;
  targetId: string;
  outcome: 'success' | 'rejected' | 'voided' | 'failed';
  reason?: string;
  immutableReference: {
    payloadHash: string;
    canonicalization: 'json-stable-v1';
    previousEventHash?: string;
    sourcePayloadRef?: string;
    sourceRecordRef?: string;
    anchorRef?: string;
  };
  metadata?: Record<string, unknown>;
};
```

Field semantics:

- **eventId**: Unique identifier for this lifecycle event
  - Required: Yes
  - Source: Generated UUID
  - Format: UUID v4 string
  - Example: "550e8400-e29b-41d4-a716-446655440000"

- **schemaVersion**: Version identifier for the lifecycle event schema
  - Required: Yes
  - Source: Hardcoded constant
  - Format: "procure-to-pay-lifecycle-event.v{major}.{minor}"
  - Example: "procure-to-pay-lifecycle-event.v1"

- **occurredAt**: Timestamp when the business event occurred
  - Required: Yes
  - Source: Business system timestamp
  - Format: ISO 8601 UTC timestamp
  - Example: "2026-04-22T10:30:00Z"

- **recordedAt**: Timestamp when the event was recorded in the audit system
  - Required: Yes
  - Source: System ingestion time
  - Format: ISO 8601 UTC timestamp
  - Example: "2026-04-22T10:30:05Z"

- **requestId**: Request correlation identifier
  - Required: Yes
  - Source: Fastify request.id or equivalent
  - Format: Opaque string
  - Example: "req-7f3d9a1c-4e2b-4d1a-9f8c-1a2b3c4d5e6f"

- **correlationId**: Identifier grouping related procure-to-pay lifecycle events
  - Required: Yes
  - Source: Business process correlation
  - Format: Opaque string
  - Example: "corr-12345"

- **caseId**: Identifier for the business case/history (also referred to as transactionId)
  - Required: Yes
  - Source: Business process identifier
  - Format: Opaque string
  - Example: "ptp-case-123"
  - Implementations may map an existing transaction identifier to `caseId`, but this response contract uses `caseId` as the canonical transaction-history key.

- **lifecycleStage**: Stage in the procure-to-pay lifecycle
  - Required: Yes
  - Source: Event context
  - Format: Enum string
  - Values: 'purchaseOrder', 'delivery', 'invoice', 'settlement'

- **eventType**: Specific type of event within the lifecycle stage
  - Required: Yes
  - Source: Event context
  - Format: camelCase string
  - Examples: "purchaseOrderCreated", "invoiceApproved", "settlementCompleted"

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

- **targetType**: Type of resource being acted upon
  - Required: Yes
  - Source: Event context
  - Format: camelCase string
  - Example: "purchaseOrder", "invoice", "settlement"

- **targetId**: Identifier of the resource being acted upon
  - Required: Yes
  - Source: Resource identifier
  - Format: Opaque string
  - Example: "po_abc123", "inv_def456"

- **outcome**: Result category of the action
  - Required: Yes
  - Source: Event context
  - Format: Enum string
  - Example: "success", "rejected", "voided", "failed"
  - Transport/API failures such as `VALIDATION_ERROR`, `FORBIDDEN`, and `NOT_FOUND` are handled through the standard API error envelope in `API_CONTRACTS.md`. They are not lifecycle event outcomes.

- **reason**: Reason for failure or denial
  - Required: When outcome is not "success"
  - Source: Event context
  - Format: Stable code string
  - Example: "validation_failed", "insufficient_funds"

- **immutableReference**: Non-repudiation evidence
  - Required: Yes
  - Source: Computed from event data
  - Contains:
    - payloadHash: SHA-256 hash of canonicalized event payload
    - canonicalization: Canonicalization method used
    - previousEventHash: Optional hash of previous event
    - sourcePayloadRef: Optional reference to source payload
    - sourceRecordRef: Optional reference to source record
    - anchorRef: Optional provisional blockchain anchor reference

- **metadata**: Optional additional event metadata
  - Required: No
  - Source: Event context
  - Format: Key-value pairs
  - Example: { "amount": 1000, "currency": "USD" }

## 4. Lifecycle Stages

Procure-to-pay lifecycle stages:

- **purchaseOrder**: Purchase order creation and approval
- **delivery**: Goods/service delivery confirmation
- **invoice**: Invoice issuance and approval
- **settlement**: Payment processing and completion

## 5. Example Event Types

Example event types by lifecycle stage:

- **purchaseOrder**:
  - purchaseOrderCreated
  - purchaseOrderAccepted
  - purchaseOrderRejected
  - purchaseOrderModified

- **delivery**:
  - deliveryRecorded
  - deliveryEvidenceSubmitted
  - deliveryAccepted
  - deliveryRejected
  - deliveryModified

- **invoice**:
  - invoiceIssued
  - invoiceApproved
  - invoiceRejected
  - invoicePaid

- **settlement**:
  - settlementInitiated
  - settlementCompleted
  - settlementFailed
  - settlementReversed

## 6. Immutable Reference Semantics

MVP non-repudiation evidence includes:

- **payloadHash**: SHA-256 hash of canonicalized event payload (excluding eventId, payloadHash, previousEventHash)
- **canonicalization**: Stable JSON serialization method ("json-stable-v1")
- **previousEventHash**: Optional hash of previous event for chain integrity
- **sourcePayloadRef**: Optional reference to original source payload
- **sourceRecordRef**: Optional reference to source system record
- **anchorRef**: Optional provisional blockchain anchor reference

Real signatures, certificates, external timestamping authorities, and key management are out of scope for MVP.

## 7. Identifier/Correlation Rules

- **eventId**: Identifies one lifecycle event (UUID)
- **requestId**: Correlates one technical request
- **correlationId**: Groups related procure-to-pay lifecycle events
- **caseId/transactionId**: Identifies the business case/history
- **targetType/targetId**: Identify the affected entity
- Public IDs are opaque strings

## 8. Ordering

Event ordering rules:

- Primary sort: occurredAt ascending
- Secondary sort: eventId ascending (tie-breaker)
- Direction: ascending
- recordedAt is ingestion/storage time, not the primary lifecycle order
- Do not infer missing events purely from timestamp gaps

## 9. Response Shape

Documented JSON response for history retrieval:

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "complete | partial | unknown | gapDetected",
      "reason": "string",
      "message": "string"
    },
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2026-04-22T10:30:00Z",
        "recordedAt": "2026-04-22T10:30:05Z",
        "requestId": "req-7f3d9a1c-4e2b-4d1a-9f8c-1a2b3c4d5e6f",
        "correlationId": "corr-12345",
        "caseId": "ptp-case-123",
        "lifecycleStage": "purchaseOrder",
        "eventType": "purchaseOrderCreated",
        "actorUserId": "user_12345",
        "actorSource": "actorContext",
        "targetType": "purchaseOrder",
        "targetId": "po_abc123",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1"
        },
        "metadata": {
          "amount": 1000,
          "currency": "USD"
        }
      }
    ]
  }
}
```

## 10. Completeness/Gap Meanings

Completeness status values:

- **complete**: All expected events for scope/window can be proven returned
- **partial**: Known limitation or unavailable events
- **unknown**: Completeness cannot be proven
- **gapDetected**: Missing expected lifecycle stage, broken chain, or missing correlation evidence detected

Example completeness reasons:

- completeness_not_proven
- no_events_recorded
- missing_expected_lifecycle_stage
- broken_hash_chain
- missing_correlation_key
- filtered_time_window
- source_event_unavailable

## 11. Empty Result Semantics

- Existing case with no events returns success with data.items = []
- Empty response still includes ordering and completeness metadata
- Do not treat empty history as an error

Example empty response:

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "no_events_recorded",
      "message": "No events have been recorded for this case"
    },
    "items": []
  }
}
```

## 12. Error Guidance

Reuse API_CONTRACTS.md standard envelope:

- VALIDATION_ERROR for invalid query/contract inputs
- FORBIDDEN for unauthorized access
- NOT_FOUND for missing case/resource where appropriate
- No route-specific error shapes

Example validation error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "issues": [
        {
          "path": "caseId",
          "message": "caseId is required"
        }
      ]
    }
  }
}
```

Example forbidden error:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query transaction history"
  }
}
```

## 13. Examples

### Successful Ordered History

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "complete",
      "reason": "completeness_proven",
      "message": "All expected events for this case have been returned"
    },
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2026-04-22T10:30:00Z",
        "recordedAt": "2026-04-22T10:30:05Z",
        "requestId": "req-1",
        "correlationId": "corr-123",
        "caseId": "ptp-case-123",
        "lifecycleStage": "purchaseOrder",
        "eventType": "purchaseOrderCreated",
        "actorUserId": "user_12345",
        "actorSource": "actorContext",
        "targetType": "purchaseOrder",
        "targetId": "po_abc123",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1"
        }
      },
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440001",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2026-04-23T14:15:00Z",
        "recordedAt": "2026-04-23T14:15:05Z",
        "requestId": "req-2",
        "correlationId": "corr-123",
        "caseId": "ptp-case-123",
        "lifecycleStage": "delivery",
        "eventType": "deliveryRecorded",
        "actorUserId": "user_67890",
        "actorSource": "actorContext",
        "targetType": "delivery",
        "targetId": "del_def456",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "b1c2d3e4f5a67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1",
          "previousEventHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890"
        }
      }
    ]
  }
}
```

### Unknown Completeness

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
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
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2026-04-22T10:30:00Z",
        "recordedAt": "2026-04-22T10:30:05Z",
        "requestId": "req-1",
        "correlationId": "corr-123",
        "caseId": "ptp-case-123",
        "lifecycleStage": "purchaseOrder",
        "eventType": "purchaseOrderCreated",
        "actorUserId": "user_12345",
        "actorSource": "actorContext",
        "targetType": "purchaseOrder",
        "targetId": "po_abc123",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1"
        }
      }
    ]
  }
}
```

### Gap Detected

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "gapDetected",
      "reason": "missing_expected_lifecycle_stage",
      "message": "Expected invoice stage events are missing from the sequence"
    },
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2026-04-22T10:30:00Z",
        "recordedAt": "2026-04-22T10:30:05Z",
        "requestId": "req-1",
        "correlationId": "corr-123",
        "caseId": "ptp-case-123",
        "lifecycleStage": "purchaseOrder",
        "eventType": "purchaseOrderCreated",
        "actorUserId": "user_12345",
        "actorSource": "actorContext",
        "targetType": "purchaseOrder",
        "targetId": "po_abc123",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1"
        }
      },
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440002",
        "schemaVersion": "procure-to-pay-lifecycle-event.v1",
        "occurredAt": "2026-04-25T09:00:00Z",
        "recordedAt": "2026-04-25T09:00:05Z",
        "requestId": "req-3",
        "correlationId": "corr-123",
        "caseId": "ptp-case-123",
        "lifecycleStage": "settlement",
        "eventType": "settlementInitiated",
        "actorUserId": "user_11111",
        "actorSource": "actorContext",
        "targetType": "settlement",
        "targetId": "set_ghi789",
        "outcome": "success",
        "immutableReference": {
          "payloadHash": "c1d2e3f4a5b67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1",
          "previousEventHash": "b1c2d3e4f5a67890abcdef1234567890abcdef1234567890abcdef1234567890"
        }
      }
    ]
  }
}
```

## 14. Downstream Guidance

- PBI-143/PBI-164+ must record lifecycle events using this model
- PBI-144/PBI-168+ must return ordered history using this model
- PBI-149 must validate consumer readiness against this contract
- UI/dashboard consumers must not hide or reinterpret completeness metadata
- Consumers must not treat unknown, partial, or gapDetected as complete

## 15. Validation

This is a documentation-only contract. No runtime tests are required.
