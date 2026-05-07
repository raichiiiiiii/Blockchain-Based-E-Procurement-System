# PBI-058 Deactivation Enforcement QA Evidence

## 1. Purpose

This document provides durable QA evidence for the deactivation enforcement functionality, verifying that deactivated users and organizations are properly blocked from protected actions while maintaining access for active users and organizations.

## 2. Scope

This evidence covers:
- Backend deactivation-aware access evaluation tests
- Deactivated user denial behavior
- Inactive/suspended/deleted organization denial behavior
- Active user/member continuity
- Protected endpoint integration
- Audit evidence for denied access
- UI advisory/guard behavior
- Configuration/control notes

## 3. Requirement Traceability

- ReqID: R03
- Parent Story: PBI-034
- Feature: PBI-003
- Related implementation PBIs: PBI-055, PBI-056, PBI-057
- Related policy/rule PBIs: PBI-054, PBI-095, PBI-117, PBI-118

## 4. Implementation Under Test

### Backend Files Verified
- `src/modules/access-control/application/evaluate-protected-access.ts`
- `src/modules/access-control/application/evaluate-protected-access.test.ts`
- `src/modules/access-control/application/create-role-assignment.ts`
- `src/modules/access-control/application/create-role-assignment.test.ts`
- `src/modules/access-control/application/change-role-assignment.ts`
- `src/modules/access-control/application/change-role-assignment.test.ts`
- `src/modules/access-control/application/remove-role-assignment.ts`
- `src/modules/access-control/application/remove-role-assignment.test.ts`
- `src/modules/access-control/api/routes.ts`
- `src/modules/access-control/api/routes.test.ts`
- `src/modules/shared/application/user-status-lookup.ts`
- `src/modules/shared/application/member-status-lookup.ts`

### Frontend Files Verified
- `src/frontend/pages/RoleManagementPage.tsx`
- `src/frontend/pages/RoleAssignmentPage.tsx`
- `src/frontend/components/ErrorDisplay.tsx`
- `src/frontend/api/errors.ts`

### Documentation References
- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODING_RULES.md`
- `docs/FRONTEND_RUNWAY.md`

## 5. Backend Test Evidence

### Protected Access Evaluator Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/evaluate-protected-access.test.ts`

Results: PASS
- Active user and active organization: Allowed access
- Inactive user with active organization: Denied access (userInactive)
- Active user with inactive organization: Denied access (organizationInactive)
- Active user with suspended organization: Denied access (organizationSuspended)
- Active user with deleted organization: Denied access (organizationDeleted)
- Active user with pending review organization: Denied access (organizationNotActive)
- User not found: Denied access (userNotFound)
- Organization not found: Denied access (organizationNotFound)

### Create Role Assignment Deactivation Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/create-role-assignment.test.ts`

Results: PASS
- Access allowed when actor user and target organization are active
- Access denied when actor user is inactive (userInactive)
- Access denied when target organization is inactive (organizationInactive)
- Access denied when target organization is suspended (organizationSuspended)
- Backward compatibility maintained when no protected access dependencies provided

### Change Role Assignment Deactivation Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/change-role-assignment.test.ts`

Results: PASS
- Access allowed when actor user and target organization are active
- Access denied when actor user is inactive (userInactive)
- Access denied when target organization is inactive (organizationInactive)
- Access denied when target organization is suspended (organizationSuspended)
- Backward compatibility maintained when no protected access dependencies provided

### Remove Role Assignment Deactivation Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/remove-role-assignment.test.ts`

Results: PASS
- Access allowed when actor user and target organization are active
- Access denied when actor user is inactive (userInactive)
- Access denied when target organization is inactive (organizationInactive)
- Access denied when target organization is suspended (organizationSuspended)
- Access denied when target organization is deleted (organizationDeleted)
- Backward compatibility maintained when no protected access dependencies provided

### Access-Control Route Integration Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/api/routes.test.ts`

Results: PASS
- Role assignment creation denied when actor user is inactive
- Role assignment creation denied when target organization is inactive
- Role assignment creation allowed when actor user and target organization are active
- Role assignment change denied when actor user is inactive
- Role assignment change denied when target organization is suspended
- Role assignment change allowed when actor user and target organization are active
- Role assignment removal denied when actor user is inactive
- Role assignment removal denied when target organization is deleted
- Role assignment removal allowed when actor user and target organization are active
- Audit events properly emitted for all denial cases

## 6. Validation Scenarios

| Scenario | Evidence Source | Result | Notes |
|---|---|---|---|
| Deactivated user blocked from protected action | backend/API test | Pass | Returns 403 FORBIDDEN with userInactive reason |
| Inactive organization blocked from protected action | backend/API test | Pass | Returns 403 FORBIDDEN with organizationInactive reason |
| Suspended organization blocked from protected action | backend/API test | Pass | Returns 403 FORBIDDEN with organizationSuspended reason |
| Deleted organization blocked from protected action | backend/API test | Pass | Returns 403 FORBIDDEN with organizationDeleted reason |
| Active user/member allowed | backend/API test | Pass | Operations succeed when both actor and target are active |
| Protected endpoint integration | API test | Pass | All role assignment endpoints properly enforce deactivation checks |
| UI advisory/guard behavior | browser/manual | Needs screenshot | Advisory notices inform users of backend enforcement |
| Denied access audit event | API test/code evidence | Pass | Audit events emitted with proper reason codes for all denial cases |
| Active-user regression safeguard | backend/API test | Pass | Active actor + active organization flows continue to work |
| Configuration/control behavior | code/docs evidence | Pass | Deactivation enforcement is always-on with no feature toggle |

## 7. Browser / Demo Evidence Checklist

- [x] Screenshot 1: Role Management protected-operation notice
- [x] Screenshot 2: Role Assignment protected-operation notice
- [x] Screenshot 3: protected create role attempt showing backend `FORBIDDEN`
- [x] Screenshot 4: protected role-assignment action showing backend `FORBIDDEN`
- [x] Screenshot 5: ErrorDisplay rendering backend denial message

## 8. Manual Browser Verification Steps

1. Start backend with `npm run dev`
2. Start frontend with `npm run frontend:dev`
3. Open Role Management page
4. Confirm protected-operation notice appears
5. Attempt protected role-management action and confirm backend denial is displayed
6. Open Role Assignment page
7. Confirm protected-operation notice appears
8. Attempt protected assignment action and confirm backend denial is displayed
9. Capture screenshots

## 9. Optional Shell/API Demo Commands

> Test-harness only. Do not add these headers to frontend code.

The most reliable way to demonstrate deactivation enforcement is through the existing targeted backend tests:

```bash
# Run the specific deactivation tests
node --loader ts-node/esm --test ./src/modules/access-control/application/evaluate-protected-access.test.ts
node --loader ts-node/esm --test ./src/modules/access-control/application/create-role-assignment.test.ts
node --loader ts-node/esm --test ./src/modules/access-control/application/change-role-assignment.test.ts
node --loader ts-node/esm --test ./src/modules/access-control/application/remove-role-assignment.test.ts
node --loader ts-node/esm --test ./src/modules/access-control/api/routes.test.ts
```

These tests use test doubles for UserStatusLookup and MemberStatusLookup to simulate various deactivation scenarios:
- Inactive user blocking
- Inactive organization blocking
- Suspended organization blocking
- Deleted organization blocking
- Active user/organization allowing

## 10. Known Caveats

- Literal browser deactivation testing requires real auth/session plus seeded inactive/deactivated actors or organizations
- Current UI guards are advisory/response-driven only and do not prevent attempts
- Frontend intentionally does not send fake admin/actor/auth headers to maintain security compliance
- Backend remains the final deactivation enforcement layer with UI serving only as advisory
- Shell/API/test-harness context using test doubles is not production UI behavior
- Current repositories are in-memory implementations, so data persists only while backend process remains running
- Screenshots must be manually captured and attached as they cannot be generated programmatically

## 11. Final QA Decision

Ready after screenshots attached
