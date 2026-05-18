# PBI-134 Access Audit Event Detail Evidence

## 1. Purpose

This evidence proves PBI-134 implements single access-audit event retrieval by `eventId`. It demonstrates that auditors can retrieve detailed information about a specific access audit event using its unique identifier.

## 2. Scope

This evidence covers:
- Application-level event detail lookup
- Auditor-only API detail route
- Payload preservation
- Missing event notFound behavior
- List/search regression protection

## 3. Out of Scope

This evidence explicitly excludes:
- Actor sequence retrieval
- Target sequence retrieval
- Sequence completeness metadata
- PBI-135 chronological sequence work
- PBI-136 missing/incomplete sequence hardening
- UI
- External export/reporting
- New audit recording behavior
- Cryptographic key-management policy

## 4. Implementation Summary

The implementation consists of:
- `src/modules/shared/application/access-audit-event-detail.ts`
- `getAccessAuditEventDetail(repository, eventId)` function
- Uses `AccessAuditEventRepository.list()` to find events
- Returns `AccessAuditEvent | null`
- Does not modify repository interface
- Does not implement sequence retrieval

## 5. Event Detail Read Path

The event detail read path:
- Calls `repository.list()` to retrieve all events
- Finds event by matching `eventId`
- Returns full `AccessAuditEvent` when found
- Returns `null` when missing

## 6. API Endpoint Behavior

The API endpoint behavior:
- `GET /api/v1/access-history/events/:eventId`
- Auditor role required
- `200 OK` with `{ data: { event } }` when found
- `404 NOT_FOUND` when missing
- `403 FORBIDDEN` for non-auditor

## 7. Payload Preservation

All required AccessAuditEvent fields are preserved:
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
- `reason`
- `module`
- `route`
- `method`
- `evidence.payloadHash`
- `evidence.canonicalization`
- `evidence.previousEventHash`, where present

## 8. Missing Event Behavior

Missing event behavior:
- Missing `eventId` returns `404 NOT_FOUND`
- No fabricated event payload
- No partial success response

## 9. Authorization Behavior

Authorization behavior:
- Event detail route reuses auditor role boundary from access-history route
- Non-auditor receives `403 FORBIDDEN`

## 10. Regression Coverage

Regression coverage includes:
- Existing `GET /api/v1/access-history` list/search route remains covered by regression test
- PBI-121 query/list behavior is not changed

## 11. Test Evidence Matrix

| Behavior | Test File | Test Name / Evidence |
|---------|-----------|---------------------|
| Existing eventId returns event | `src/modules/shared/application/access-audit-event-detail.test.ts` | `returns existing event when eventId matches` |
| Missing eventId returns null | `src/modules/shared/application/access-audit-event-detail.test.ts` | `returns null when eventId does not exist` |
| Payload fields preserved | `src/modules/shared/application/access-audit-event-detail.test.ts` | `preserves all payload fields in returned event` |
| Repository.list() remains usable | `src/modules/shared/application/access-audit-event-detail.test.ts` | `does not break existing list/query behavior` |
| Authorized auditor retrieves event detail by eventId | `src/modules/shared/api/access-history.routes.test.ts` | `should return event detail for authorized auditor with valid eventId` |
| Missing eventId returns 404 NOT_FOUND | `src/modules/shared/api/access-history.routes.test.ts` | `should return 404 NOT_FOUND for missing eventId` |
| Non-auditor denied | `src/modules/shared/api/access-history.routes.test.ts` | `should deny access for non-auditor user requesting event detail` |
| Existing access-history list endpoint still works | `src/modules/shared/api/access-history.routes.test.ts` | `should not break existing access-history list endpoint after adding event detail endpoint` |

## 12. Validation Commands

Validation commands executed:
```bash
npm run build: passed
npm test: passed
git diff --check: clean
```

## 13. Risks and Follow-Up Notes

Risks and follow-up notes:
- Lookup currently uses `repository.list()`; acceptable for current seam but can be optimized later
- PBI-135 owns chronological actor/target sequence retrieval
- PBI-136 owns missing/incomplete sequence hardening beyond single-event notFound
- Current auditor authorization uses actor-context role scaffolding

## 14. Acceptance Criteria Mapping

Acceptance criteria mapping:
- Given an existing event ID is requested, detail retrieval returns approved event evidence fields.
- Given a missing event ID is requested, retrieval returns correct not-found behavior without misleading data.

## 15. Closeout Verdict

PBI-134 is ready for review/acceptance.
