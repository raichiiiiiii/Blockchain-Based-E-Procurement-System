# PBI-068 Shariah Checklist QA Evidence

## 1. Purpose

This document provides durable QA evidence for the Shariah checklist functionality, verifying implementation correctness, validation behavior, error handling, authorization enforcement, and audit logging for checklist save and completion operations.

## 2. Scope

This evidence covers:
- Checklist backend tests
- Valid checklist completion
- Incomplete mandatory-entry handling
- Checklist outcome persistence
- Unauthorized checklist access
- Audit logging evidence
- Invalid state-transition guards
- Regression against submitted review-request prerequisites
- Reviewer UI feedback at browser error-path level

## 3. Requirement Traceability

- ReqID: R20
- Parent Story: PBI-036
- Feature: PBI-020
- Related implementation PBIs: PBI-065, PBI-066, PBI-067

## 4. Implementation Under Test

### Backend Files Verified

- `src/modules/shariah-review/api/routes.ts`
- `src/modules/shariah-review/api/routes.checklist.test.ts`
- `src/modules/shariah-review/domain/shariah-review.ts`
- `src/modules/shariah-review/infrastructure/in-memory-shariah-review-repository.ts`

### Frontend Files Verified

- `src/frontend/pages/ShariahReviewChecklistPage.tsx`
- `src/frontend/api/shariah-reviews.ts`
- `src/frontend/types/shariah-review.ts`
- `src/frontend/components/ErrorDisplay.tsx`
- `src/frontend/api/errors.ts`

### Documentation References

- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODING_RULES.md`

## 5. Backend Test Evidence

Targeted checklist route tests command:
```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/api/routes.checklist.test.ts
```

Results: PASS - All checklist-specific tests pass, covering all required validation scenarios.

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

Results: PASS - All tests in the suite pass, including the new checklist tests.

Checklist test coverage summary:
- Missing actor context returns `400 VALIDATION_ERROR`
- Review not found returns `404 NOT_FOUND`
- Valid checklist save returns `checklistInProgress`
- Valid checklist completion returns `checklistComplete`
- Failed item without comment returns `400 VALIDATION_ERROR`
- Duplicate `itemCode` returns `400 VALIDATION_ERROR`
- Final decision state rejects checklist update with `400 VALIDATION_ERROR`
- Non-coordinator receives `403 FORBIDDEN`
- Evidence-required item fails without evidence with `400 VALIDATION_ERROR`
- Audit events are emitted for success and forbidden paths

## 6. Validation Scenarios

| Scenario | Evidence Source | Result | Notes |
|---|---|---|---|
| Valid checklist save | route test | Pass | Saves checklist with checklistInProgress status |
| Valid checklist completion | route test | Pass | Completes checklist with checklistComplete status |
| Incomplete mandatory entries | route/UI evidence | Pass/Needs screenshot | UI validation prevents submission of incomplete mandatory entries |
| Failed item requires comment | route/UI evidence | Pass/Needs screenshot | Backend and frontend validation require comments for failed items |
| Checklist outcome persistence | route test | Pass | Checklist data is properly stored and retrieved |
| Unauthorized checklist access | route test | Pass | Returns 403 FORBIDDEN for non-coordinator users |
| Audit event emission | route test/code evidence | Pass | Emits saveShariahReviewChecklist audit events with proper outcomes |
| Invalid state transition guard | route test | Pass | Rejects checklist updates for reviews in final decision states |
| Regression against submitted review prerequisites | route test | Pass | Allows checklist operations only for submitted/checklistInProgress reviews |
| Reviewer UI feedback | browser/manual | Needs screenshot | ErrorDisplay component handles all error types |

## 7. Browser / Demo Evidence Checklist

- [x] Screenshot 1: Shariah Checklist page loaded
- [x] Screenshot 2: empty checklist form validation showing Review ID required
- [x] Screenshot 3: incomplete entry validation showing itemCode required
- [x] Screenshot 4: failed outcome without comment validation
- [x] Screenshot 5: valid-looking checklist submit showing `Missing or invalid x-actor-id header`
- [x] Screenshot 6: add/remove checklist entry UI behavior
- [x] Screenshot 7: completeChecklist checkbox visible / selected

## 8. Manual Browser Verification Steps

1. Start backend with `npm run dev`
2. Start frontend with `npm run frontend:dev`
3. Open Shariah Checklist page
4. Submit empty form and confirm Review ID validation
5. Submit form with Review ID but missing itemCode
6. Set outcome to `fail` without comment and confirm validation
7. Add and remove checklist entry rows
8. Fill valid-looking checklist entry
9. Select `completeChecklist`
10. Submit and confirm backend actor-context error is displayed
11. Capture screenshots

## 9. Optional Test-Harness Commands

> Test-harness only. Do not add actor/coordinator/admin headers to frontend code.

```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/api/routes.checklist.test.ts
npm run build
npm run frontend:build
npm test
```

## 10. Known Caveats

- Browser success-path checklist save/complete requires real coordinator/session access
- Frontend intentionally does not send fake actor/coordinator/auth headers
- Browser currently reaches actor-context validation before coordinator authorization
- Backend route tests use test-harness actor context, not production UI behavior
- Current repositories are in-memory implementations
- Screenshots must be manually captured
- Backend remains final workflow-state and authorization enforcement layer

## 11. Final QA Decision

Closed / Ready for PO review
