# Access History Query Contract

## 1. Purpose

This contract defines the auditor access-history search behavior for PBI-121 before repository/API implementation. It establishes the query interface, filters, response format, and behavior expectations for searching already-recorded shared access audit events.

## 2. Scope

This contract covers only access-history query/search over already-recorded shared access audit events. It defines the supported filters, query parameters, validation rules, response shape, and ordering behavior for auditor search functionality.

## 3. Out of Scope

This contract explicitly excludes:
- New audit capture behavior
- Event-detail inspection
- Chronological sequence inspection
- Full-text search
- External reporting
- BI dashboards
- UI implementation
- Transport-layer API route implementation
- Authorization enforcement (handled in PBI-130)

## 4. Source Event Contract

The query model is based on the existing `AccessAuditEvent` payload defined in ACCESS_AUDIT_EVENT_CONTRACT.md. Key fields include:

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
- module
- route
- method
- reason
- evidence.payloadHash
- evidence.canonicalization
- evidence.previousEventHash

## 5. Supported Filters

The following filters are supported for access history queries:

- actorUserId: Filter by actor user ID
- targetType: Filter by target resource type
- targetId: Filter by target resource ID
- action: Filter by action name
- outcome: Filter by outcome category (success, forbidden, validationError, notFound, conflict, error)
- occurredFrom: Filter by earliest occurrence timestamp (inclusive)
- occurredTo: Filter by latest occurrence timestamp (inclusive)
- module: Filter by module (membership, access-control, shariah-review) - optional extension
- route: Filter by HTTP route pattern - optional extension
- method: Filter by HTTP method - optional extension

## 6. Query Parameter Contract

Query parameters use these stable names:

- actorUserId
- targetType
- targetId
- action
- outcome
- occurredFrom
- occurredTo
- module
- route
- method
- limit
- cursor

Pagination support is minimal. The limit parameter controls maximum results returned. Cursor-based pagination may be implemented in PBI-129/PBI-130.

## 7. Validation Rules

- Timestamps (occurredFrom, occurredTo) must be ISO 8601 UTC-compatible strings
- occurredFrom must be <= occurredTo when both are provided
- outcome must be one of: success, forbidden, validationError, notFound, conflict, error
- limit must be a positive integer if provided
- Unknown query parameters must be rejected for contract stability
- Empty filters are allowed and return the default ordered event list (if auditor authorization passes)

## 8. Response Shape

Response uses this envelope structure:

```json
{
  "data": {
    "items": []
  }
}
```

If pagination is implemented later, the structure will be extended to:

```json
{
  "data": {
    "items": [],
    "page": {
      "limit": 50,
      "nextCursor": null
    }
  }
}
```

## 9. Event Projection

Returned events include all fields from the source AccessAuditEvent payload without expansion:

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
- reason (when present)
- route (when present)
- method (when present)
- module
- evidence.payloadHash
- evidence.canonicalization
- evidence.previousEventHash (when present)

## 10. Ordering Rules

Results are ordered by:
1. occurredAt ascending
2. eventId ascending (for stable ordering when timestamps are identical)

This ordering supports traceable investigation sequences. Reverse chronological sorting is out of scope.

## 11. Empty Result Semantics

Empty results return:
- HTTP 200 OK
- data.items = []
- No error in response

## 12. Authorization Expectations

Access-history search is auditor-only functionality. Authorization enforcement is not implemented in the query contract but will be handled at the API boundary in PBI-130. The query layer assumes auditor authorization has been verified.

## 13. Example Queries and Responses

### Query by actor
GET /access-history?actorUserId=user_123

### Query by target
GET /access-history?targetType=role&targetId=role_abc

### Query by action
GET /access-history?action=createRoleAssignment

### Query by outcome
GET /access-history?outcome=forbidden

### Query by time range
GET /access-history?occurredFrom=2026-04-01T00:00:00Z&occurredTo=2026-04-30T23:59:59Z

### Empty result
GET /access-history?actorUserId=nonexistent_user

```json
{
  "data": {
    "items": []
  }
}
```

### Combined filters
GET /access-history?actorUserId=user_123&action=createRoleAssignment&outcome=success&occurredFrom=2026-04-01T00:00:00Z

```json
{
  "data": {
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "access-audit-event.v1",
        "occurredAt": "2026-04-01T10:30:00Z",
        "requestId": "req-7f3d9a1c-4e2b-4d1a-9f8c-1a2b3c4d5e6f",
        "actorUserId": "user_123",
        "actorSource": "actorContext",
        "action": "createRoleAssignment",
        "targetType": "roleAssignment",
        "targetId": "user_123:org_456:role_reviewer",
        "outcome": "success",
        "module": "access-control",
        "evidence": {
          "payloadHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
          "canonicalization": "json-stable-v1"
        }
      }
    ]
  }
}
```

## 14. Implementation Guidance for PBI-129 and PBI-130

- PBI-129 should implement repository/read-model filtering against AccessAuditEvent
- PBI-130 should expose the API route and enforce auditor authorization
- PBI-122 remains responsible for event-detail and chronological sequence inspection
- Query implementation should preserve exact field names and semantics from AccessAuditEvent
- Pagination can be added as a bounded result set first if needed

## 15. PBI-122 Boundary

This contract returns searchable event lists only and does not provide:
- Event-detail drill-down features
- Chronological evidence sequence reconstruction
- Detailed inspection capabilities
These features remain the responsibility of PBI-122.

## 16. Acceptance Criteria Mapping

This contract satisfies PBI-128 acceptance criteria:
- Supported filters are explicitly defined (actor, target, action, outcome, time range, plus optional extensions)
- Empty successful results are documented (200 OK with empty items array)
- Stable ordering is documented (occurredAt ascending, then eventId ascending)
- Contract is aligned with PBI-120 approved audit payload (uses AccessAuditEvent fields directly)
