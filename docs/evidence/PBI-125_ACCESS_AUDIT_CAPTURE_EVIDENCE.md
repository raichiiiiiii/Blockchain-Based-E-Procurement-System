# PBI-125 Access Audit Capture Evidence

## 1. Purpose

This document provides evidence that PBI-125 (Integrate governed-write and denied-protected-action audit capture for PBI-120) has been successfully implemented. It demonstrates that all required governed write operations and denied protected actions are now captured using the shared access audit event contract.

## 2. Scope

The implementation covers these route groups:

- Membership registration
- Access-control role create/update
- Access-control role assignment create/change/remove
- Shariah review submission
- Shariah checklist update
- Shariah decision recording

## 3. Out of Scope

The following items are explicitly out of scope for PBI-125:

- GET /api/v1/shariah-reviews/:reviewId/history selected sensitive-read capture (reserved for PBI-126)
- External SIEM integration
- UI work

## 4. Implementation Summary

The implementation consists of:

- Shared AccessAuditEvent contract defined in src/modules/shared/application/access-audit-event.ts
- recordAccessAuditEvent helper function in src/modules/shared/application/record-access-audit-event.ts
- In-memory repository test seam for audit event storage
- Repository wiring through app/server and route options
- Shared event recording added beside existing module-specific audit callbacks

## 5. Shared Access-Audit Contract

The approved shared access audit outcomes are:

- success
- forbidden
- validationError
- notFound
- conflict
- error

Note: invalidState is not a shared access-audit outcome. Invalid-state route outcomes are mapped to validationError with reason "invalid_review_status". Any remaining invalidState references are module-specific audit behavior, not shared access-audit events.

## 6. Route and Outcome Coverage Matrix

| Route | Method | Action | Outcomes Captured | Notes |
|-------|--------|--------|-------------------|-------|
| POST /api/v1/member-organizations | POST | createMemberOrganization | success, conflict, validationError | Membership registration |
| POST /api/v1/roles | POST | createRole | success, conflict, forbidden | Role creation |
| PATCH /api/v1/roles/:roleId | PATCH | updateRole | success, notFound, forbidden | Role update |
| POST /api/v1/role-assignments | POST | createRoleAssignment | success, conflict, validationError, forbidden | Role assignment creation |
| PATCH /api/v1/role-assignments/change | PATCH | changeRoleAssignment | success, notFound, conflict, validationError, forbidden | Role assignment change |
| DELETE /api/v1/role-assignments | DELETE | removeRoleAssignment | success, notFound, forbidden | Role assignment removal |
| POST /api/v1/shariah-reviews | POST | submitShariahReview | success, forbidden, validationError | Shariah review submission |
| PUT /api/v1/shariah-reviews/:reviewId/checklist | PUT | updateShariahChecklist | success, forbidden, validationError, notFound | Checklist update |
| POST /api/v1/shariah-reviews/:reviewId/decision | POST | recordShariahDecision | success, forbidden, validationError, notFound | Decision recording |

## 7. Test Evidence Matrix

| Area | Route | Outcome | Test File | Evidence Notes |
|------|-------|---------|-----------|----------------|
| Membership | POST /api/v1/member-organizations | success | src/modules/membership/api/routes.test.ts | Test "should return 201 for valid input without x-actor-id header" |
| Membership | POST /api/v1/member-organizations | success | src/modules/membership/api/routes.test.ts | Test "should return 201 for valid input with x-actor-id header" |
| Membership | POST /api/v1/member-organizations | conflict | src/modules/membership/api/routes.test.ts | Test "should return 409 for duplicate registrationNumber" |
| Membership | POST /api/v1/member-organizations | validationError | src/modules/membership/api/routes.test.ts | Test "should return 400 for missing required fields" |
| Membership | POST /api/v1/member-organizations | success | src/modules/membership/api/routes.test.ts | Test "should persist shared access audit event for successful registration" |
| Membership | POST /api/v1/member-organizations | conflict | src/modules/membership/api/routes.test.ts | Test "should persist shared access audit event for duplicate registration" |
| Membership | POST /api/v1/member-organizations | validationError | src/modules/membership/api/routes.test.ts | Test "should persist shared access audit event for validation error" |
| Access Control | POST /api/v1/roles | forbidden | src/modules/access-control/api/routes.forbidden-audit.test.ts | Test "should persist shared access audit event for forbidden role creation" |
| Access Control | PATCH /api/v1/roles/:roleId | forbidden | src/modules/access-control/api/routes.forbidden-audit.test.ts | Test "should persist shared access audit event for forbidden role update" |
| Access Control | POST /api/v1/role-assignments | forbidden | src/modules/access-control/api/routes.role-assignment-create.test.ts | Test "should persist shared access audit event for forbidden role assignment creation" |
| Access Control | POST /api/v1/role-assignments | success | src/modules/access-control/api/routes.role-assignment-create.test.ts | Test "should persist shared access audit event for successful role assignment creation" |
| Access Control | POST /api/v1/role-assignments | conflict | src/modules/access-control/api/routes.role-assignment-create.test.ts | Test "should persist shared access audit event for duplicate role assignment creation" |
| Access Control | POST /api/v1/role-assignments | validationError | src/modules/access-control/api/routes.role-assignment-create.test.ts | Test "should persist shared access audit event for role not found validation error" |
| Access Control | PATCH /api/v1/role-assignments/change | forbidden | src/modules/access-control/api/routes.role-assignments.change.patch.test.ts | Test "should persist shared access audit event for forbidden role assignment change" |
| Access Control | PATCH /api/v1/role-assignments/change | success | src/modules/access-control/api/routes.role-assignments.change.patch.test.ts | Test "should persist shared access audit event for successful role assignment change" |
| Access Control | PATCH /api/v1/role-assignments/change | notFound | src/modules/access-control/api/routes.role-assignments.change.patch.test.ts | Test "should persist shared access audit event for not found role assignment change" |
| Access Control | PATCH /api/v1/role-assignments/change | conflict | src/modules/access-control/api/routes.role-assignments.change.patch.test.ts | Test "should persist shared access audit event for conflicting role assignment change" |
| Access Control | PATCH /api/v1/role-assignments/change | validationError | src/modules/access-control/api/routes.role-assignments.change.patch.test.ts | Test "should persist shared access audit event for role not found validation error" |
| Access Control | PATCH /api/v1/role-assignments/change | validationError | src/modules/access-control/api/routes.role-assignments.change.patch.test.ts | Test "should persist shared access audit event for same role IDs validation error" |
| Access Control | DELETE /api/v1/role-assignments | forbidden | src/modules/access-control/api/routes.role-assignments.delete.test.ts | Test "should persist shared access audit event for forbidden role assignment removal" |
| Access Control | DELETE /api/v1/role-assignments | success | src/modules/access-control/api/routes.role-assignments.delete.test.ts | Test "should persist shared access audit event for successful role assignment removal" |
| Access Control | DELETE /api/v1/role-assignments | notFound | src/modules/access-control/api/routes.role-assignments.delete.test.ts | Test "should persist shared access audit event for not found role assignment removal" |
| Access Control | POST /api/v1/role-assignments | forbidden | src/modules/access-control/api/routes.role-assignment-create.test.ts | Test "should deny role assignment creation when actor user is inactive" |
| Access Control | POST /api/v1/role-assignments | forbidden | src/modules/access-control/api/routes.role-assignment-create.test.ts | Test "should deny role assignment creation when target organization is inactive" |
| Shariah Review | POST /api/v1/shariah-reviews | success | src/modules/shariah-review/api/routes.submit.audit.test.ts | Test "should persist shared access audit event for successful shariah review submission" |
| Shariah Review | POST /api/v1/shariah-reviews | forbidden | src/modules/shariah-review/api/routes.submit.audit.test.ts | Test "should persist shared access audit event for coordinator-denied shariah review submission" |
| Shariah Review | POST /api/v1/shariah-reviews | validationError | src/modules/shariah-review/api/routes.submit.validation.test.ts | Test "should return 400 when x-actor-id header is missing" |
| Shariah Review | PUT /api/v1/shariah-reviews/:reviewId/checklist | forbidden | src/modules/shariah-review/api/routes.checklist.authorization.test.ts | Test "should persist shared access audit event for forbidden checklist save due to reviewer denial" |
| Shariah Review | PUT /api/v1/shariah-reviews/:reviewId/checklist | success | src/modules/shariah-review/api/routes.checklist.save.test.ts | Test "should persist shared access audit event for successful checklist save" |
| Shariah Review | PUT /api/v1/shariah-reviews/:reviewId/checklist | notFound | src/modules/shariah-review/api/routes.checklist.not-found.test.ts | Test "should persist shared access audit event for not found review" |
| Shariah Review | PUT /api/v1/shariah-reviews/:reviewId/checklist | validationError | src/modules/shariah-review/api/routes.checklist.validation.test.ts | Test "should persist shared access audit event for validationError outcome" |
| Shariah Review | PUT /api/v1/shariah-reviews/:reviewId/checklist | validationError | src/modules/shariah-review/api/routes.checklist.state.test.ts | Test "should persist shared access audit event for invalid review state" |
| Shariah Review | POST /api/v1/shariah-reviews/:reviewId/decision | success | src/modules/shariah-review/api/routes.decision.test.ts | Test "should persist shared access audit event for successful decision recording" |
| Shariah Review | POST /api/v1/shariah-reviews/:reviewId/decision | forbidden | src/modules/shariah-review/api/routes.decision.test.ts | Test "should persist shared access audit event for forbidden decision attempt" |
| Shariah Review | POST /api/v1/shariah-reviews/:reviewId/decision | notFound | src/modules/shariah-review/api/routes.decision.test.ts | Test "should persist shared access audit event for notFound decision attempt" |
| Shariah Review | POST /api/v1/shariah-reviews/:reviewId/decision | validationError | src/modules/shariah-review/api/routes.decision.test.ts | Test "should persist shared access audit event for invalid decision input shared audit" |
| Shariah Review | POST /api/v1/shariah-reviews/:reviewId/decision | validationError | src/modules/shariah-review/api/routes.decision.test.ts | Test "should persist shared access audit event for missing actor context shared audit" |
| Shariah Review | POST /api/v1/shariah-reviews/:reviewId/decision | validationError | src/modules/shariah-review/api/routes.decision.test.ts | Test "should persist shared access audit event for invalid decision state shared audit" |

## 8. PBI-126 Boundary Confirmation

No shared access-audit capture was added for GET /api/v1/shariah-reviews/:reviewId/history under PBI-125. History/read capture remains reserved for PBI-126.

## 9. Validation Commands

The implementation has been validated with the following commands:

```bash
npm run build
npm test
git diff --check
```

Results:
- npm run build: Successful compilation
- npm test: 334 tests, 334 pass, 0 fail
- git diff --check: No issues found

## 10. Risks and Follow-Up Notes

- Large route.ts files are now costly for Aider iteration
- Route modularization should be considered as a separate enabler/refactor
- recordAccessAuditEvent calls are duplicated and could later be abstracted
- LF/CRLF warnings may appear on Windows but git diff --check is clean

## 11. Acceptance Criteria Mapping

The implementation satisfies the acceptance criteria:

- Governed write success records actor identity, target, timestamp, outcome, request correlation, and evidence fields.
- Denied protected action records denied outcome according to approved audit policy.

Tests assert the presence and correctness of:
- actorUserId
- targetType
- targetId
- outcome
- requestId
- occurredAt
- evidence.payloadHash
- evidence.canonicalization
- route
- method

## 12. Closeout Verdict

PBI-125 is ready for review/acceptance.
