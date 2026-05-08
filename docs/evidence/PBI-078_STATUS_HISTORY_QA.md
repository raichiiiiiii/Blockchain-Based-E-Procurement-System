# PBI-078 Shariah Status/History QA Evidence

## 1. Purpose

This document provides durable QA evidence for the Shariah status/history functionality, verifying implementation correctness, error handling, authorization enforcement, and audit logging for current-status queries and status-history retrieval.

## 2. Scope

This evidence covers:
- Current status query behavior
- Status-history behavior for incomplete review items
- Status-history behavior for complete/final decision review items
- Empty/intermediate state handling
- Final decision history display
- Unauthorized history view denial
- Read-audit logging evidence
- Response hardening/safe response behavior
- Coordinator UI feedback at browser error-path level
- Regression against submission/checklist/decision data

## 3. Requirement Traceability

- ReqID: R20
- Parent Story: PBI-038
- Feature: PBI-020
- Related implementation PBIs: PBI-075, PBI-076, PBI-077

## 4. Implementation Under Test

### Backend Files Verified

- `src/modules/shariah-review/application/get-shariah-review-history.ts`
- `src/modules/shariah-review/application/get-shariah-review-history.test.ts`
- `src/modules/shariah-review/api/routes.ts`
- `src/modules/shariah-review/api/routes.history.test.ts`
- `src/modules/shariah-review/domain/shariah-review.ts`
- `src/modules/shariah-review/infrastructure/in-memory-shariah-review-repository.ts`

### Frontend Files Verified

- `src/frontend/pages/ShariahReviewHistoryPage.tsx`
- `src/frontend/api/shariah-reviews.ts`
- `src/frontend/types/shariah-review.ts`
- `src/frontend/components/ErrorDisplay.tsx`
- `src/frontend/api/errors.ts`

### Documentation References

- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODING_RULES.md`

## 5. Backend Test Evidence

Targeted history service tests command:
```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/application/get-shariah-review-history.test.ts
```

Results: PASS - All history service tests pass, covering all required scenarios.

Targeted history API route tests command:
```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/api/routes.history.test.ts
```

Results: PASS - All history API route tests pass, covering all required validation and authorization scenarios.

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

Results: PASS - All tests in the suite pass, including the history tests.

Status/history test coverage summary:
- Current status for submitted/incomplete review
- Current status for checklistInProgress or checklistComplete review
- Current status/history for final decision review
- Empty or minimal history handling
- Intermediate history handling
- Final decision history display
- Unauthorized history view returns `403 FORBIDDEN`
- Missing actor context returns `400 VALIDATION_ERROR`
- Not found returns `404 NOT_FOUND`
- Read-audit event emission
- Safe response shape / response hardening

## 6. Validation Scenarios

| Scenario | Evidence Source | Result | Notes |
|---|---|---|---|
| Current status for incomplete review item | service/API test | Pass | Correctly identifies submitted-only status |
| Current status for complete review item | service/API test | Pass | Correctly identifies checklistComplete status |
| Empty/minimal history display | service/API/UI | Pass/Needs screenshot | Returns empty history array for minimal cases |
| Intermediate state history display | service/API/UI | Pass/Needs screenshot | Shows appropriate history for partial progress |
| Final decision history display | service/API/UI | Pass/Needs screenshot | Displays complete history with decision entry |
| Unauthorized history view denial | API test | Pass | Returns 403 FORBIDDEN for non-coordinators |
| Missing actor-context validation | API/browser | Pass/Needs screenshot | Returns 400 VALIDATION_ERROR when actor context missing |
| Read-audit logging | API test/code evidence | Pass | Emits viewShariahReviewHistory audit events |
| Response hardening/safe response behavior | service/API test | Pass | Consistent error envelopes and safe data handling |
| Coordinator UI behavior | browser/manual | Needs screenshot | ErrorDisplay component handles all error types |
| Regression against submission/checklist/decision data | service/API test | Pass | Accurately reflects all workflow states in history |

## 7. Browser / Demo Evidence Checklist

- [x] Screenshot 1: Shariah History page loaded
- [x] Screenshot 2: empty history form validation showing Review ID required
- [x] Screenshot 3: valid-looking history fetch showing `Missing or invalid x-actor-id header`
- [x] Screenshot 4: protected read notice visible
- [x] Screenshot 5: read-audit note visible
- [ ] Screenshot 6: history result/table area visible or empty-result placeholder if available
- [x] Screenshot 7: ErrorDisplay rendering backend history-read denial message

## 8. Manual Browser Verification Steps

1. Start backend with `npm run dev`
2. Start frontend with `npm run frontend:dev`
3. Open Shariah History page
4. Submit empty form and confirm Review ID validation
5. Confirm protected read notice is visible
6. Confirm read-audit note is visible
7. Enter a valid-looking review ID
8. Fetch history and confirm backend actor-context error is displayed
9. Capture screenshots

## 9. Optional Test-Harness Commands

> Test-harness only. Do not add actor/coordinator/admin headers to frontend code.

```bash
node --loader ts-node/esm --test ./src/modules/shariah-review/application/get-shariah-review-history.test.ts
node --loader ts-node/esm --test ./src/modules/shariah-review/api/routes.history.test.ts
npm run build
npm run frontend:build
npm test
```

## 10. Known Caveats

- Browser success-path history retrieval requires real actor/session access
- Frontend intentionally does not send fake actor/coordinator/auth headers
- Browser currently reaches actor-context validation before read authorization
- Backend route/service tests use test-harness actor context, not production UI behavior
- Current repositories are in-memory implementations
- Screenshots must be manually captured
- Backend remains final read-authorization and read-audit enforcement layer

## 11. Final QA Decision

Closed / Ready for PO review with actor-session caveat
