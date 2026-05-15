# Audit Event Capture Matrix

## 1. Purpose

This document defines the complete matrix of protected actions that must be captured for audit purposes in PBI-120. It maps each protected function to its expected audit outcomes and provides implementation readiness assessment.

## 2. Scope

This matrix covers all protected actions across membership, access-control, and shariah-review modules that require audit capture for PBI-120 implementation. It categorizes actions into governed writes, denied protected actions, and selected sensitive reads.

## 3. Requirement Traceability

- ReqID: R22
- Feature: PBI-022
- Story: PBI-120
- Task: PBI-123

## 4. Capture Categories

- **Governed Write**: Actions that modify system state and require authorization
- **Denied Protected Action**: Actions that are rejected due to authorization, validation, or business rule failures
- **Selected Sensitive Read**: Actions that access sensitive information and require audit based on policy

## 5. Protected Action Matrix

| Module | Route / Function | Method | Category | Capture Required | Event Action | Target Type | Target ID Source | Actor Source | Outcome Coverage | Current Coverage | Gap / Note |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| membership | POST `/api/v1/member-organizations` | POST | Governed Write | Yes | createMemberOrganization | memberOrganization | Generated ID | request.actorContext.userId | success, conflict | Partial | Missing forbidden audit |
| access-control | POST `/api/v1/roles` | POST | Governed Write | Yes | createRole | role | Generated ID | request.actorContext.userId | success, conflict, forbidden | Complete | None |
| access-control | PATCH `/api/v1/roles/:id` | PATCH | Governed Write | Yes | updateRole | role | Route parameter | request.actorContext.userId | success, notFound, forbidden | Complete | None |
| access-control | POST `/api/v1/role-assignments` | POST | Governed Write | Yes | createRoleAssignment | roleAssignment | Composite of userId:orgId:roleId | request.actorContext.userId | success, conflict, validationError, forbidden | Complete | None |
| access-control | PATCH `/api/v1/role-assignments/change` | PATCH | Governed Write | Yes | changeRoleAssignment | roleAssignment | Composite of userId:orgId:roleId | request.actorContext.userId | success, notFound, conflict, validationError, forbidden | Complete | None |
| access-control | DELETE `/api/v1/role-assignments` | DELETE | Governed Write | Yes | removeRoleAssignment | roleAssignment | Composite of userId:orgId:roleId | request.actorContext.userId | success, notFound, forbidden | Complete | None |
| shariah-review | POST `/api/v1/shariah-reviews` | POST | Governed Write | Yes | submitShariahReview | shariahReview | Generated ID | request.actorContext.userId | success, forbidden, validationError | Complete | None |
| shariah-review | PUT `/api/v1/shariah-reviews/:reviewId/checklist` | PUT | Governed Write | Yes | saveShariahReviewChecklist | shariahReview | Route parameter | request.actorContext.userId | success, forbidden, validationError, notFound | Complete | None |
| shariah-review | POST `/api/v1/shariah-reviews/:reviewId/decision` | POST | Governed Write | Yes | recordShariahReviewDecision | shariahReview | Route parameter | request.actorContext.userId | success, forbidden, validationError, notFound | Complete | None |
| shariah-review | GET `/api/v1/shariah-reviews/:reviewId/history` | GET | Selected Sensitive Read | Yes | viewShariahReviewHistory | shariahReview | Route parameter | request.actorContext.userId | success, forbidden, notFound | Complete | None |

## 6. Required Outcome Coverage by Route

| Route / Function | success | forbidden | validationError | notFound | conflict | error | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| POST `/api/v1/member-organizations` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | Missing forbidden coverage |
| POST `/api/v1/roles` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | Complete |
| PATCH `/api/v1/roles/:id` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | Complete |
| POST `/api/v1/role-assignments` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | Complete |
| PATCH `/api/v1/role-assignments/change` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Complete |
| DELETE `/api/v1/role-assignments` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | Complete |
| POST `/api/v1/shariah-reviews` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Complete |
| PUT `/api/v1/shariah-reviews/:reviewId/checklist` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Complete |
| POST `/api/v1/shariah-reviews/:reviewId/decision` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Complete |
| GET `/api/v1/shariah-reviews/:reviewId/history` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | Complete |

## 7. Selected Sensitive Reads for PBI-120

For PBI-120, the following sensitive reads are in scope:

- GET `/api/v1/shariah-reviews/:reviewId/history` - View Shariah review history

Other potential sensitive reads are deferred unless explicitly added to the matrix in future work.

## 8. Current Audit Coverage Summary

Existing audit coverage is implemented through module-specific callback mechanisms:

- **Success coverage**: Well-implemented across all modules
- **Denial coverage**: Mostly complete, with some gaps in forbidden access coverage
- **Validation/NotFound/Conflict coverage**: Inconsistent across modules
- **Current gaps**: 
  - Missing forbidden access audit in membership module
  - Inconsistent validation error audit coverage
  - Inconsistent not found audit coverage

## 9. Implementation Readiness for PBI-124 to PBI-126

Mapping implementation needs:

- **PBI-124 (Shared Audit Event Capture)**: Needs shared builder and persistence port; current implementation uses module-specific callbacks
- **PBI-125 (Governed Writes and Denied Actions)**: Most routes are ready; membership module needs forbidden audit implementation
- **PBI-126 (Selected Sensitive Reads)**: Ready with existing shariah review history implementation

## 10. Open Flags Resolved by PBI-123

- **FLAG-AUDIT-PAYLOAD-MVP**: RESOLVED - Standardized audit event payload defined in ACCESS_AUDIT_EVENT_CONTRACT.md
- **FLAG-NONREPUDIATION-EVIDENCE-MVP**: RESOLVED - Defined MVP non-repudiation as hash-based evidence in ACCESS_AUDIT_EVENT_CONTRACT.md
- **FLAG-SENSITIVE-READ-CAPTURE-SCOPE**: RESOLVED - Limited to shariah review history access for PBI-120

State the resolution or current decision for each.
