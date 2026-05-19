# Protected Function Inventory

Status: Approved for Implementation  
Owner: Security / Compliance  
Last updated: 2026-04-22

## 1. Approved Protected-Function Matrix

| Module | Endpoint/Function | Class | Actor Deactivated Effect | Organization Deactivated Effect | Expected Outcome | Audit Expectation | Policy Status |
|--------|-------------------|-------|--------------------------|----------------------------------|------------------|-------------------|---------------|
| membership | POST /api/v1/member-organizations | Protected Write | Submission blocked | N/A (organization being created) | Deny | Audit denied access | Approved |
| access-control | POST /api/v1/roles | Protected Write | Submission blocked | N/A | Deny | Audit denied access | Approved |
| access-control | PATCH /api/v1/roles/{roleId} | Protected Write | Submission blocked | N/A | Deny | Audit denied access | Approved |
| access-control | POST /api/v1/role-assignments | Protected Write | Submission blocked | Assignment target organization deactivation blocks new assignments | Deny | Audit denied access | Approved |
| access-control | DELETE /api/v1/role-assignments | Protected Write | Submission blocked | N/A | Deny | Audit denied access | Approved |
| access-control | PATCH /api/v1/role-assignments/change | Protected Write | Submission blocked | Assignment target organization deactivation blocks changes | Deny | Audit denied access | Approved |
| access-control | GET /api/v1/roles | General Read | N/A | N/A | Allow | No audit required | Approved |
| shariah-review | POST /api/v1/shariah-reviews | Protected Write | Submission blocked | Target organization deactivation blocks submission | Deny | Audit denied access | Approved |
| shariah-review | PUT /api/v1/shariah-reviews/{reviewId}/checklist | Protected Write | Submission blocked | Target organization deactivation blocks checklist operations | Deny | Audit denied access | Approved |
| shariah-review | POST /api/v1/shariah-reviews/{reviewId}/decision | Protected Write | Submission blocked | Target organization deactivation blocks decision recording | Deny | Audit denied access | Approved |
| shariah-review | GET /api/v1/shariah-reviews/{reviewId}/history | Sensitive Read | N/A | May restrict visibility of historical records | Conditional | Audit access granted/denied | Approved |

## 2. Deactivation-Effect Rules

### 2.1 Deactivated Actor Access Rules
When a user is deactivated:
- All protected write operations initiated by that user are denied
- Access to sensitive read operations may be restricted depending on implementation

### 2.2 Organization-Scoped Protected Write Rules
When an organization is deactivated:
- New role assignments targeting the organization are denied
- Modifications to existing role assignments for the organization are denied
- New Shariah review submissions targeting the organization are denied
- Checklist operations on existing reviews for the organization are denied
- Decision recording for reviews associated with the organization are denied

### 2.3 Sensitive Read Rules
- Access to sensitive read operations (e.g., review history) for deactivated actors or organizations may be conditionally restricted
- Specific visibility policies for historical records require further policy confirmation

### 2.4 General Read Rules
- General read operations remain accessible unless specifically restricted by sensitive read policies

## 3. Carry-Over Implementation Map

### 3.1 PBI-054: Actor Deactivation Enforcement
**Implementation Work Unblocked:**
- Enforcement of actor deactivation checks for all protected write operations
- Implementation of deny responses for deactivated actors attempting protected writes

**Affected Modules/Routes:**
- All modules with protected write endpoints listed in the approved matrix

**Required Enforcement:**
- Deny all protected write operations from deactivated actors
- Audit all denied access attempts with outcome tracking

### 3.2 PBI-055: Organization Deactivation Enforcement
**Implementation Work Unblocked:**
- Enforcement of organization deactivation checks for organization-scoped protected operations
- Implementation of deny responses for operations targeting deactivated organizations

**Affected Modules/Routes:**
- access-control: POST /api/v1/role-assignments
- access-control: PATCH /api/v1/role-assignments/change
- shariah-review: POST /api/v1/shariah-reviews
- shariah-review: PUT /api/v1/shariah-reviews/{reviewId}/checklist
- shariah-review: POST /api/v1/shariah-reviews/{reviewId}/decision

**Required Enforcement:**
- Deny organization-scoped protected operations when target organization is deactivated
- Audit all denied access attempts with outcome tracking

### 3.3 PBI-057: Sensitive Read Access Control
**Implementation Work Unblocked:**
- Implementation of access controls for sensitive read operations
- Policy enforcement for visibility of historical records

**Affected Modules/Routes:**
- shariah-review: GET /api/v1/shariah-reviews/{reviewId}/history

**Required Enforcement:**
- Conditional access to sensitive reads based on actor/organization status
- Audit access granted/denied for sensitive read operations

## 4. Audit Linkage Note

Denied access attempts due to actor or organization deactivation must be audited consistently across all protected functions. Each denied operation should generate an audit event with:
- action: corresponding to the attempted operation
- targetType: corresponding to the resource type
- targetId: identifier of the resource being accessed
- outcome: "forbidden" or equivalent
- actorId: identifier of the requesting actor
- reason: "actorDeactivated" or "organizationDeactivated" as appropriate
