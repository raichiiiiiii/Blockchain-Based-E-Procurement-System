# State Models

Status: Draft for Sprint 1 baseline  
Owner: Platform + Business Analysis + Compliance  
Last updated: YYYY-MM-DD

## 1. Purpose

This document defines the lifecycle states and transition guards consumed by architecture, contracts, implementation tasks, and tests.

This file is allowed to carry Sprint 1 provisional assumptions where exact business policy is not yet fully frozen.

## 2. Assumption rule

Where a state or transition remains partly unresolved:
- the current working assumption must be written explicitly
- invalid transitions must still be blocked
- later changes must extend the model without silently breaking earlier history

## 3. Member organization state model

### provisional Sprint 1 states
- `pendingReview`
- `active`
- `inactive`
- `suspended`
- `deleted`

### provisional meanings
- `pendingReview`: created but not yet fully approved for operational use
- `active`: normal allowed operating state
- `inactive`: not currently operating; record remains viewable
- `suspended`: temporarily blocked due to governance or policy issue
- `deleted`: logical deletion / terminal archival state

### provisional transitions
- `pendingReview -> active`
- `pendingReview -> inactive`
- `active -> inactive`
- `active -> suspended`
- `inactive -> active`
- `suspended -> active`
- `inactive -> deleted`

### prohibited transitions
- `deleted -> *`
- direct `pendingReview -> deleted` in normal flow
- direct `suspended -> deleted` in normal flow

### Sprint 1 working assumption
Newly created organizations start in `pendingReview`. This aligns with the provisional baseline defined in `ARCHITECTURE.md` and `API_CONTRACTS.md`.

[FLAG-MEMBERSHIP-INITIAL-STATE]
Provisional assumption is `pendingReview`, but backlog wording that implies immediate `active` must still be reconciled.

[FLAG-MEMBERSHIP-STATE-SET]
Earlier task phrasing referenced a simpler lifecycle; Sprint 1 now uses the richer five-state model as a provisional baseline.

## 4. Member access effect model

### view permissions
- `pendingReview` organizations remain visible to authorized admins
- `inactive` organizations remain viewable
- `suspended` organizations remain viewable for governance/admin use
- `deleted` organizations are hidden from normal operational lists and remain visible only where administrative/history access is allowed

### protected-action effect
- `pendingReview`, `inactive`, and `suspended` organizations are blocked from protected actions
- `active` organizations may proceed if authorization also passes
- `deleted` organizations may not initiate new operational actions

[FLAG-PROTECTED-FUNCTIONS]
Protected function inventory is still provisional, but deactivation-aware blocking is mandatory.

## 5. Role state model

### states
- `active`
- `inactive`

### rules
- only active roles may be assigned
- inactive roles remain historically visible
- inactive roles may not be newly assigned
- changing a role to inactive does not silently erase historical assignment records

[FLAG-ROLE-CATALOG]
Whether there are system-reserved roles and the exact role inventory are not yet frozen.

## 6. Role assignment state model

### concept
A role assignment links:
- a user reference
- an organization reference
- a role reference

### states
- `active`
- `revoked`

### rules
- revoked assignments remain historically visible
- an assignment is only meaningful when it references:
  - a user reference
  - an organization
  - a role

[FLAG-USER-IDENTITY]
User identity semantics are not yet fully frozen. Assignment implementation must not assume a final user identity model.

[FLAG-ASSIGNMENT-MULTIPLICITY]
Assignment multiplicity policy is not yet fully frozen. Assignment implementation must not assume a final multiplicity policy until this flag is resolved.

## 7. Review request workflow state model

### states
- `submitted`
- `checklistInProgress`
- `checklistComplete`
- `approved`
- `rejected`
- `conditionalApproved`

### minimum transition path
- `submitted` -> `checklistInProgress`
- `checklistInProgress` -> `checklistComplete`
- `checklistComplete` -> `approved`
- `checklistComplete` -> `rejected`
- `checklistComplete` -> `conditionalApproved`

### invalid transitions
- no decision from `submitted`
- no decision from `checklistInProgress`
- no checklist completion for nonexistent review
- no second final decision unless a formal reopen rule is defined later

### finality assumption
For Sprint 1, `approved`, `rejected`, and `conditionalApproved` are treated as final states.

[FLAG-WORKFLOW-INTERMEDIATE-STATES]
`checklistInProgress` is currently explicit. If later simplified, the history model must still preserve in-progress evidence.

### initial state rule
All newly accepted review requests begin in `submitted` state.

[FLAG-SHARIAH-SUBMISSION-METADATA]
While richer submission metadata requirements remain provisional, the initial state rule for review requests is stable and independent of metadata completeness.

## 8. Checklist completion state rules

### provisional source assumption
Checklist items are provisionally assumed to be seeded reference data in Sprint 1.

### allowed outcomes
- `pass`
- `fail`
- `notApplicable`

### completion rule
A review is `checklistComplete` only when:
- all mandatory checklist items exist
- all mandatory outcomes are recorded
- required comments are present for failed items
- required evidence references are present where policy or seed data requires them

### incomplete rule
If the above is not satisfied, the review remains `checklistInProgress`.

[FLAG-CHECKLIST-SOURCE]
Checklist source and longer-term configurability are not yet fully approved.

## 9. Decision rules

### approved
Requires:
- completed checklist
- rationale optional but recommended

### rejected
Requires:
- completed checklist
- rationale mandatory

### conditionalApproved
Requires:
- completed checklist
- rationale mandatory
- at least one condition recorded
- each condition must include a description and due date in the provisional Sprint 1 model

[FLAG-CONDITIONAL-APPROVAL]
Still unresolved:
- condition expiry semantics
- follow-up ownership
- whether unmet conditions revert access or state later
- whether condition closure is in Sprint 1 scope

## 10. History/read model state rules

History API must support:
- submitted-only records
- in-progress checklist states
- final decision states
- incomplete histories without crashing or hiding available progress data

### current-status rule
`currentStatus` is derived from the latest accepted state transition in the workflow history.

### history rule
Every history item should be able to preserve:
- action
- fromStatus
- toStatus
- performedAt
- performedByUserId
- optional notes

## 11. Provisional protected functions list

Protected functions draft:
- create member organization
- manage role catalog
- assign or revoke roles
- submit Shariah review request
- save checklist completion
- record governance decision
- read sensitive review history
- perform other governed writes that require active organization or user state

[FLAG-PROTECTED-FUNCTIONS]
This list must be formally approved before deactivation enforcement is treated as fully final.

## 12. Open state-model decisions

[FLAG-MEMBERSHIP-INITIAL-STATE]
Current working assumption: `pendingReview`

[FLAG-MEMBERSHIP-STATE-SET]
Current working assumption: five-state organization lifecycle

[FLAG-ROLE-CATALOG]
Current working assumption: RBAC shape is fixed, role taxonomy is not

[FLAG-USER-IDENTITY]
Current working assumption: stable authenticated user context exists

[FLAG-CHECKLIST-SOURCE]
Current working assumption: seeded checklist items for Sprint 1

[FLAG-CONDITIONAL-APPROVAL]
Current working assumption: conditions require rationale and due date, but closure policy is still open
