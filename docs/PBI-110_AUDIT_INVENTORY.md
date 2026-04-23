# PBI-110: Audit Coverage Inventory

## Title and purpose

This document provides an inventory of current audit behavior across protected routes. It identifies which actions are audited for success and denied-access outcomes, and highlights inconsistencies in audit coverage.

## Scope inspected

- membership module protected routes
- access-control module protected routes
- shariah-review module protected routes
- current success and denied-action audit behavior only
- existing audit event emission mechanisms

## Summary findings

- 8 total routes inspected across the three modules
- 6 currently protected routes inspected
- 7 inspected routes emit success audits
- 0 protected routes clearly emit forbidden-action audits
- 2 routes emit conflict audits
- 1 route emits not-found audits
- 1 route clearly emits validation-error audits
- requestId is missing from shariah-review submission audit events
- actorId sourcing is now consistent in migrated consumers: `request.actorContext.userId`
- denied/error-outcome audit coverage is uneven across protected routes

## Route audit inventory table

| Module | Route | Protected or not | Success audited? | Forbidden audited? | Validation error audited? | Conflict audited? | Not found audited? | Audit action name(s) | actorId source | requestId included? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| membership | POST /member-organizations | Not protected in current implementation | Yes | No | No | No | No | createMemberOrganization | request.actorContext.userId | Yes | Audited write route, but no current protected-action check |
| access-control | POST /roles | Protected | Yes | No | No | Yes | No | createRole | request.actorContext.userId | Yes | Success and conflict audited; forbidden and validation failures are not |
| access-control | PATCH /roles/:roleId | Protected | Yes | No | No | No | Yes | updateRole | request.actorContext.userId | Yes | Success and notFound audited; forbidden and validation failures are not |
| access-control | GET /roles | Not protected | No | No | No | No | No | N/A | N/A | No | Non-protected route; should not be counted as protected-route audit coverage |
| access-control | POST /role-assignments | Protected | Yes | No | Yes | Yes | No | createRoleAssignment | request.actorContext.userId | Yes | Most complete denied/error audit coverage among current protected routes |
| access-control | DELETE /role-assignments | Protected | Yes | No | No | No | No | removeRoleAssignment | request.actorContext.userId | Yes | Success audited; denied/notFound paths are not clearly audited |
| access-control | PATCH /role-assignments/change | Protected | Yes | No | No | No | No | changeRoleAssignment | request.actorContext.userId | Yes | Success audited; denied/error outcomes are not clearly audited |
| shariah-review | POST /shariah-reviews | Protected | Yes | No | No | No | No | submitShariahReview | request.actorContext.userId | No | Success audited; forbidden and invalid submissions are not audited; requestId missing |

## Outcome coverage summary

Across all 8 inspected routes:
- Success audits: 7/8 routes
- Forbidden audits: 0/8 routes
- Validation error audits: 1/8 routes
- Conflict audits: 2/8 routes
- Not found audits: 1/8 routes

Across the 6 currently protected routes only:
- Success audits: 6/6 routes
- Forbidden audits: 0/6 routes
- Validation error audits: 1/6 routes
- Conflict audits: 2/6 routes
- Not found audits: 1/6 routes

## Main inconsistency list

1. `requestId` is missing from shariah-review submission audit events.
2. Forbidden-action audit coverage is absent across the currently protected routes reviewed.
3. Error-outcome audit coverage is uneven:
   - `POST /roles` audits success and conflict
   - `PATCH /roles/:roleId` audits success and notFound
   - `POST /role-assignments` audits success, conflict, and validationError
   - `DELETE /role-assignments` and `PATCH /role-assignments/change` currently audit success only
   - `POST /shariah-reviews` currently audits success only
4. ActorId sourcing is now consistent in migrated route consumers: `request.actorContext.userId`.
5. Non-protected routes should not be mixed into protected-route audit counts without explicit separation.

## Policy-gap note

This inventory reflects current implementation state only. The main visible policy gaps are:
- no current protected route in this inventory clearly emits forbidden-action audit events
- denied and invalid outcome coverage is inconsistent across protected routes
- requestId presence is inconsistent across modules
- success auditing is much more standardized than denied/error auditing

## Explicit out-of-scope note

This evidence slice:
- does not prescribe audit policy changes
- does not refactor route implementations
- does not invent new audit event types
- does not address audit storage or retention
- does not cover non-protected routes
- does not include read-audit coverage for sensitive history access
- does not evaluate audit field completeness beyond actorId and requestId
