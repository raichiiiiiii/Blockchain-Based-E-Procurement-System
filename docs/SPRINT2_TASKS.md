# Sprint 2 Tasks

Status: Draft execution sheet  
Owner: Scrum Master / Tech Lead  
Last updated: 2026-03-25

## 1. Sprint objective

Build the minimum backend-unblocking and backend-completion slice for:
- close the member-organization uniqueness defect
- unblock and complete backend role-assignment validation
- establish trusted actor and audit foundations for protected backend actions
- continue backend-only Shariah review workflow execution through checklist, decisioning, and status-history read services
- keep blocked UI work visible, but out of the active execution lane unless frontend runway is explicitly approved

## 2. Operating rules

- Granular tasks, not stories, are the execution unit.
- Each Aider session must target one task only.
- Each task must use the durable docs and latest backlog as source of truth, not earlier chat memory.
- No task may silently turn a provisional assumption into hidden permanent behavior.
- Any code change that affects contract, state, dependency, auth, or audit behavior must update the durable docs in the same task or the immediate follow-up task.
- Sprint 2 is backend-first. Blocked UI tasks remain non-committed unless the frontend-runway decision chain is explicitly approved.

## 3. Carry-over and blocker handling rule

Sprint 2 may proceed with carry-over work only when:
- blocked items are either explicitly unblocked by prerequisite PBIs or kept out of the active wave
- partial implementation already completed in Sprint 1 is preserved and not re-opened without cause
- new blocker-resolution PBIs are treated as real Sprint work, not informal side notes
- story closure is not claimed when a known defect or missing dependency still breaks the story intent

## 4. Preflight repairs

These repairs should be applied before Wave 0 execution is treated as clean:

- reconcile Sprint 1 statuses, evidence notes, and blocker notes in the backlog (`PBI-097`)
- stand up repository-enforced quality gates for install, test, and build (`PBI-092`)
- replace fragile explicit-file test execution with safe test discovery (`PBI-093`)
- patch durable docs where Sprint 1 implementation drift is already known (`PBI-094` follow-up after key decisions)

Preflight exit condition:
- backlog state matches repository reality closely enough for planning
- CI/test execution is enforceable and repeatable
- known drift between durable docs and implementation is captured and queued, not hidden

## 5. Entry gates before Sprint 2 waves

Sprint 2 backend build work starts only after these baseline docs exist and remain authoritative:
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- `API_CONTRACTS.md`
- `STATE_MODELS.md`
- `SPRINT1_TASKS.md`
- `SPRINT2_TASKS.md`
- latest `backlog.xlsx`

Critical unresolved flags must be tracked explicitly, not hidden:
- `FLAG-FRONTEND-RUNWAY`
- `FLAG-MEMBERSHIP-UNIQUENESS`
- `FLAG-USER-IDENTITY`
- `FLAG-ASSIGNMENT-MULTIPLICITY`
- `FLAG-ACTOR-SOURCE`
- `FLAG-AUDIT-POLICY`
- `FLAG-PROTECTED-FUNCTIONS`
- `FLAG-CHECKLIST-SOURCE`
- `FLAG-CONDITIONAL-APPROVAL`
- `FLAG-READ-AUDIT`
- `FLAG-ERROR-ENVELOPE`

## 6. Current Sprint 2 planning baselines

Current working baselines:
- member organization uniqueness baseline remains `registrationNumber`, but implementation is not complete until `PBI-083`
- frontend runway remains unapproved; UI tasks stay blocked behind `PBI-079`
- role assignment create-path exists partially, but invalid-user and non-member rejection remain blocked until `PBI-084` and `PBI-085`
- trusted actor context is not yet approved; protected actions still need an auth-derived actor decision (`PBI-086`)
- audit policy for denied protected actions is not yet standardized (`PBI-090`)
- backend review-submission flow exists materially enough to continue backend-only review work
- checklist, decision, and read-history backend work may proceed only through backend tasks first; UI tasks remain blocked by frontend-runway decisions
- deactivation wave should not proceed beyond definition and backend-only work until protected-function categories are explicit (`PBI-095`)

These baselines are usable for Sprint 2 planning, but they remain revisable where flagged.

## 7. Wave plan

### Wave 0 — backlog integrity and quality gate

Goal:
- make Sprint 2 execution trustworthy before feature carry-over continues

Tasks:
- PBI-097 reconcile Sprint 1 backlog state
- PBI-092 enable CI workflow
- PBI-093 replace explicit-file test script
- optional early doc patching under PBI-094 where implementation drift is already known

Exit condition:
- planning is based on current backlog truth
- repository quality gates no longer depend on local-only execution
- test omission risk is removed

### Wave 1 — membership defect closure

Goal:
- close the open uniqueness defect on member-organization creation and unblock clean story acceptance

Tasks:
- PBI-083 fix duplicate member organization creation by registrationNumber

Dependencies:
- current membership create flow remains passing
- conflict response semantics are reflected in tests and API notes if changed

Exit condition:
- duplicate creation attempts are rejected correctly
- PBI-031 can move toward clean closure

### Wave 2 — role-assignment unblockers

Goal:
- resolve the missing source of truth for user identity and organization membership required by assignment validation

Tasks:
- PBI-098 analyze current assignment validation gap and unresolved flags
- PBI-099 map ownership candidates and lookup boundary options
- PBI-100 produce approved identity and membership lookup contract proposal
- PBI-101 implement lookup ports for user existence and organization membership
- PBI-102 implement initial adapters or test seams for the lookup ports

Dependencies:
- backlog reconciliation complete enough to trust blocker notes
- no placeholder logic is accepted for invalid-user or non-member checks

Exit condition:
- the team can determine whether a user exists
- the team can determine whether a user belongs to an organization
- PBI-050 can resume without fake validation logic

### Wave 3 — complete backend role-assignment slice

Goal:
- finish backend role-assignment validation and evidence without reopening blocked UI work

Tasks:
- PBI-103 integrate lookup ports into role-assignment validation flow
- PBI-104 add automated tests, docs, and evidence for resumed assignment validation
- PBI-050 assignment service completion
- PBI-052 permissions, audit, and invalid-assignment prevention
- PBI-053 validation, docs, and evidence

Dependencies:
- Wave 2 exit condition satisfied
- assignment multiplicity rules remain explicit
- no UI dependency is introduced into backend completion

Exit condition:
- backend role-assignment service satisfies its remaining AC
- story can progress without dependence on blocked UI work

### Wave 4 — trusted actor and audit foundations

Goal:
- establish secure, reusable foundations for protected backend actions

Tasks:
- PBI-105 inventory current actor-source usage in protected routes and audits
- PBI-106 produce approved trusted actor-context and migration proposal
- PBI-107 implement shared request actor context boundary
- PBI-108 refactor protected backend consumers to use trusted actor context
- PBI-109 test and document trusted actor context integration
- PBI-110 inventory current audit behavior for success and denied protected actions
- PBI-111 produce approved denied-action audit policy
- PBI-091 apply uniform audit policy across protected routes
- PBI-088 tighten review-submission authorization
- PBI-096 harden role-assignment creation authorization

Dependencies:
- no reliance on client-supplied actor identity for trusted authorization after the actor-boundary decision
- denied-action audit behavior must be explicitly approved before broad route hardening

Exit condition:
- protected backend routes consume trusted actor context
- audit behavior for denied actions is no longer inconsistent
- authorization hardening for review submission and assignment creation is implementable

### Wave 5 — backend-only Shariah workflow continuation

Goal:
- continue the backend Shariah flow through checklist, decision, and status-history without waiting for blocked UI tasks

Tasks:
- PBI-064 define checklist structure
- PBI-065 checklist API and persistence
- PBI-067 checklist auth, audit, and state guards
- PBI-069 define decision states
- PBI-070 decision API and logic
- PBI-072 decision auth, audit, and invalid-state prevention
- PBI-074 define status-history query model
- PBI-075 status-history API and current-status query service
- optional PBI-089 error-envelope standardization if backend API consistency work is pulled this sprint

Dependencies:
- review submission baseline remains stable enough from Sprint 1
- checklist source, conditional approval, and read-audit assumptions remain explicit where unresolved
- blocked UI tasks PBI-066, PBI-071, PBI-076 are not treated as silent prerequisites for backend completion

Exit condition:
- backend review workflow can progress beyond submission into checklist, decision, and read-history
- frontend blockage does not prevent backend advancement

### Wave 6 — deactivation-definition carry-over

Goal:
- define enough deactivation behavior to make later backend enforcement realistic

Tasks:
- PBI-117 inventory protected functions and deactivation effects
- PBI-118 produce approved protected-function matrix and carry-over implementation map
- PBI-054 define deactivation rules
- optional carry-over into PBI-055 and PBI-057 only if role-assignment dependency is satisfied and matrix approval is complete

Dependencies:
- role-assignment backend slice is complete enough for realistic access checks
- actor and audit foundations are stable enough for protected-action behavior

Exit condition:
- protected-function matrix exists
- deactivation enforcement can enter implementation without another semantic deadlock

## 8. Parallelism rules

Allowed:
- CI and test-discovery work in parallel with backlog reconciliation
- actor-boundary Spike and audit-policy Spike in parallel
- backend review continuation in parallel with role-assignment completion once it does not depend on blocked UI work
- doc refresh in parallel with non-conflicting implementation after the relevant decision is approved

Not allowed:
- start blocked UI tasks unless the frontend-runway decision chain is explicitly approved
- resume assignment validation using placeholder identity or membership logic
- harden protected-route authorization while actor source of truth remains undefined
- let backend read or decision semantics drift from durable state/contract docs
- treat story closure as complete when known blockers or defects still contradict the story intent

## 9. Repo-scope execution note

Current working assumption:
- backend implementation in this repo remains the primary governed work surface
- UI-labeled PBIs remain visible but blocked until frontend runway is approved
- Sprint 2 commitment should bias toward backend-only items, blocker-resolution items, bugs, and enablers
- frontend work, if later approved, must consume backend contracts and must not redefine them

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
- update durable docs if contract/state/dependency/auth/audit behavior changed
- verify no flagged assumption was silently expanded

## 11. Story-level done gates

A story is not done until:
- implementation tasks pass
- security/audit slice is implemented where required
- documentation is updated
- evidence task is complete
- state model and API contract remain accurate
- any blocker-related follow-up bug or prerequisite required by the story is closed or explicitly accepted as carry-over

## 12. Flag impact map

### `FLAG-FRONTEND-RUNWAY`
Blocks:
- PBI-041
- PBI-046
- PBI-051
- PBI-056
- PBI-061
- PBI-066
- PBI-071
- PBI-076
- and evidence tasks that require those UI slices for full closure

### `FLAG-MEMBERSHIP-UNIQUENESS`
Blocks:
- PBI-031 clean closure
- PBI-083
- any resumed consumer expecting duplicate conflict behavior

### `FLAG-USER-IDENTITY`
Blocks:
- PBI-050
- PBI-052
- PBI-053
- PBI-055
- PBI-096

### `FLAG-ASSIGNMENT-MULTIPLICITY`
Touches:
- PBI-049
- PBI-050
- PBI-052
- PBI-053

### `FLAG-ACTOR-SOURCE`
Blocks:
- PBI-087
- PBI-088
- PBI-091
- PBI-096
- PBI-094 updates related to actor handling

### `FLAG-AUDIT-POLICY`
Blocks or touches:
- PBI-091
- PBI-095
- PBI-054
- PBI-055
- PBI-057
- PBI-067
- PBI-072
- PBI-077
- PBI-094 audit-alignment work

### `FLAG-PROTECTED-FUNCTIONS`
Blocks:
- PBI-054
- PBI-055
- PBI-057
- PBI-058
- PBI-095

### `FLAG-CHECKLIST-SOURCE`
Touches:
- PBI-064
- PBI-065
- PBI-067
- PBI-068

### `FLAG-CONDITIONAL-APPROVAL`
Touches:
- PBI-069
- PBI-070
- PBI-072
- PBI-073

### `FLAG-READ-AUDIT`
Touches:
- PBI-074
- PBI-075
- PBI-077
- PBI-078

### `FLAG-ERROR-ENVELOPE`
Touches:
- PBI-089
- backend API routes that currently return heterogeneous validation shapes

## 13. Recommended first execution sequence

1. PBI-097
2. PBI-092
3. PBI-093
4. PBI-083
5. PBI-098
6. PBI-099
7. PBI-100
8. PBI-101
9. PBI-102
10. PBI-103
11. PBI-104
12. PBI-050
13. PBI-052
14. PBI-105
15. PBI-106
16. PBI-110
17. PBI-111
18. PBI-107
19. PBI-108
20. PBI-109
21. PBI-088
22. PBI-096
23. PBI-064
24. PBI-065
25. PBI-067
26. PBI-069
27. PBI-070
28. PBI-072
29. PBI-074
30. PBI-075
31. PBI-117
32. PBI-118
33. PBI-054

Rationale:
- clean the planning surface first
- fix the open membership defect early
- unblock and finish backend role assignment before adding more access-dependent work
- settle actor and audit foundations before hardening protected routes
- continue backend-only Shariah work without being held hostage by blocked UI items
- leave frontend-runway and frontend tasks visible, but outside active backend-first commitment
