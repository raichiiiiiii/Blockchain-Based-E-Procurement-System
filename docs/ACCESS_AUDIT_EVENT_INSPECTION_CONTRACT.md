# Access Audit Event Inspection Contract

## 1. Purpose

This contract defines event-detail and chronological sequence-inspection behavior for PBI-122 before implementation. It establishes the inspection interface, evidence fields, sequence retrieval rules, and behavior expectations for auditors investigating individual access audit events and their chronological contexts.

## 2. Scope

This contract covers:
- Single event detail by eventId
- Chronological sequence inspection by actor
- Chronological sequence inspection by target
- Required evidence fields for inspection
- Missing-event semantics
- Incomplete-history semantics
- MVP non-repudiation evidence interpretation

## 3. Out of Scope

This contract explicitly excludes:
- Repository implementation
- API route implementation
- UI implementation
- External export tooling
- Cryptographic key management
- External timestamping authorities
- Digital signatures
- PBI-121 search behavior (already completed)

## 4. Source Event Contract Alignment

Event detail and sequence inspection are based on the existing `AccessAuditEvent` payload from `docs/ACCESS_AUDIT_EVENT_CONTRACT.md`. Core event fields include:

- eventId
- schemaVersion
- occurredAt
- requestId
- actorUserId
- actorSource
- action
- targetType
- targetId
- outcome
- reason
- module
- route
- method
- evidence.payloadHash
- evidence.canonicalization
- evidence.previousEventHash

## 5. Event Detail Contract

Event detail is defined as retrieval of one recorded access-audit event by `eventId`. The future logical operation would be:

```
getAccessAuditEventDetail(eventId)
```

The response must return one event projection without changing payload semantics.

## 6. Required Event Detail Fields

Required fields for event detail inspection:
- eventId
- schemaVersion
- occurredAt
- requestId
- actorUserId
- actorSource
- action
- targetType
- targetId
- outcome
- reason (where present)
- module
- route (where present)
- method (where present)
- evidence.payloadHash
- evidence.canonicalization
- evidence.previousEventHash (where present)

## 7. MVP Inspectable Evidence

MVP inspectable non-repudiation evidence includes:
- payloadHash
- canonicalization
- previousEventHash when present
- Event identity and request correlation fields
- Actor identity source metadata

Real signatures, certificates, external timestamping authorities, and key management are out of scope.

## 8. Missing Event Behavior

Missing event behavior:
- Missing event by eventId returns notFound behavior
- No fabricated event payload
- No partial success response for missing event detail
- Future API should use 404 NOT_FOUND or equivalent domain result

## 9. Chronological Sequence Contract

Sequence inspection is defined as retrieving related recorded events around a scope:
- Actor-based sequence
- Target-based sequence

The sequence is an ordered list of `AccessAuditEvent` projections plus metadata about scope and completeness.

## 10. Sequence Lookup Dimensions

Actor sequence lookup:
- actorUserId
- Optional occurredFrom
- Optional occurredTo

Target sequence lookup:
- targetType
- targetId
- Optional occurredFrom
- Optional occurredTo

Actor and target sequence modes should not be ambiguous. A request should specify exactly one sequence dimension:
- actor sequence OR target sequence

If both actor and target are supplied, future implementation should reject or require explicit mode. Prefer rejecting ambiguous mixed sequence mode for MVP contract stability.

## 11. Sequence Ordering Rules

Ordering:
- occurredAt ascending
- eventId ascending tie-breaker

This matches PBI-121 access-history ordering.

## 12. Incomplete Sequence Behavior

Incomplete sequence behavior is explicitly defined. The response must not imply completeness when the implementation cannot prove it.

Sequence completeness metadata:
```json
{
  "completeness": {
    "status": "complete | partial | unknown",
    "reason": "string",
    "message": "string"
  }
}
```

Meanings:
- complete: implementation can return all events matching the scope and time window
- partial: implementation knows some events may be missing or unavailable
- unknown: implementation cannot prove whether all related events are present

For MVP, if repository cannot prove completeness, prefer:
- status: unknown
- or status: partial

depending on available information.

Incomplete/unknown sequences must still return available events if safe, but must include completeness metadata.

## 13. Response Shape Examples

### Event detail success

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
        "canonicalization": "json-stable-v1",
        "previousEventHash": "previous-sha256-placeholder"
      }
    }
  }
}
```

### Missing event

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Access audit event not found"
  }
}
```

### Actor sequence

```json
{
  "data": {
    "scope": {
      "type": "actor",
      "actorUserId": "admin-user"
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

### Target sequence

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
    "items": []
  }
}
```

## 14. Relationship to PBI-121 Access-History Search

- PBI-121 returns searchable event lists
- PBI-122 provides event-level detail and scoped chronological sequence inspection
- PBI-122 must not redefine the source event payload
- Ordering remains aligned with PBI-121

## 15. Implementation Guidance for PBI-134, PBI-135, and PBI-136

Implementation guidance:
- PBI-134 should implement event detail retrieval by eventId
- PBI-135 should implement actor/target sequence retrieval
- PBI-136 should harden missing and incomplete sequence behavior
- PBI-137 should package validation and closure evidence

Additional guidance:
- Do not add event-detail logic to PBI-121 query endpoint
- Do not claim sequence completeness unless proven

## 16. Acceptance Criteria Mapping

This contract satisfies PBI-133 acceptance criteria:
- Required evidence fields and sequence retrieval rules are explicitly defined
- Incomplete-sequence handling is documented explicitly
