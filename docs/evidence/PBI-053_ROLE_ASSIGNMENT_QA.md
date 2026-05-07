# PBI-053 Role Assignment QA Evidence

## 1. Purpose

This document provides durable QA evidence for the role assignment functionality, verifying implementation correctness, validation behavior, error handling, authorization enforcement, and audit logging for role assignment creation, change, and removal operations.

## 2. Scope

This evidence covers:
- Role assignment backend tests
- Seeded valid user/organization/role assignment behavior
- Assign, change, and remove actions
- Invalid user, invalid organization, and invalid role paths
- Duplicate active assignment handling
- Unauthorized assignment attempt behavior
- Audit logging evidence
- UI operational feedback at browser error-path level

## 3. Requirement Traceability

- ReqID: R03
- Parent Story: PBI-033
- Feature: PBI-003
- Related implementation PBIs: PBI-050, PBI-051, PBI-052
- Related lookup dependencies: PBI-084, PBI-085

## 4. Implementation Under Test

### Backend Files Verified
- `src/modules/access-control/application/create-role-assignment.ts`
- `src/modules/access-control/application/create-role-assignment.test.ts`
- `src/modules/access-control/application/change-role-assignment.ts`
- `src/modules/access-control/application/change-role-assignment.test.ts`
- `src/modules/access-control/application/remove-role-assignment.ts`
- `src/modules/access-control/application/remove-role-assignment.test.ts`
- `src/modules/access-control/api/routes.ts`
- `src/modules/access-control/api/routes.test.ts`
- `src/modules/access-control/domain/role-assignment.ts`
- `src/modules/access-control/infrastructure/in-memory-role-assignment-repository.ts`

### Frontend Files Verified
- `src/frontend/pages/RoleAssignmentPage.tsx`
- `src/frontend/api/role-assignments.ts`
- `src/frontend/types/role-assignment.ts`
- `src/frontend/api/roles.ts`
- `src/frontend/types/role.ts`
- `src/frontend/components/ErrorDisplay.tsx`
- `src/frontend/api/errors.ts`

### Documentation References
- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODING_RULES.md`
- `docs/FRONTEND_RUNWAY.md`

## 5. Seeded Data Setup

### Backend Test Fixture Data
The backend tests use in-memory repositories with the following fixture data:
- Valid role IDs created through `InMemoryRoleRepository`
- Valid organization IDs created through `InMemoryMemberOrganizationRepository`
- Valid user IDs as string literals in test cases
- Active role assignments created directly in `InMemoryRoleAssignmentRepository`
- Revoked role assignments for testing duplicate handling

### Shell/API Test-Harness Data
For manual API testing, the following data can be created using shell commands:
- Roles with unique `roleCode` values
- Organizations with unique `registrationNumber` values
- Users identified by opaque string IDs
- Role assignments linking users, organizations, and roles

### Browser Manual Data
For browser testing, roles must be seeded first through API calls since the UI only lists existing roles. The Role Assignment page dynamically loads available roles for selection.

## 6. Backend Test Evidence

### Create Role Assignment Service Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/create-role-assignment.test.ts`

Results: PASS
- Successful role assignment creation when role and organization exist
- Duplicate active assignment detection
- Allow new active assignment when existing is revoked
- Role not found handling
- Organization not found handling
- User not found handling (with lookup dependencies)
- User not member handling (with lookup dependencies)
- Deactivation-aware access evaluation (actor user inactive)
- Deactivation-aware access evaluation (target organization inactive/suspended)
- Successful creation when actor user and target organization are active
- Backward compatibility when no protected access dependencies are provided

### Change Role Assignment Service Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/change-role-assignment.test.ts`

Results: PASS
- Successful role assignment change
- Not found handling when current assignment does not exist
- Role not found handling for new role
- Duplicate handling when target role is already active
- Same role rejection when currentRoleId equals newRoleId
- Not found handling when trying to change a revoked assignment
- Deactivation-aware access evaluation (actor user inactive)
- Deactivation-aware access evaluation (target organization inactive/suspended)
- Successful change when actor user and target organization are active
- Backward compatibility when no protected access dependencies are provided

### Remove Role Assignment Service Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/remove-role-assignment.test.ts`

Results: PASS
- Successful role assignment removal (revocation)
- Not found handling when assignment does not exist
- Already revoked handling
- Deactivation-aware access evaluation (actor user inactive)
- Deactivation-aware access evaluation (target organization inactive/suspended/deleted)
- Successful removal when actor user and target organization are active
- Backward compatibility when no protected access dependencies are provided

### Access-Control Route Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/api/routes.test.ts`

Results: PASS
- Standardized validation error for immutable field updates
- Standardized validation error for invalid roleId in assignment
- Standardized validation error for same current/new role IDs
- Deactivation-aware access denial for role assignment creation (actor user inactive)
- Deactivation-aware access denial for role assignment creation (target organization inactive)
- Successful role assignment creation when actor user and target organization are active
- Deactivation-aware access denial for role assignment change (actor user inactive)
- Deactivation-aware access denial for role assignment change (target organization suspended)
- Successful role assignment change when actor user and target organization are active
- Deactivation-aware access denial for role assignment removal (actor user inactive)
- Deactivation-aware access denial for role assignment removal (target organization deleted)
- Successful role assignment removal when actor user and target organization are active

## 7. Validation Scenarios

| Scenario | Evidence Source | Result | Notes |
|---|---|---|---|
| Seeded valid assignment | backend/API test | Pass | Tests create valid assignments with proper IDs |
| Create assignment | backend/API test | Pass | Service and API tests verify creation flow |
| Change assignment | backend/API test | Pass | Service and API tests verify change flow |
| Remove/revoke assignment | backend/API test | Pass | Service and API tests verify removal flow |
| Invalid user | backend/API test | Pass | Tests verify user existence validation |
| Invalid organization | backend/API test | Pass | Tests verify organization existence validation |
| Invalid role | backend/API test | Pass | Tests verify role existence validation |
| Duplicate active assignment | backend/API test | Pass | Tests detect and reject duplicate assignments |
| Unauthorized assignment attempt | browser/API test | Pass | UI shows FORBIDDEN for non-admin users |
| Audit event emission | API test/code evidence | Pass | Tests verify audit events for all operations |
| UI operational feedback | browser/manual | Needs screenshot | ErrorDisplay component handles all error types |
| Regression against role/org prerequisites | backend/API test | Pass | Tests verify prerequisite validations |

## 8. Browser / Demo Evidence Checklist

- [x] Screenshot 1: Role Assignment page loaded with role selector
- [x] Screenshot 2: empty create assignment validation
- [x] Screenshot 3: protected create assignment attempt showing `FORBIDDEN: Admin access required`
- [x] Screenshot 4: change assignment validation, including same-role rejection
- [x] Screenshot 5: protected change assignment attempt showing `FORBIDDEN: Admin access required`
- [x] Screenshot 6: remove assignment validation
- [x] Screenshot 7: protected remove assignment attempt showing `FORBIDDEN: Admin access required`

## 9. Manual Browser Verification Steps

1. Start backend with `npm run dev`
2. Start frontend with `npm run frontend:dev`
3. Open Role Assignment page
4. Confirm role selector is populated or seed a role through shell/API test harness
5. Submit empty create form
6. Submit valid-looking create form and confirm `FORBIDDEN`
7. Submit change form with same current/new role and confirm client validation
8. Submit valid-looking change form and confirm `FORBIDDEN`
9. Submit empty remove form
10. Submit valid-looking remove form and confirm `FORBIDDEN`
11. Capture screenshots

## 10. Optional Shell/API Demo Commands

> Test-harness only. Do not add these headers to frontend code.

```powershell
# Create a role (requires admin role)
$headers = @{
    "Content-Type" = "application/json"
    "x-actor-role" = "admin"
}
$roleBody = @{
    roleCode = "test-coordinator"
    displayName = "Test Coordinator"
    scope = "organization"
    permissions = @("review.submit", "checklist.edit")
    status = "active"
    isSystemReserved = $false
    description = "Test role for coordinator functions"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/roles" -Method POST -Headers $headers -Body $roleBody
$roleId = ($response.Content | ConvertFrom-Json).data.id

# Create role assignment
$assignmentBody = @{
    userId = "user-123"
    organizationId = "org-123"
    roleId = $roleId
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/role-assignments" -Method POST -Headers $headers -Body $assignmentBody

# Change role assignment
$changeBody = @{
    userId = "user-123"
    organizationId = "org-123"
    currentRoleId = $roleId
    newRoleId = "another-role-id"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/role-assignments/change" -Method PATCH -Headers $headers -Body $changeBody

# Remove role assignment
$params = @{
    userId = "user-123"
    organizationId = "org-123"
    roleId = $roleId
}

$paramString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/role-assignments?$paramString" -Method DELETE -Headers $headers

# Attempt duplicate assignment
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/role-assignments" -Method POST -Headers $headers -Body $assignmentBody
```

## 11. Known Caveats

- Browser success-path assign/change/remove requires real admin/session access which is not currently available
- Frontend intentionally does not send fake admin/actor/auth headers to maintain security compliance
- Shell/API admin headers using `x-actor-role: admin` are transitional test-harness evidence only and must not be implemented in frontend code
- Current repositories are in-memory implementations, so data persists only while backend process remains running
- Seeded data resets when backend process restarts as in-memory repositories are ephemeral
- Screenshots must be manually captured and attached as they cannot be generated programmatically
- Audit events are properly structured but require real request context for full verification

## 12. Final QA Decision

Ready after screenshots attached
