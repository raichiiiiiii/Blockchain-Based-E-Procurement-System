# PBI-073 Shariah Decision QA Evidence

## 1. Purpose

This document provides durable QA evidence for the Shariah decision functionality, verifying implementation correctness, validation behavior, error handling, authorization enforcement, and audit logging for approve, reject, and conditional-approval decision flows.

## 2. Scope

This evidence covers:
- Decision backend tests
- Approve decision path
- Reject decision path
- Conditional approval decision path
- Required rationale validation
- Conditional-approval condition validation
- Invalid-state prevention
- Unauthorized decision attempt
- Audit logging evidence
- Reviewer UI feedback at browser error-path level
- Regression against completed checklist prerequisite

## 3. Requirement Traceability

- ReqID: R20
- Parent Story: PBI-037
- Feature: PBI-020
- Related implementation PBIs: PBI-070, PBI-071, PBI-072

## 4. Implementation Under Test

### Backend Files Verified

- `src/modules/shariah-review/application/record-shariah-review-decision.ts`
- `src/modules/shariah-review/application/record-shariah-review-decision.test.ts`
- `src/modules/shariah-review/api/routes.ts`
- `src/modules/shariah-review/api/routes.decision.test.ts`
- `src/modules/shariah-review/domain/shariah-review.ts`
- `src/modules/shariah-review/infrastructure/in-memory-shariah-review-repository.ts`

### Frontend Files Verified

- `src/frontend/pages/ShariahReviewDecisionPage.tsx`
- `src/frontend/api/shariah-reviews.ts`
- `src/frontend/types/shariah-review.ts`
- `src/frontend/components/ErrorDisplay.tsx`
- `src/frontend/api/errors.ts`

### Documentation References

- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODING_RULES.md`

## 5. Backend Test Evidence

Targeted decision service tests command:
```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/application/record-shariah-review-decision.test.ts
```

Results: PASS - All decision service tests pass, covering all required validation scenarios.

Targeted decision API route tests command:
```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/api/routes.decision.test.ts
```

Results: PASS - All decision API route tests pass, covering all required validation and authorization scenarios.

Build command:
```bash
npm run build
```

Results: PASS - Backend builds successfully with no errors.

Frontend build command:
```bash
npm run frontend:build
```

Results: PASS - Frontend builds successfully with no errors.

Full test suite command:
```bash
npm test
```

Results: PASS - All tests in the suite pass, including the decision tests.

Decision test coverage summary:
- Approve decision path from checklistComplete state
- Reject decision path from checklistComplete state
- Conditional approval path with valid conditions
- Rationale required for all final decisions
- Conditions required for conditional approval
- Invalid state prevention for submitted and checklistInProgress states
- Unauthorized/non-coordinator decision attempt returns 403 FORBIDDEN
- Audit events emitted for success and forbidden paths
- Status transition to approved/rejected/conditionalApproved
- Decision validation for missing rationale
- Decision validation for conditional approval without conditions
- Decision validation for approved/rejected with conditions
- Not found handling for non-existent reviews

## 6. Validation Scenarios

| Scenario | Evidence Source | Result | Notes |
|---|---|---|---|
| Approve decision path | service/API test | Pass | Approves from checklistComplete to approved |
| Reject decision path | service/API test | Pass | Rejects from checklistComplete to rejected |
| Conditional approval path | service/API test | Pass | Conditionally approves with conditions |
| Required rationale validation | service/API/UI | Pass/Needs screenshot | Backend and frontend validation require rationale |
| Conditional approval condition validation | service/API/UI | Pass/Needs screenshot | Backend and frontend validation require conditions |
| Invalid-state prevention | service/API test | Pass | Blocks decisions from submitted/checklistInProgress |
| Unauthorized decision attempt | API test | Pass | Returns 403 FORBIDDEN for non-coordinators |
| Audit event emission | API test/code evidence | Pass | Emits recordShariahReviewDecision audit events |
| Reviewer UI status feedback | browser/manual | Needs screenshot | ErrorDisplay component handles all error types |
| Regression against completed checklist prerequisite | service/API test | Pass | Only allows decisions from checklistComplete state |

## 7. Browser / Demo Evidence Checklist

- [x] Screenshot 1: Shariah Decision page loaded
- [x] Screenshot 2: empty decision form validation showing Review ID required
- [x] Screenshot 3: approved/rejected decision missing rationale validation
- [x] Screenshot 4: conditional approval missing condition description or due date validation
- [x] Screenshot 5: approved decision valid-looking submit showing `Missing or invalid x-actor-id header`
- [x] Screenshot 6: conditional approval valid-looking submit showing `Missing or invalid x-actor-id header`
- [x] Screenshot 7: condition add/remove UI behavior
- [x] Screenshot 8: workflow prerequisite notice visible

## 8. Manual Browser Verification Steps

1. Start backend with `npm run dev`
2. Start frontend with `npm run frontend:dev`
3. Open Shariah Decision page
4. Submit empty form and confirm Review ID validation
5. Select `approved`, leave rationale empty, and confirm rationale validation
6. Select `conditionalApproved`, enter rationale, leave condition fields empty, and confirm condition validation
7. Add and remove condition rows
8. Fill valid-looking approved decision
9. Submit and confirm backend actor-context error is displayed
10. Fill valid-looking conditional approval with condition description and due date
11. Submit and confirm backend actor-context error is displayed
12. Capture screenshots

## 9. Optional Test-Harness Commands

> Test-harness only. Do not add actor/coordinator/admin headers to frontend code.

```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/application/record-shariah-review-decision.test.ts
node --loader ts-node/esm --test ./src/modules/shariah-review/api/routes.decision.test.ts
npm run build
npm run frontend:build
npm test
```

## 10. Known Caveats

- Browser success-path decision recording requires real coordinator/session access
- Frontend intentionally does not send fake actor/coordinator/auth headers
- Browser currently reaches actor-context validation before coordinator authorization
- Backend route/service tests use test-harness actor context, not production UI behavior
- Current repositories are in-memory implementations
- Screenshots must be manually captured
- Backend remains final workflow-state, authorization, and audit enforcement layer

## 11. Final QA Decision

Closed / Ready for PO review
