# Sprint 5 Tasks

Status: Draft execution sheet  
Owner: Scrum Master / Tech Lead  
Last updated: YYYY-MM-DD

## 1. Sprint objective

Build the minimum governed frontend extension for **PBI-022 ¿ Access logging and cryptographic non-repudiation** so that the feature becomes a usable auditor-facing workflow, not only a backend audit capability.

Sprint 5 extends `PBI-022` through the following proposed frontend stories:
- **PBI-138 ¿ auditor access-history search UI**
- **PBI-139 ¿ auditor event-detail inspection UI**
- **PBI-140 ¿ auditor chronological sequence/timeline UI**

This sprint is a deliberate scope extension to finish `PBI-022` in the same actor-facing style previously used for workflow features such as `PBI-003` and `PBI-020`.

## 2. Operating rules

- Granular tasks, not stories, are the execution unit.
- Each Aider session must target one task only.
- Each task must use the durable docs and latest `backlog/backlog.csv` as source of truth, not earlier chat memory.
- No task may silently redefine backend audit payload, ordering, non-repudiation evidence semantics, authorization rules, or incomplete-sequence behavior.
- Frontend must consume the completed backend contracts from `PBI-120`, `PBI-121`, and `PBI-122`.
- Any change that affects UI contract consumption, error handling, state behavior, or evidence semantics must update durable docs in the same task or the immediate follow-up task.

## 3. Carry-over and scope-extension rule

Sprint 5 may proceed only when:
- the team explicitly accepts that `PBI-022` is being extended into a frontend-complete investigation workflow
- the proposed frontend stories are added to the backlog before execution begins
- backend `PBI-120` and `PBI-121` are complete enough for UI consumption
- `PBI-122` is complete enough, or stabilized enough, for detail/sequence UI consumption
- the sprint does not reopen backend semantics already settled in Sprint 4

Sprint 5 is not meant to replace the next repo-planned features. It is meant to close the workflow gap that currently remains if `PBI-022` is treated as backend-only.

## 4. Preflight repairs

These repairs should be applied before Wave 0 execution is treated as clean:

- add the proposed frontend extension rows to `backlog/backlog.csv`:
  - `PBI-138`
  - `PBI-139`
  - `PBI-140`
  - `PBI-141`
  - `PBI-142`
  - `PBI-143`
  - `PBI-144`
  - `PBI-145`
  - `PBI-146`
  - `PBI-147`
  - `PBI-148`
- update `PBI-022` notes so the team is explicit whether:
  - backend completion alone is sufficient, or
  - frontend investigation workflow is also required before final closure
- confirm the latest durable docs are authoritative for:
  - access-history query contract
  - event-detail payload
  - sequence ordering semantics
  - incomplete-sequence behavior
  - backend authorization and error-envelope behavior

Preflight exit condition:
- the proposed UI extension is visible in the backlog
- backend contracts are frozen enough for frontend consumption
- story/task ownership is explicit
- the team is not depending on chat memory for UI behavior

## 5. Entry gates before Sprint 5 waves

Sprint 5 build work starts only after these baseline docs exist and remain authoritative:
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- `API_CONTRACTS.md`
- `STATE_MODELS.md`
- `SPRINT5_TASKS.md`
- latest `backlog/backlog.csv`

Critical unresolved flags must be tracked explicitly, not hidden:
- `FLAG-AUDIT-SEARCH-UI`
- `FLAG-AUDIT-DETAIL-UI`
- `FLAG-AUDIT-SEQUENCE-UI`
- `FLAG-INCOMPLETE-SEQUENCE-UX`
- `FLAG-AUDIT-ERROR-HANDLING-UI`

## 6. Current Sprint 5 planning baselines

Current working baselines:
- backend `PBI-022` work already provides:
  - event recording
  - access-history query API
  - event-detail retrieval
  - chronological sequence retrieval
- Sprint 5 is frontend-consumer work on top of those backend capabilities
- search UI should begin first
- event-detail UI should come before sequence/timeline UI
- incomplete-sequence and missing-event handling must be explicit in the UI
- frontend must not invent alternate audit meanings or alternate ordering logic

Refined decomposition baseline:
- `PBI-138` closes through `PBI-141`, `PBI-142`, `PBI-143`
- `PBI-139` closes through `PBI-144`, `PBI-147`
- `PBI-140` closes through `PBI-145`, `PBI-146`, `PBI-148`

## 7. Wave plan

### Wave 0 ¿ backlog and workflow alignment

Goal:
- formalize the frontend extension of `PBI-022` before implementation begins

Tasks:
- add `PBI-138` to `PBI-148` to the backlog
- confirm whether `PBI-022` remains open until frontend extension is complete
- confirm durable docs are sufficient for UI consumption

Dependencies:
- Sprint 4 backend work is complete enough for contract consumption
- no open backend ambiguity remains in payload, ordering, or sequence semantics

Exit condition:
- frontend extension rows exist in the backlog
- closure rule for `PBI-022` is explicit
- UI execution can proceed without hidden contract decisions

### Wave 1 ¿ auditor access-history search UI

Goal:
- deliver the first usable auditor-facing investigation screen

Tasks:
- `PBI-141` ¿ implement auditor access-history search UI and supported filter controls
- `PBI-142` ¿ implement auditor search authorization, empty-state, and validation/error feedback
- `PBI-143` ¿ execute auditor search UI validation, documentation updates, and demo evidence

Dependencies:
- backend query contract from `PBI-121` is complete and stable
- frontend request/response seam exists and is aligned to backend error-envelope behavior

Exit condition:
- `PBI-138` is complete
- auditors can search access history from the UI
- success, empty, invalid, and denied states are covered and evidenced

### Wave 2 ¿ auditor event-detail inspection UI

Goal:
- make individual audit events inspectable from the frontend

Tasks:
- `PBI-144` ¿ implement auditor event-detail inspection UI and evidence display
- `PBI-147` ¿ execute auditor event-detail UI validation, documentation updates, and demo evidence

Dependencies:
- `PBI-138` complete
- backend event-detail contract from `PBI-122` is stable enough for UI consumption

Exit condition:
- `PBI-139` is complete
- auditors can inspect event-level evidence from the UI
- missing/unavailable event behavior is reviewable and evidenced

### Wave 3 ¿ auditor sequence/timeline UI

Goal:
- complete the visible investigation workflow with chronological sequence inspection

Tasks:
- `PBI-145` ¿ implement auditor sequence/timeline UI and navigation from detail inspection
- `PBI-146` ¿ implement missing-event, incomplete-sequence, and authorization handling for event inspection UI
- `PBI-148` ¿ execute auditor sequence UI validation, documentation updates, and demo evidence

Dependencies:
- `PBI-139` complete enough to hand off into sequence inspection
- sequence ordering and incomplete-chain semantics are stable in backend contracts

Exit condition:
- `PBI-140` is complete
- auditors can view chronological access sequences from the UI
- incomplete or limited chains are rendered safely and non-misleadingly

### Wave 4 ¿ PBI-022 closure reconciliation

Goal:
- reconcile whether `PBI-022` may now be treated as workflow-complete

Tasks:
- review backlog state for:
  - `PBI-138`
  - `PBI-139`
  - `PBI-140`
  - `PBI-022`
- verify evidence and docs for search, detail, and sequence UI flows
- confirm whether PO wants `PBI-022` closed now as frontend-complete workflow

Dependencies:
- Waves 1 to 3 complete
- no UI child tasks remain open
- documentation and evidence are attached

Exit condition:
- the auditor-facing extension of `PBI-022` is complete
- backlog closure decision for `PBI-022` is explicit and reviewable

## 8. Parallelism rules

Allowed:
- `PBI-142` may run in parallel with late `PBI-141` implementation if the search contract is stable
- `PBI-147` prep may begin in parallel with late `PBI-144` polish
- `PBI-146` may begin while `PBI-145` is stabilizing, if sequence semantics are already frozen
- documentation updates may proceed in parallel with non-conflicting frontend work

Not allowed:
- start event-detail UI before the search flow is stable enough to hand off context
- start sequence/timeline UI before detail inspection behavior is stable
- hardcode alternate UI semantics for audit evidence, ordering, or incomplete-chain interpretation
- collapse all three stories into one large UI task blob

## 9. Repo-scope execution note

Current working assumption:
- Sprint 5 is a deliberate extension sprint for `PBI-022`
- this work is not the same thing as the next already-planned repo feature lane
- frontend in Sprint 5 must consume completed backend audit APIs
- backend remains the source of truth for investigation semantics
- this sprint should finish the auditor-facing workflow cleanly rather than partially opening multiple new features

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
- update durable docs if frontend contract consumption, evidence rendering, or dependency behavior changed
- verify no flagged assumption was silently expanded

## 11. Story-level done gates

A story is not done until:
- implementation tasks pass
- frontend behavior matches backend contract semantics
- documentation is updated
- evidence task is complete
- no still-open child task contradicts story closure
- success, empty, invalid, missing, incomplete, and denied states are handled where applicable

## 12. Flag impact map

### `FLAG-AUDIT-SEARCH-UI`
Blocks:
- `PBI-138`
- `PBI-141`
- `PBI-142`
- `PBI-143`

### `FLAG-AUDIT-DETAIL-UI`
Blocks:
- `PBI-139`
- `PBI-144`
- `PBI-147`

### `FLAG-AUDIT-SEQUENCE-UI`
Blocks:
- `PBI-140`
- `PBI-145`
- `PBI-146`
- `PBI-148`

### `FLAG-INCOMPLETE-SEQUENCE-UX`
Touches:
- `PBI-140`
- `PBI-146`
- `PBI-148`

### `FLAG-AUDIT-ERROR-HANDLING-UI`
Touches:
- `PBI-138`
- `PBI-139`
- `PBI-140`
- `PBI-142`
- `PBI-146`

## 13. Recommended first execution sequence

1. add `PBI-138` to `PBI-148` to the backlog
2. `PBI-141`
3. `PBI-142`
4. `PBI-143`
5. `PBI-144`
6. `PBI-147`
7. `PBI-145`
8. `PBI-146`
9. `PBI-148`

Rationale:
- make the scope extension explicit first
- start with search UI because it is the first operational entry point
- then complete event-detail inspection
- then complete sequence/timeline behavior
- end with closure reconciliation for the full auditor-facing workflow
