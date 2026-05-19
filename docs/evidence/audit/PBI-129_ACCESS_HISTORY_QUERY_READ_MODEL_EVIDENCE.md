# PBI-129 Access History Query Read-Model Evidence

## 1. Purpose

This document provides evidence that PBI-129 implements the repository/read-model path for auditor access-history search under PBI-121.

## 2. Scope

PBI-129 implements application-level query behavior over recorded `AccessAuditEvent` records.

## 3. Out of Scope

- transport-layer API exposure
- route/request validation
- auditor authorization boundary
- UI work
- external reporting
- PBI-122 event-detail inspection
- PBI-122 chronological sequence inspection
- new audit event recording behavior
- pagination

## 4. Implementation Summary

The implementation consists of:

- `src/modules/shared/application/access-history-query.ts`
- `queryAccessHistory(repository, query)` function
- `AccessHistoryQuery` type definition
- Uses existing `AccessAuditEventRepository.list()` method
- Does not modify `AccessAuditEventRepository` interface
- Does not modify existing audit recording behavior
- Returns `AccessAuditEvent[]` directly

## 5. PBI-128 Contract Mapping

The implementation follows the contract defined in `docs/ACCESS_HISTORY_QUERY_CONTRACT.md`:

- actor filter
- target filter
- action filter
- outcome filter
- time range filter
- optional module/route/method filters
- AND semantics for combining filters
- Result ordering: occurredAt ascending, then eventId ascending
- Empty successful result returned as []

## 6. Supported Filter Coverage

| Filter | Implemented? | Semantics | Test Coverage |
|--------|--------------|-----------|---------------|
| actorUserId | ✅ | Exact match on actor user ID | ✅ |
| targetType | ✅ | Exact match on target resource type | ✅ |
| targetId | ✅ | Exact match on target resource ID | ✅ |
| action | ✅ | Exact match on action name | ✅ |
| outcome | ✅ | Exact match on outcome category | ✅ |
| occurredFrom | ✅ | Events at or after timestamp (inclusive) | ✅ |
| occurredTo | ✅ | Events at or before timestamp (inclusive) | ✅ |
| module | ✅ | Exact match on module | ✅ |
| route | ✅ | Exact match on HTTP route pattern | ✅ |
| method | ✅ | Exact match on HTTP method | ✅ |
| combined filters | ✅ | AND semantics across multiple filters | ✅ |
| empty filters | ✅ | Returns all events when no filters specified | ✅ |

## 7. Ordering and Empty Result Behavior

- Ordering: occurredAt ascending, then eventId ascending.
- Empty result: [] without error.
- Empty repository: [] without error.

## 8. Payload Projection Preservation

Results preserve full `AccessAuditEvent` payload and do not reduce fields. Tested fields include:

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
- route
- method
- module
- evidence.payloadHash
- evidence.canonicalization

## 9. Representative Event Coverage

Tests cover representative samples for:

- governed-write event
- denied protected-action event
- selected sensitive-read event

## 10. Test Evidence Matrix

| Behavior | Test File | Test Name / Coverage |
|----------|-----------|----------------------|
| empty query returns all events | src/modules/shared/application/access-history-query.test.ts | returns all events when query is empty |
| actor filter | src/modules/shared/application/access-history-query.test.ts | filters by actorUserId |
| targetType filter | src/modules/shared/application/access-history-query.test.ts | filters by targetType |
| targetId filter | src/modules/shared/application/access-history-query.test.ts | filters by targetId |
| action filter | src/modules/shared/application/access-history-query.test.ts | filters by action |
| outcome filter | src/modules/shared/application/access-history-query.test.ts | filters by outcome |
| module filter | src/modules/shared/application/access-history-query.test.ts | filters by module |
| route filter | src/modules/shared/application/access-history-query.test.ts | filters by route |
| method filter | src/modules/shared/application/access-history-query.test.ts | filters by method |
| occurredFrom inclusive | src/modules/shared/application/access-history-query.test.ts | filters by occurredFrom inclusively |
| occurredTo inclusive | src/modules/shared/application/access-history-query.test.ts | filters by occurredTo inclusively |
| combined filters with AND semantics | src/modules/shared/application/access-history-query.test.ts | applies combined filters with AND semantics |
| no-match returns [] | src/modules/shared/application/access-history-query.test.ts | returns [] when no events match |
| occurredAt ascending sort | src/modules/shared/application/access-history-query.test.ts | sorts by occurredAt ascending |
| eventId tie-breaker | src/modules/shared/application/access-history-query.test.ts | uses eventId ascending as tie-breaker when occurredAt is equal |
| payload preservation | src/modules/shared/application/access-history-query.test.ts | preserves full AccessAuditEvent payload fields |
| representative governed-write sample | src/modules/shared/application/access-history-query.test.ts | handles representative governed-write sample |
| representative denied-action sample | src/modules/shared/application/access-history-query.test.ts | handles representative denied-action sample |
| representative sensitive-read sample | src/modules/shared/application/access-history-query.test.ts | handles representative sensitive-read sample |
| special characters | src/modules/shared/application/access-history-query.test.ts | handles edge case with special characters in string fields |
| empty repository | src/modules/shared/application/access-history-query.test.ts | handles empty repository returns [] |

## 11. Validation Commands

```bash
npm run build
```
Build successful

```bash
npm test
```
359 tests, 359 pass, 0 fail

```bash
git diff --check
```
No output (no whitespace errors)

```bash
git diff --stat
```
No output (no staged changes)

## 12. Risks and Follow-Up Notes

- PBI-129 uses in-memory filtering over repository.list(); this is acceptable for current MVP/test seam but can be optimized behind the same function later.
- Pagination is documented in PBI-128 but not implemented in PBI-129.
- API exposure and auditor authorization are deferred to PBI-130.
- PBI-122 detail/sequence inspection remains out of scope.

## 13. Acceptance Criteria Mapping

- Given recorded access events exist, query with supported filters returns matching events in approved stable order.
- Given no matching events exist, query returns an empty result without error.

## 14. Closeout Verdict

PBI-129 is ready for review/acceptance.
