# PBI-135 Access Audit Event Sequence Evidence

## 1. Purpose

This document provides evidence that PBI-135 successfully implements related access-audit event sequence retrieval by actor or target. It documents the implementation, behavior, and validation of the sequence retrieval functionality.

## 2. Scope

This evidence covers:

- Application-level sequence retrieval
- Actor-based sequence retrieval
- Target-based sequence retrieval
- Optional time range filtering (occurredFrom/occurredTo)
- Stable chronological ordering
- Auditor-only API sequence route
- Empty/single sequence behavior
- Payload preservation

## 3. Out of Scope

This evidence explicitly excludes:

- Single-event detail retrieval (already handled by PBI-134)
- Cryptographic chain verification
- Sequence completeness proof
- UI implementation
- External export/reporting
- New audit recording behavior
- PBI-136 missing/incomplete hardening beyond current completeness metadata

## 4. Implementation Summary

The implementation consists of:

- `src/modules/shared/application/access-audit-event-sequence.ts`
- `getAccessAuditEventSequence(repository, scope)` function
- Uses existing `queryAccessHistory(repository, query)` function
- Returns `AccessAuditEventSequenceResult` with scope, ordering, completeness, and items
- Does not modify the repository interface
- Does not implement cryptographic chain verification

## 5. Sequence Read Path

The sequence read path operates as follows:

- Actor scope maps to `actorUserId` filter
- Target scope maps to `targetType` + `targetId` filters
- `occurredFrom` / `occurredTo` are applied inclusively
- `queryAccessHistory` applies filtering and stable ordering
- Result is wrapped with scope, ordering, completeness, and items metadata

## 6. API Endpoint Behavior

The API endpoint behavior is:

- `GET /api/v1/access-history/sequences`
- Auditor role required for access
- `scope=actor` requires `actorUserId`
- `scope=target` requires `targetType` and `targetId`
- Returns `200 OK` with `{ data: { scope, ordering, completeness, items } }`
- Returns `400 VALIDATION_ERROR` for invalid sequence query
- Returns `403 FORBIDDEN` for non-auditor access

## 7. Sequence Scope Support

| Scope  | Required Parameters           | Optional Parameters     | Behavior                                  |
|--------|-------------------------------|-------------------------|-------------------------------------------|
| actor  | scope=actor, actorUserId      | occurredFrom, occurredTo| Retrieves events for a specific actor     |
| target | scope=target, targetType, targetId | occurredFrom, occurredTo| Retrieves events for a specific target |

## 8. Ordering and Completeness Behavior

Ordering:
- Primary: `occurredAt` ascending
- Secondary: `eventId` ascending

Completeness:
- Status: `unknown`
- Reason: `completeness_not_proven`
- Message: "Available events are returned, but the repository cannot prove the sequence is complete."

Behavior:
- The implementation returns available evidence without claiming sequence completeness
- Empty sequence returns `200 OK` with `items = []`
- Single-event sequence returns `200 OK` with one item

## 9. Validation Behavior

The implementation validates the following cases:

- Missing scope parameter
- Invalid scope value
- Actor scope missing `actorUserId`
- Target scope missing `targetType` or `targetId`
- Ambiguous actor + target parameters in same request
- Invalid timestamp format for `occurredFrom` or `occurredTo`
- Invalid time range where `occurredFrom` > `occurredTo`
- Unknown query parameters
- Unsupported search/detail parameters on sequence endpoint (action, outcome, module, route, method, limit, cursor)

## 10. Authorization Behavior

Authorization behavior:

- Sequence route reuses auditor role boundary from access-history routes
- Non-auditor access receives `403 FORBIDDEN`

## 11. Regression Coverage

Regression coverage includes:

- Existing `GET /api/v1/access-history` list/search route remains functional
- Existing `GET /api/v1/access-history/events/:eventId` detail route remains functional
- PBI-121 and PBI-134 behaviors are unchanged

## 12. Test Evidence Matrix

| Behavior                                    | Test File                                              | Test Name / Evidence                                                                 |
|--------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------------------------------|
| Actor-based sequence retrieval             | src/modules/shared/application/access-audit-event-sequence.test.ts | retrieves actor-based sequence with correct events                                   |
| Target-based sequence retrieval            | src/modules/shared/application/access-audit-event-sequence.test.ts | retrieves target-based sequence with correct events                                  |
| Time range filtering                       | src/modules/shared/application/access-audit-event-sequence.test.ts | filters events by time range inclusively                                             |
| Stable ordering                            | src/modules/shared/application/access-audit-event-sequence.test.ts | orders events by occurredAt ascending then eventId ascending                         |
| Empty sequence                             | src/modules/shared/application/access-audit-event-sequence.test.ts | returns empty array when no events match                                             |
| Single-event sequence                      | src/modules/shared/application/access-audit-event-sequence.test.ts | returns single event when only one matches                                           |
| Payload preservation                       | src/modules/shared/application/access-audit-event-sequence.test.ts | preserves all AccessAuditEvent payload fields                                        |
| queryAccessHistory regression              | src/modules/shared/application/access-audit-event-sequence.test.ts | does not break existing query behavior                                               |
| Authorized auditor retrieves actor sequence| src/modules/shared/api/access-history.routes.test.ts   | should return actor sequence for authorized auditor                                  |
| Authorized auditor retrieves target sequence| src/modules/shared/api/access-history.routes.test.ts  | should return target sequence for authorized auditor                                 |
| API time range filtering                   | src/modules/shared/api/access-history.routes.test.ts   | should filter sequence by time range                                                 |
| API ordering                               | src/modules/shared/api/access-history.routes.test.ts   | should return sequence in stable order                                               |
| API empty sequence                         | src/modules/shared/api/access-history.routes.test.ts   | should return empty sequence for authorized auditor with no matching events          |
| Non-auditor denied                         | src/modules/shared/api/access-history.routes.test.ts   | should deny access for non-auditor user requesting sequence                          |
| Invalid sequence request validation        | src/modules/shared/api/access-history.routes.test.ts   | should reject invalid sequence requests with validation error                        |
| Existing access-history route regression   | src/modules/shared/api/access-history.routes.test.ts   | should not break existing access-history routes after adding sequence endpoint       |
| Existing event-detail route regression     | src/modules/shared/api/access-history.routes.test.ts   | should not break existing access-history routes after adding sequence endpoint       |

## 13. Validation Commands

Validation commands executed:

```bash
npm run build: passed
npm test: passed
git diff --check: clean
```

## 14. Risks and Follow-Up Notes

Identified risks and follow-up considerations:

- Completeness remains unknown because the repository cannot prove full historical completeness
- PBI-136 owns incomplete-sequence hardening
- Cryptographic chain verification remains out of scope
- Current auditor authorization uses actor-context role scaffolding
- The sequence function reuses queryAccessHistory, so future indexing can optimize behind the repository/query seam

## 15. Acceptance Criteria Mapping

Acceptance criteria mapping:

- Given related events exist for the same actor or target, sequence retrieval returns them in chronological order sufficient to reconstruct the access trail
- Given no related events exist beyond the selected baseline, sequence retrieval returns available evidence without error

## 16. Closeout Verdict

PBI-135 is ready for review/acceptance. The implementation successfully provides related access-audit event sequence retrieval by actor or target with all required functionality and validation.
