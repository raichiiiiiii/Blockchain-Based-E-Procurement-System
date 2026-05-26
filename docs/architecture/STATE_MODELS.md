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

## 5. User state model

### states
- `active`
- `inactive`

### rules
- `active` users may participate normally in allowed flows
- `inactive` users are considered deactivated and are blocked from protected write operations
- `inactive` users remain historically visible where appropriate
- changing a user to `inactive` does not silently erase historical records or assignments

## 6. Deactivation policy

### active vs inactive semantics
- `active` state permits normal participation in allowed flows
- `inactive`/deactivated state blocks protected writes according to the approved protected-function matrix

### protected function behavior
When an actor (user) or target entity (organization) is deactivated:
- deactivated actors are denied for protected writes
- organization-scoped protected writes are denied when the target organization is deactivated
- sensitive reads remain conditional/provisional
- general reads remain allowed unless separately restricted

Protected-function behavior is governed by PROTECTED_FUNCTION_INVENTORY.md.

## 7. Role state model

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

## 8. Role assignment state model

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

## 9. Review request workflow state model

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

## 10. Checklist completion state rules

### provisional source assumption
Checklist items are provisionally assumed to be seeded reference data in Sprint 1.

### allowed outcomes
- `pass`
- `fail`
- `notApplicable`

### completion rule
A review is `checklistComplete` only when:
- all mandatory checklist items have been evaluated
- required comments are provided for all `fail` outcomes
- required evidence references are provided for items that mandate them

### incomplete rule
If the above is not satisfied, the review remains `checklistInProgress`.

Partial checklist saves may remain `checklistInProgress`. Completion intent is explicit through the `completeChecklist` flag in the request. When completion is attempted, missing mandatory items or other unsatisfied completion rules must block `checklistComplete` state transition and be rejected with `VALIDATION_ERROR`.

Additional rules:
- mandatory checklist items are defined in the seeded reference data
- mandatory items may use any outcome value including "notApplicable"
- duplicate itemCode entries are not allowed in one checklist submission

[FLAG-CHECKLIST-SOURCE]
Checklist source and longer-term configurability are not yet fully approved.

## 11. Decision rules

### Valid final decision states
- `approved`
- `rejected`
- `conditionalApproved`

### Valid transitions
- `checklistComplete` -> `approved`
- `checklistComplete` -> `rejected`
- `checklistComplete` -> `conditionalApproved`

### Invalid transitions
- `submitted` cannot transition directly to any final decision state
- `checklistInProgress` cannot transition directly to any final decision state
- Final decision states are terminal for decision recording unless a later task explicitly documents reopen/reversal behavior

### Mandatory field rules
- All final decisions require a rationale
- `conditionalApproved` requires one or more explicit conditions
- Each condition requires:
  - `description` (required)
  - `dueDate` (required)
- `approved` and `rejected` must not carry conditions

[FLAG-CONDITIONAL-APPROVAL]
Condition structure requirements (rationale and due date) are defined, but condition expiry, ownership, and closure enforcement are not yet fully approved.

## 12. History/read model state rules

### Current status derivation
The `currentStatus` field is derived from the latest valid recorded workflow state in the progression model. This represents the most recent actionable state of the review.

### Progression mapping rules
The history model maps workflow states to progression entries as follows:

1. **Submitted with no checklist yet**
   - Workflow state: `submitted`
   - Progression entry:
     - Action: `reviewSubmitted`
     - From status: null (no prior state)
     - To status: `submitted`
     - Timestamp: submission time
     - Actor: submitting user

2. **Checklist in progress**
   - Workflow state: `checklistInProgress`
   - Progression entry:
     - Action: `checklistSaved`
     - From status: `submitted` or `checklistInProgress`
     - To status: `checklistInProgress`
     - Timestamp: checklist save time
     - Actor: checklist author

3. **Checklist complete with no final decision**
   - Workflow state: `checklistComplete`
   - Progression entry:
     - Action: `checklistCompleted`
     - From status: `checklistInProgress`
     - To status: `checklistComplete`
     - Timestamp: completion time
     - Actor: checklist author

4. **Approved decision**
   - Workflow state: `approved`
   - Progression entry:
     - Action: `decisionRecorded`
     - From status: `checklistComplete`
     - To status: `approved`
     - Timestamp: decision time
     - Actor: decision maker
     - Rationale: required

5. **Rejected decision**
   - Workflow state: `rejected`
   - Progression entry:
     - Action: `decisionRecorded`
     - From status: `checklistComplete`
     - To status: `rejected`
     - Timestamp: decision time
     - Actor: decision maker
     - Rationale: required

6. **Conditionally approved decision**
   - Workflow state: `conditionalApproved`
   - Progression entry:
     - Action: `decisionRecorded`
     - From status: `checklistComplete`
     - To status: `conditionalApproved`
     - Timestamp: decision time
     - Actor: decision maker
     - Rationale: required
     - Conditions: required list with descriptions and due dates

### Initial history behavior
- The first progression entry corresponds to the review submission
- This initial entry has a null `fromStatus` since there is no prior workflow state
- The initial entry's `toStatus` is `submitted`

### Ordering and completeness rules
- History entries are ordered chronologically from oldest to newest
- Intermediate/incomplete histories (submitted only, checklistInProgress, checklistComplete with no decision) are valid and must return successfully
- Absence of a final decision is not an error condition and must be handled gracefully
- All state transitions that have occurred must be represented in the history

## 13. KYC/AML onboarding intake state model

### initial intake state
- `submitted`

### initial state meaning
- `submitted`: the onboarding case was accepted into the compliance review workflow, but no KYC/AML review outcome has been recorded yet

### initial state rule
All newly accepted KYC/AML onboarding cases begin in `submitted` state.

### deferred outcome model
PBI-152 defines only the intake state needed for onboarding case creation. Review outcome states and transition rules are intentionally deferred to PBI-156.

Do not treat `approved`, `rejected`, `flagged`, `blocked`, or any equivalent review outcome as approved by PBI-152.

[FLAG-KYC-AML-OUTCOME-STATES]
The KYC/AML review outcome vocabulary and transition model will be defined by PBI-156.

## 14. KYC/AML onboarding review state model

### resulting decision statuses
- `approved`
- `rejected`
- `flagged`
- `blocked`

### outcome meanings
- `approved`: the onboarding case has passed compliance review and is eligible for platform participation
- `rejected`: the onboarding case has failed compliance review and is not eligible for platform participation
- `flagged`: the onboarding case requires additional manual compliance review or follow-up before eligibility can be determined
- `blocked`: the onboarding case has been identified as high-risk and is blocked from platform participation pending remediation or exception approval

### initial state
- `submitted`: the onboarding case has been accepted into the compliance review workflow

### transition rules
- `submitted` -> `approved` through review outcome `pass`
- `submitted` -> `rejected` through review outcome `fail`
- `submitted` -> `flagged` through review outcome `flag`
- `submitted` -> `blocked` through review outcome `block`

### finality assumption
For the current MVP state model, `approved`, `rejected`, `flagged`, and `blocked` are treated as final decision states with no further transition until a later PBI defines reopen, remediation, expiry, or appeal behavior.

### invalid transitions
- No review decision may be recorded for a missing onboarding case
- No review decision may be recorded when the current status is already `approved`, `rejected`, `flagged`, or `blocked`
- No direct transition from `approved`, `rejected`, `flagged`, or `blocked` to another outcome state is allowed in this PBI.
- Reopen, remediation, expiry, and appeal behavior are not defined by this state model.

### deferred behavior
- Reopen, remediation, expiry, and appeal behavior are intentionally deferred to future PBIs
- Downstream eligibility enforcement is handled by PBI-150/PBI-184 onward, not by this state model
- Sanctions screening implementation is out of scope for this state model

[FLAG-KYC-AML-OUTCOME-STATES]
KYC/AML review outcome states and transition rules are now defined for MVP. Reopen, remediation, expiry, and appeal behavior remain deferred to future PBIs.

## 15. KYC/AML onboarding status/history read model

### Purpose
Define the read model for retrieving current onboarding status and decision history for an onboarding case.

### Status values
- `submitted`
- `approved`
- `rejected`
- `flagged`
- `blocked`

### Current status derivation
The `currentStatus` field is derived from the latest valid recorded state in the onboarding case lifecycle.

### Finality indicator
The `isFinal` field indicates whether the current status represents a final decision state:
- `false` for `submitted` (intermediate state)
- `true` for `approved`, `rejected`, `flagged`, and `blocked` (final states)

### History event types
- `caseSubmitted`
- `decisionRecorded`

### History ordering
History entries are ordered chronologically from oldest to newest:
1. `caseSubmitted` event (always present)
2. `decisionRecorded` event (present when a decision has been recorded)

### Intermediate-state behavior
For cases in the `submitted` state with no decision recorded:
- `currentStatus` is `submitted`
- `isFinal` is `false`
- History contains only the `caseSubmitted` event

### Final-state behavior
For cases with a recorded decision:
- `currentStatus` reflects the decision outcome (`approved`, `rejected`, `flagged`, or `blocked`)
- `isFinal` is `true`
- History contains both the `caseSubmitted` event and the `decisionRecorded` event

### History entry fields
Each history entry includes:
- `type`: The event type (`caseSubmitted` or `decisionRecorded`)
- `fromStatus`: The previous status before the change (null for initial submission)
- `toStatus`: The resulting status after the change
- `actorUserId`: Opaque user identifier of the actor who performed the action
- `occurredAt`: ISO 8601 UTC timestamp of when the action occurred

Decision-specific fields (present only in `decisionRecorded` events):
- `outcome`: The decision outcome (`pass`, `fail`, `flag`, or `block`)
- `rationale`: The decision justification
- `reasonCodes`: Array of reason codes explaining the decision

### Completeness rules
- All state transitions that have occurred must be represented in the history
- Intermediate histories (submitted only) are valid and must return successfully
- Absence of a final decision is not an error condition and must be handled gracefully

## 16. Provisional protected functions list

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

## 17. Delivery evidence MVP state model

### delivery evidence verification status
- `metadataRecorded`

### status meaning
- `metadataRecorded`: the supplier has submitted safe delivery evidence metadata, a reference, and a hash for an accepted order. This does not claim signed IoT, QR, external logistics, or production document verification.

### MVP transition
- new delivery evidence records start and remain `metadataRecorded`

### deferred behavior
- signed IoT/QR verification
- external logistics or EPCIS verification
- buyer acceptance/rejection workflow for delivery
- automatic escrow release based on delivery evidence

## 18. Open state-model decisions

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

[FLAG-KYC-AML-OUTCOME-STATES]
Current working assumption: PBI-152 approves only `submitted` as the initial onboarding intake state. Review outcome states and transitions are now defined by PBI-156 for MVP, with reopen/remediation behavior deferred to future PBIs.
