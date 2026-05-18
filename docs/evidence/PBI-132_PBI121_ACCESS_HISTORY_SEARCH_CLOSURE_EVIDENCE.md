# PBI-132 PBI-121 Access History Search Closure Evidence

## 1. Purpose

This document provides closure evidence for PBI-121, which enables authorized auditors to search recorded access-history events. It packages final evidence demonstrating that the auditor access-history search capability has been fully implemented and tested according to the approved contracts.

## 2. Story Scope

PBI-121 enables authorized auditors to search recorded access-history events by:
- actor
- target
- action
- outcome
- time range

Additionally, the implementation supports optional documented API filters:
- module
- route
- method

## 3. Out of Scope

This implementation does not include:
- UI implementation
- External reporting
- BI dashboards
- PBI-122 event-detail inspection
- PBI-122 chronological sequence inspection
- New audit recording behavior
- Pagination (deferred to later implementation)

## 4. Dependency Completion Summary

| PBI | Purpose | Evidence / Artifact | Status |
|-----|---------|---------------------|--------|
| PBI-128 | Query contract | docs/ACCESS_HISTORY_QUERY_CONTRACT.md | Complete |
| PBI-129 | Read model/query service | docs/evidence/PBI-129_ACCESS_HISTORY_QUERY_READ_MODEL_EVIDENCE.md | Complete |
| PBI-130 | API endpoint | docs/evidence/PBI-130_ACCESS_HISTORY_API_EVIDENCE.md | Complete |
| PBI-131 | End-to-end validation | src/modules/shared/api/access-history.routes.test.ts | Complete |

## 5. Implemented Query Behavior

The access-history query behavior is implemented as:
- GET /api/v1/access-history endpoint
- Requires auditor role for access
- Consumes queryAccessHistory(accessAuditEventRepository, query) service
- Returns response in shape: { data: { items: [] } }

The API consumes the PBI-129 read model and does not reimplement filtering logic, ensuring consistency with the underlying data access patterns.

## 6. Supported Filter Matrix

| Filter | Supported? | Semantics | Validation Notes |
|--------|------------|-----------|------------------|
| actorUserId | ✅ | Exact match on actor user ID | |
| targetType | ✅ | Exact match on target resource type | |
| targetId | ✅ | Exact match on target resource ID | |
| action | ✅ | Exact match on action name | |
| outcome | ✅ | Exact match on outcome category | Allowed values: success, forbidden, validationError, notFound, conflict, error |
| occurredFrom | ✅ | Events at or after timestamp (inclusive) | Must be ISO 8601 UTC-compatible string |
| occurredTo | ✅ | Events at or before timestamp (inclusive) | Must be ISO 8601 UTC-compatible string |
| module | ✅ | Exact match on module | Allowed values: membership, access-control, shariah-review |
| route | ✅ | Exact match on HTTP route pattern | |
| method | ✅ | Exact match on HTTP method | Allowed values: GET, POST, PUT, PATCH, DELETE |

## 7. Ordering and Empty-Result Behavior

- Ordering: occurredAt ascending, then eventId ascending for stable chronological sequencing
- Empty result: Returns 200 OK with data.items = [] without error

## 8. Validation and Authorization Behavior

- Unknown query parameters → 400 VALIDATION_ERROR
- limit/cursor → 400 VALIDATION_ERROR because pagination is deferred
- Invalid outcome → 400 VALIDATION_ERROR
- Invalid module → 400 VALIDATION_ERROR
- Invalid method → 400 VALIDATION_ERROR
- Invalid timestamp → 400 VALIDATION_ERROR
- Invalid time range (occurredFrom > occurredTo) → 400 VALIDATION_ERROR
- Non-auditor access → 403 FORBIDDEN

## 9. Representative Request and Response Samples

### Sample A — successful query

Request:
```
GET /api/v1/access-history?action=viewShariahReviewHistory&module=shariah-review&method=GET
Headers: x-actor-role: auditor
```

Response:
```json
{
  "data": {
    "items": [
      {
        "eventId": "550e8400-e29b-41d4-a716-446655440000",
        "schemaVersion": "access-audit-event.v1",
        "occurredAt": "2026-04-01T10:30:00Z",
        "requestId": "req-pbi132-success-sample",
        "actorUserId": "authorized-coordinator",
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

### Sample B — empty-result query

Request:
```
GET /api/v1/access-history?actorUserId=no-matching-user
Headers: x-actor-role: auditor
```

Response:
```json
{
  "data": {
    "items": []
  }
}
```

### Sample C — denied access

Request:
```
GET /api/v1/access-history
Headers: x-actor-role: coordinator
```

Non-auditor response:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query access history"
  }
}
```

Validation error sample:
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

## 10. Representative Search Path Coverage

| Search Path | Representative Action | Outcome | Test Evidence |
|-------------|-----------------------|---------|---------------|
| Protected/governed write | createRoleAssignment | success | src/modules/shared/api/access-history.routes.test.ts |
| Denied protected action | changeRoleAssignment | forbidden | src/modules/shared/api/access-history.routes.test.ts |
| Selected sensitive read | viewShariahReviewHistory | success | src/modules/shared/api/access-history.routes.test.ts |

## 11. Automated Validation Evidence

Validation commands:
```bash
npm run build
```
Build successful

```bash
npm test
```
npm test: passed

```bash
git diff --check
```
clean

```bash
git diff --stat
```
shows this PBI-132 evidence document as the documentation-only change.

PBI-131 validation coverage includes:
- actor filter
- target filter
- action filter
- outcome filter
- time range filter
- combined filters with AND semantics
- stable ordering (occurredAt ascending, eventId ascending)
- empty successful result handling
- invalid query input rejection
- unsupported query parameters rejection
- auditor authorization enforcement
- representative protected-write search path
- representative denied-action search path
- representative selected sensitive-read search path
- payload preservation across all AccessAuditEvent fields

## 12. Documentation Evidence

This implementation aligns with and is supported by:
- docs/ACCESS_HISTORY_QUERY_CONTRACT.md
- docs/API_CONTRACTS.md
- docs/evidence/PBI-129_ACCESS_HISTORY_QUERY_READ_MODEL_EVIDENCE.md
- docs/evidence/PBI-130_ACCESS_HISTORY_API_EVIDENCE.md

## 13. Risks and Follow-Up Notes

- Pagination remains deferred as specified in the original requirements
- PBI-122 owns event-detail and chronological sequence inspection capabilities
- Current auditor authorization uses actor-context role scaffolding which will need to be replaced with real authentication in production
- Future production authentication/authorization hardening may replace header-based test scaffolding
- Large route/test files should be modularized separately if future iteration cost increases

## 14. Acceptance Criteria Mapping

This implementation satisfies the PBI-132 acceptance criteria:
- ✅ Supported filters, ordering, empty-result behavior, and authorization expectations are explicitly captured
- ✅ Representative query request/response samples and automated validation results are available for closure

## 15. Closeout Verdict

PBI-121 is ready for Product Owner / Scrum Master closure through PBI-132. The auditor access-history search capability has been fully implemented, tested, and documented according to the approved contracts and requirements.
