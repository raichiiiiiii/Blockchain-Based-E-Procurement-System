# Sprint 3 Tasks

Status: Draft execution sheet  
Owner: Scrum Master / Tech Lead  
Last updated: YYYY-MM-DD

## 1. Sprint objective

Build the minimum governed frontend-opening slice for:
- formally approve and execute the frontend-runway decision chain
- establish a real frontend boundary inside the repo
- consume stable backend contracts rather than redefining them
- resume the blocked UI PBIs whose backend prerequisites were satisfied in Sprint 2
- keep frontend work contract-driven, validation-aware, and aligned to backend auth/state/deactivation rules

## 2. Operating rules

- Granular tasks, not stories, are the execution unit.
- Each Aider session must target one task only.
- Each task must use the durable docs, latest backlog, and approved backend contracts as source of truth, not earlier chat memory.
- No task may silently redefine backend contracts, workflow states, audit semantics, or protected-action rules in UI code.
- Any code change that affects contract consumption, frontend boundary, shared request/error handling, or task dependencies must update the durable docs in the same task or the immediate follow-up task.
- Sprint 3 is frontend-opening, not frontend-invention. UI work must consume backend behavior already approved in Sprint 2.

## 3. Carry-over and runway handling rule

Sprint 3 may proceed with frontend work only when:
- the frontend-runway decision chain is explicitly approved
- UI tasks consume stable backend contracts rather than reverse-engineering current route behavior from code
- blocked UI items are moved into the active lane only after their specific backend prerequisites are satisfied
- any temporary frontend scaffolding is documented as such and does not silently become permanent architecture

## 4. Preflight repairs

These repairs should be applied before Wave 0 execution is treated as clean:

- confirm `FLAG-FRONTEND-RUNWAY` is explicitly moved from blocked/unapproved to approved-for-execution
- reconcile backlog status for blocked UI PBIs that are being actively pulled into Sprint 3
- ensure the latest durable docs are authoritative for:
  - actor-source handling
  - error-envelope shape
  - protected-function semantics
  - deactivation effects
  - Shariah workflow states
- patch any remaining doc drift under `PBI-082` before wider UI execution proceeds

Preflight exit condition:
- frontend runway is explicitly approved
- backend contracts are treated as canonical input
- blocked UI PBIs selected for Sprint 3 are correctly reclassified in the backlog
- no UI task begins from undefined request/response or authorization assumptions

## 5. Entry gates before Sprint 3 waves

Sprint 3 frontend build work starts only after these baseline docs exist and remain authoritative:
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- `API_CONTRACTS.md`
- `STATE_MODELS.md`
- `SPRINT2_TASKS.md`
- `SPRINT3_TASKS.md`
- latest `backlog.xlsx`

Critical unresolved flags must still be tracked explicitly, not hidden:
- `FLAG-FRONTEND-RUNWAY`
- `FLAG-ACTOR-SOURCE`
- `FLAG-AUDIT-POLICY`
- `FLAG-PROTECTED-FUNCTIONS`
- `FLAG-CHECKLIST-SOURCE`
- `FLAG-CONDITIONAL-APPROVAL`
- `FLAG-READ-AUDIT`
- any remaining UI-consumption assumption not yet frozen in the durable docs

## 6. Current Sprint 3 planning baselines

Current working baselines:
- backend prerequisites for the blocked review-workflow UI lane are materially satisfied from Sprint 2
- frontend runway is now decision-ready and must be executed explicitly before UI PBIs are resumed
- frontend must consume the standardized error envelope rather than invent route-specific handling
- frontend must treat actor identity as server-derived for protected actions and must not send client-authored identity for protected writes
- frontend must honor backend state and deactivation rules exactly as documented
- UI work may proceed slice-by-slice once the frontend boundary, contract-consumer pattern, and documentation alignment are in place

These baselines are usable for Sprint 3 planning, but any still-open flag must remain visible and must not be resolved silently in UI code.

## 7. Wave plan

### Wave 0 — frontend runway approval and governance alignment

Goal:
- formally open the frontend lane without letting UI work invent architecture or contract semantics

Tasks:
- PBI-079 investigate governed frontend runway for repository-aligned UI work
- PBI-082 align architecture and coding guidance for governed frontend boundary

Dependencies:
- Sprint 2 backend prerequisite objective accepted as materially achieved
- latest durable docs are authoritative
- blocked UI tasks are not yet treated as active implementation items until runway approval is complete

Exit condition:
- frontend runway is explicitly approved
- frontend boundary rules are documented
- Sprint 3 UI work has one governed execution model

### Wave 1 — frontend boundary and contract-consumer foundation

Goal:
- create the actual frontend execution surface and shared contract-consumer pattern

Tasks:
- PBI-080 enable governed frontend application boundary for future Sprint UI work
- PBI-081 define contract-consumer pattern and member onboarding page shell for future UI work

Dependencies:
- Wave 0 exit condition satisfied
- frontend boundary is repo-aligned
- backend contracts are stable enough for frontend consumption
- no ad hoc fetch logic is introduced outside the agreed client/request seam

Exit condition:
- frontend can run/build/test inside the repo
- one reusable request/error consumption pattern exists
- the first page shell proves the boundary is real

### Wave 2 — member organization and role catalog UI

Goal:
- resume the simplest blocked UI slices first using stable backend contracts

Tasks:
- PBI-041 implement administrator registration UI and error feedback for member onboarding
- PBI-046 implement administrator role management UI and system feedback

Dependencies:
- Wave 1 exit condition satisfied
- member organization duplicate conflict behavior is already stable from Sprint 2 backend work
- role management backend contract is stable enough for UI consumption
- success/error states reflect backend semantics, including `pendingReview` and conflict responses where relevant

Exit condition:
- admins can perform member onboarding and role catalog actions through the governed frontend boundary
- UI behavior matches backend request/response and validation semantics

### Wave 3 — role assignment UI

Goal:
- resume role-assignment UI only after the backend validation and authorization semantics are stable

Tasks:
- PBI-051 implement administrator role-assignment UI and operational feedback

Dependencies:
- Wave 1 exit condition satisfied
- role-assignment backend slice from Sprint 2 is complete enough for invalid-user, non-member, invalid-role, duplicate-active-assignment, and authorization behavior
- UI uses backend-driven validation and error responses rather than local rule duplication

Exit condition:
- assignment UI can create/change/remove assignments against the stable backend contract
- error handling is contract-driven and testable

### Wave 4 — deactivation-aware UI guards

Goal:
- reflect protected-function and deactivation behavior in the frontend without replacing backend enforcement

Tasks:
- PBI-056 integrate protected endpoints and UI guards with deactivation checks

Dependencies:
- protected-function matrix and deactivation-rule definition are available from Sprint 2
- role-assignment/backend access semantics are stable enough to drive realistic guarded behavior
- UI hiding/blocking is treated as secondary to backend enforcement

Exit condition:
- blocked actions are visibly guarded in the UI
- backend remains the source of truth for final permission enforcement

### Wave 5 — review submission UI

Goal:
- open the first frontend slice of the Shariah workflow on top of the completed backend submission flow

Tasks:
- PBI-061 implement coordinator submission UI and validation feedback for review requests

Dependencies:
- Wave 1 exit condition satisfied
- submission contract is canonical and actor identity is server-derived
- standardized validation envelope is available for UI consumption
- submission authorization semantics are stable enough from Sprint 2

Exit condition:
- coordinator can submit review requests from the governed UI boundary
- validation and error handling follow the backend contract exactly

### Wave 6 — checklist and decision UI

Goal:
- continue the Shariah frontend flow through checklist and decision capture

Tasks:
- PBI-066 implement reviewer checklist UI and incomplete-entry feedback
- PBI-071 implement reviewer decision UI and status feedback

Dependencies:
- checklist, decision, and supporting backend auth/audit/state-guard slices are complete enough
- checklist source assumptions are explicit
- conditional-approval requirements remain visible in the durable docs
- UI does not infer hidden workflow rules outside the backend/state model

Exit condition:
- reviewer can complete checklist and record decision through the UI
- frontend reflects incomplete, invalid, and conditional states correctly

### Wave 7 — status/history UI

Goal:
- finish the visible review-workflow lane with current-status and history consumption

Tasks:
- PBI-076 implement coordinator status-history UI and empty or intermediate-state handling

Dependencies:
- backend status-history API and read semantics are complete enough
- read-history contract and intermediate-state behavior are documented
- read-audit assumptions remain explicit where still provisional

Exit condition:
- coordinator can view current status and history safely for complete and incomplete review items
- frontend consumes backend progression states without inventing alternate timeline logic

## 8. Parallelism rules

Allowed:
- documentation alignment in parallel with non-conflicting frontend scaffold work
- member onboarding UI and role-management UI in parallel once the frontend boundary is stable
- checklist and decision UI in parallel only after their backend contracts and state rules are stable
- status/history UI in parallel with low-risk visual work once the read model is fixed

Not allowed:
- start any blocked UI task before the frontend-runway chain is approved
- let frontend code redefine backend contracts, actor semantics, error envelopes, or workflow states
- implement UI-only authorization logic as the sole enforcement mechanism
- hardcode assumptions for checklist source, conditional approval, or protected-function behavior outside durable docs

## 9. Repo-scope execution note

Current working assumption:
- Sprint 3 opens the frontend lane inside the same governed repo
- frontend must consume backend contracts and state rules already stabilized through Sprint 2
- backend remains the source of truth for business rules, protected-action enforcement, and workflow transitions
- frontend work in Sprint 3 should bias toward blocked-but-now-ready UI PBIs rather than inventing new frontend-only scope

## 10. Aider task template

For each task session use this structure:

### Task header
- Task ID:
- Goal:
- In scope:
- Out of scope:
- Files to prefer:
- Dependencies already satisfied:
- Open flags still relevant:
- Acceptance criteria:
- Required tests:
- Required doc updates:

### Ask step
Request file plan only.

### Code step
Edit only the minimum files needed for that task.

### Closeout step
- run tests
- review diff
- update durable docs if contract-consumption, request/error handling, or dependency behavior changed
- verify no flagged assumption was silently expanded in frontend code

## 11. Story-level done gates

A story is not done until:
- implementation tasks pass
- backend contract consumption is correct
- UI validation/error states align to documented backend behavior
- documentation is updated where frontend boundary or contract-consumption behavior changed
- evidence task is complete where required
- no blocked prerequisite remains open for the story being claimed complete

## 12. Flag impact map

### `FLAG-FRONTEND-RUNWAY`
Blocks:
- PBI-080
- PBI-081
- PBI-041
- PBI-046
- PBI-051
- PBI-056
- PBI-061
- PBI-066
- PBI-071
- PBI-076

### `FLAG-ACTOR-SOURCE`
Touches:
- PBI-081
- PBI-061
- any protected-write UI flow that must not send client-authored actor identity

### `FLAG-AUDIT-POLICY`
Touches:
- frontend evidence expectations where sensitive reads/writes have audit implications
- UI guidance/documentation, but backend remains the enforcement source

### `FLAG-PROTECTED-FUNCTIONS`
Touches:
- PBI-056
- any UI guard behavior for protected actions

### `FLAG-CHECKLIST-SOURCE`
Touches:
- PBI-066

### `FLAG-CONDITIONAL-APPROVAL`
Touches:
- PBI-071

### `FLAG-READ-AUDIT`
Touches:
- PBI-076

## 13. Recommended first execution sequence

1. PBI-079
2. PBI-082
3. PBI-080
4. PBI-081
5. PBI-041
6. PBI-046
7. PBI-051
8. PBI-056
9. PBI-061
10. PBI-066
11. PBI-071
12. PBI-076

Rationale:
- approve and govern the frontend lane before writing UI code
- create the real frontend boundary and request-consumer seam before feature work
- start with the simplest blocked UI slices first
- only then move into more dependency-heavy review-workflow UIs
- keep frontend strictly contract-driven and backend-consumptive throughout