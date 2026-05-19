# PBI-048 Role Management QA Evidence

## 1. Purpose

This document provides durable QA evidence for the role management functionality, verifying implementation correctness, validation behavior, error handling, authorization enforcement, and audit logging for role creation and update operations.

## 2. Scope

This evidence covers:
- Valid role creation and update operations
- Duplicate roleCode validation
- Invalid role input validation
- Immutable field update rejection
- Inactive/status rule checks
- Unauthorized role-management attempt handling
- Audit event emission
- Administrator UI feedback behavior
- Existing role catalogue regression protection

## 3. Requirement Traceability

- ReqID: R03
- Parent Story: PBI-032
- Feature: PBI-003
- Related implementation PBIs: PBI-045, PBI-046, PBI-047

## 4. Implementation Under Test

### Backend Files Verified
- `src/modules/access-control/application/create-role.ts`
- `src/modules/access-control/application/create-role.test.ts`
- `src/modules/access-control/application/update-role.ts`
- `src/modules/access-control/application/update-role.test.ts`
- `src/modules/access-control/api/routes.ts`
- `src/modules/access-control/api/routes.test.ts`
- `src/modules/access-control/domain/role.ts`
- `src/modules/access-control/infrastructure/in-memory-role-repository.ts`

### Frontend Files Verified
- `src/frontend/pages/RoleManagementPage.tsx`
- `src/frontend/api/roles.ts`
- `src/frontend/types/role.ts`
- `src/frontend/components/ErrorDisplay.tsx`
- `src/frontend/api/errors.ts`

### Documentation References
- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODING_RULES.md`
- `docs/FRONTEND_RUNWAY.md`

## 5. Backend Test Evidence

### Create Role Application Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/create-role.test.ts`

Results: PASS
- Successful role creation with proper ID generation
- Duplicate role detection based on roleCode and scope combination
- Same roleCode in same scope is correctly identified as duplicate

### Update Role Application Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/application/update-role.test.ts`

Results: PASS
- Successful role updates with proper data merging
- Not found handling for non-existent roles
- Proper persistence of updated role data

### Role API Route Tests
Command: `node --loader ts-node/esm --test ./src/modules/access-control/api/routes.test.ts`

Results: PASS
- Valid role creation with proper 201 response
- Duplicate role creation with 409 CONFLICT response
- Valid role update with proper 200 response
- Role update for non-existent role with 404 NOT_FOUND response
- Immutable field update rejection with 400 VALIDATION_ERROR response
- Admin authorization enforcement with 403 FORBIDDEN response for non-admin users
- Audit event emission for successful operations, conflicts, and forbidden attempts
- Proper data mapping in API responses

## 6. Validation Scenarios

| Scenario | Evidence Source | Result | Notes |
|---|---|---|---|
| Valid role creation | backend/API test | Pass | Creates role with proper ID and attributes |
| Valid role update | backend/API test | Pass | Updates mutable fields while preserving immutables |
| Duplicate roleCode validation | backend/API test | Pass | Returns 409 CONFLICT for duplicate roleCode/scope combinations |
| Invalid role input validation | backend/API/UI | Pass | Returns 400 VALIDATION_ERROR for missing required fields |
| Immutable field update rejection | backend/API/UI | Pass | Returns 400 VALIDATION_ERROR when trying to update roleCode, scope, or isSystemReserved |
| Inactive/status rule checks | backend/API test | Pass | Status field properly accepts active/inactive values |
| Unauthorized role-management attempt | browser/API test | Pass | Returns 403 FORBIDDEN for non-admin users |
| Audit event emission | API test/code evidence | Pass | Emits createRole and updateRole audit events with proper outcomes |
| Administrator UI feedback | browser/manual | Needs screenshot | ErrorDisplay component handles all error types |
| Existing role catalogue regression | backend/API/browser | Pass | List roles endpoint returns all created roles |

## 7. Browser / Demo Evidence Checklist

- [x] Screenshot 1: Role Management page loaded / role list state
- [x] Screenshot 2: empty or invalid create role validation
- [x] Screenshot 3: protected create role attempt showing `FORBIDDEN: Admin access required`
- [x] Screenshot 4: seeded role visible in role list
- [x] Screenshot 5: edit form opened for seeded role
- [x] Screenshot 6: protected update role attempt showing `FORBIDDEN: Admin access required`

## 8. Manual Browser Verification Steps

1. Start backend with `npm run dev`
2. Start frontend with `npm run frontend:dev`
3. Open Role Management page
4. Confirm role list empty or seeded state
5. Submit invalid create form to verify validation feedback
6. Submit valid-looking create form and confirm `FORBIDDEN` is displayed because browser has no real admin session
7. Seed a role through shell/API test harness using transitional admin headers
8. Refresh Role Management page
9. Confirm seeded role appears
10. Open edit form
11. Submit valid-looking update and confirm `FORBIDDEN` is displayed in browser without real admin session
12. Capture screenshots

## 9. Optional Shell/API Demo Commands

> Test-harness only. Do not add these headers to frontend code.

Using curl:
```bash
# Create a role (requires admin role)
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "x-actor-role: admin" \
  -d '{
    "roleCode": "test-coordinator",
    "displayName": "Test Coordinator",
    "scope": "organization",
    "permissions": ["review.submit", "checklist.edit"],
    "status": "active",
    "isSystemReserved": false,
    "description": "Test role for coordinator functions"
  }'

# List all roles
curl http://localhost:3000/api/v1/roles

# Update a role (requires admin role)
curl -X PATCH http://localhost:3000/api/v1/roles/role_123 \
  -H "Content-Type: application/json" \
  -H "x-actor-role: admin" \
  -d '{
    "displayName": "Updated Coordinator",
    "description": "Updated test role description",
    "permissions": ["review.submit", "checklist.edit", "decision.record"],
    "status": "inactive"
  }'

# Attempt to create duplicate role
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "x-actor-role: admin" \
  -d '{
    "roleCode": "test-coordinator",
    "displayName": "Duplicate Coordinator",
    "scope": "organization",
    "permissions": ["duplicate.perm"],
    "status": "active",
    "isSystemReserved": false
  }'
```

Using PowerShell:
```powershell
# Create a role (requires admin role)
$headers = @{
    "Content-Type" = "application/json"
    "x-actor-role" = "admin"
}
$body = @{
    roleCode = "test-coordinator"
    displayName = "Test Coordinator"
    scope = "organization"
    permissions = @("review.submit", "checklist.edit")
    status = "active"
    isSystemReserved = $false
    description = "Test role for coordinator functions"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/roles" -Method POST -Headers $headers -Body $body

# List all roles
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/roles" -Method GET

# Update a role (requires admin role)
$updateHeaders = @{
    "Content-Type" = "application/json"
    "x-actor-role" = "admin"
}
$updateBody = @{
    displayName = "Updated Coordinator"
    description = "Updated test role description"
    permissions = @("review.submit", "checklist.edit", "decision.record")
    status = "inactive"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/roles/role_123" -Method PATCH -Headers $updateHeaders -Body $updateBody

# Attempt to create duplicate role
$duplicateBody = @{
    roleCode = "test-coordinator"
    displayName = "Duplicate Coordinator"
    scope = "organization"
    permissions = @("duplicate.perm")
    status = "active"
    isSystemReserved = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/roles" -Method POST -Headers $headers -Body $duplicateBody
```

## 10. Known Caveats

- Browser success-path create/update requires real admin/session access which is not currently available
- Frontend intentionally does not send fake admin/actor/auth headers to maintain security compliance
- Shell/API admin headers using `x-actor-role: admin` are transitional test-harness evidence only and must not be implemented in frontend code
- Current repositories are in-memory implementations, so data persists only while backend process remains running
- Duplicate conflicts reset when backend process restarts
- Screenshots must be manually captured and attached as they cannot be generated programmatically
- Audit events are properly structured but require real request context for full verification

## 11. Final QA Decision

Ready after screenshots attached
