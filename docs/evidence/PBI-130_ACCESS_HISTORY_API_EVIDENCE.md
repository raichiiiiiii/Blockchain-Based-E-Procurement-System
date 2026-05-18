# PBI-130 Access History API Evidence

## 1. Purpose

This document provides evidence for the implementation of PBI-130, which exposes the access-history query capability through a stable API endpoint for authorized auditors. It documents the completed API endpoint behavior, validation rules, and test evidence.

## 2. Scope

This evidence covers the implementation of the access-history API endpoint as specified in PBI-130:
- Route registration and endpoint availability
- Authorization behavior for auditors
- Supported query parameter filtering
- Input validation for query parameters
- Response shape and ordering
- Integration with the access-history read model

## 3. Out of Scope

This evidence does not cover:
- Pagination features (deferred to later implementation)
- PBI-122 event-detail inspection capabilities
- PBI-122 chronological sequence inspection capabilities
- UI implementation
- External reporting features

## 4. Endpoint Summary

The following endpoint has been implemented:

```
GET /api/v1/access-history
```

## 5. Authorization Behavior

The access-history endpoint requires the `auditor` role for access:
- Requests with the `auditor` role are authorized to query access history
- Requests without the `auditor` role receive a `403 FORBIDDEN` response
- Non-auditor users receive the response: 
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "User must have auditor role to query access history"
    }
  }
  ```

## 6. Query Parameter Support

The endpoint supports the following query parameters for filtering access history events:

- `actorUserId`: Filter by actor user ID
- `targetType`: Filter by target resource type
- `targetId`: Filter by target resource ID
- `action`: Filter by action name
- `outcome`: Filter by outcome category
- `occurredFrom`: Filter by earliest occurrence timestamp (inclusive)
- `occurredTo`: Filter by latest occurrence timestamp (inclusive)
- `module`: Filter by module
- `route`: Filter by HTTP route pattern
- `method`: Filter by HTTP method

Pagination parameters are not supported in this implementation:
- `limit`: Rejected as unsupported
- `cursor`: Rejected as unsupported

## 7. Validation Behavior

The endpoint implements comprehensive validation for query parameters:

- Unknown query parameters are rejected with `400 VALIDATION_ERROR`
- Unsupported pagination parameters (`limit`, `cursor`) are rejected with `400 VALIDATION_ERROR`
- Invalid `outcome` values are rejected with `400 VALIDATION_ERROR`
- Invalid `module` values are rejected with `400 VALIDATION_ERROR`
- Invalid `method` values are rejected with `400 VALIDATION_ERROR`
- Invalid timestamp formats for `occurredFrom` and `occurredTo` are rejected with `400 VALIDATION_ERROR`
- Invalid time ranges where `occurredFrom` > `occurredTo` are rejected with `400 VALIDATION_ERROR`

## 8. Response Shape

Successful responses follow the approved shape:

```json
{
  "data": {
    "items": []
  }
}
```

Where `items` is an array of access audit events matching the query filters. Events are ordered by `occurredAt` ascending, then `eventId` ascending.

Empty results return:
```json
{
  "data": {
    "items": []
  }
}
```

With HTTP status `200 OK`.

## 9. Read-Model Integration

The API endpoint consumes the existing `queryAccessHistory` service:

```ts
queryAccessHistory(accessAuditEventRepository, query)
```

The route does not reimplement filtering logic but delegates to the established read model, ensuring consistency with the underlying data access patterns.

## 10. Test Evidence Matrix

| Behavior | Test File | Evidence |
|---------|-----------|----------|
| Authorized auditor empty response | src/modules/shared/api/access-history.routes.test.ts | `should return approved response shape for authorized auditor with empty query` |
| Authorized auditor recorded events | src/modules/shared/api/access-history.routes.test.ts | `should return recorded events for authorized auditor` |
| Non-auditor denied | src/modules/shared/api/access-history.routes.test.ts | `should deny access for non-auditor user` |
| Actor filter | src/modules/shared/api/access-history.routes.test.ts | `should filter events by actorUserId` |
| Target filter | src/modules/shared/api/access-history.routes.test.ts | `should filter events by targetType and targetId` |
| Action/outcome filter | src/modules/shared/api/access-history.routes.test.ts | `should filter events by action and outcome` |
| Time range filter | src/modules/shared/api/access-history.routes.test.ts | `should filter events by time range` |
| Module/route/method filter | src/modules/shared/api/access-history.routes.test.ts | `should filter events by module, route, and method` |
| Combined filters | src/modules/shared/api/access-history.routes.test.ts | `should apply combined filters and preserve response shape` |
| Unknown parameter rejected | src/modules/shared/api/access-history.routes.test.ts | `should reject unknown query parameter with validation error` |
| Limit/cursor rejected | src/modules/shared/api/access-history.routes.test.ts | `should reject pagination parameters with validation error` |
| Invalid outcome rejected | src/modules/shared/api/access-history.routes.test.ts | `should reject invalid outcome with validation error` |
| Invalid module/method rejected | src/modules/shared/api/access-history.routes.test.ts | `should reject invalid module and method with validation error` |
| Invalid timestamp rejected | src/modules/shared/api/access-history.routes.test.ts | `should reject invalid timestamp with validation error` |
| Invalid time range rejected | src/modules/shared/api/access-history.routes.test.ts | `should reject invalid time range with validation error` |
| Valid filter regression after validation | src/modules/shared/api/access-history.routes.test.ts | `should still work with valid filter after validation added` |

## 11. Validation Commands

- `npm run build`: Passed
- `npm test`: Passed (all access-history route tests passing)
- `git diff --check`: Clean (no whitespace errors)

## 12. Risks and Follow-Up Notes

- Pagination remains deferred as specified in the original requirements
- PBI-122 event-detail and sequence inspection remain out of scope for this implementation
- API route uses actor-context role scaffolding for auditor authorization, which will need to be replaced with real authentication in production
- The implementation relies on the existing access audit event repository and read model, ensuring consistency with the overall audit architecture

## 13. Acceptance Criteria Mapping

This implementation satisfies the PBI-130 acceptance criteria:

- ✅ Authorized auditor supported search returns matching events in approved response shape
- ✅ Unsupported or invalid query input returns validation response

## 14. Closeout Verdict

PBI-130 is ready for review/acceptance. The access-history API endpoint has been implemented according to specifications, with proper authorization, validation, and integration with the existing read model. All tests are passing and the implementation follows the established patterns and contracts.
