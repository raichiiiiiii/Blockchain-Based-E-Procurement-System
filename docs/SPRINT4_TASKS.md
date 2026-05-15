# Sprint 4 Tasks

Status: Draft execution sheet  
Owner: Scrum Master / Tech Lead  
Last updated: YYYY-MM-DD

## 1. Sprint objective

Build the minimum implementable and reviewable slice for:

- **PBI-022 ¿ Access logging and cryptographic non-repudiation**
- complete the feature through:
  - **PBI-120 ¿ protected access event recording**
  - **PBI-121 ¿ auditor search over access history**
  - **PBI-122 ¿ event-level evidence and chronological sequence inspection**

This sprint is focused on turning the already-refined `R22` feature into a usable backend audit capability, not just enabling groundwork. The current refinement says the split is approved, `PBI-120` is the correct first story, and `PBI-022` should remain in progress until all three stories are completed and validated. :contentReference[oaicite:0]{index=0}

## 2. Operating rules

- Granular tasks, not stories, are the execution unit.
- Each Aider session must target one task only.
- Each task must use the durable docs and latest backlog as source of truth, not earlier chat memory.
- No task may silently redefine audit scope, evidence semantics, or backend response contracts.
- Any code change that affects audit payload, event schema, request correlation, ordering, or evidence semantics must update the durable docs in the same task or the immediate follow-up task.
- Sprint 4 is backend-security and audit focused. UI work is not part of the active lane for this feature unless later explicitly pulled.

## 3. Carry-over and feature-completion rule

Sprint 4 may proceed with `PBI-022` only when:
- the feature remains explicitly **In Progress**
- `PBI-120`, `PBI-121`, and `PBI-122` are treated as the minimum story set for full feature completion
- the team does not claim feature closure after recording-only work
- query and evidence-inspection stories are decomposed and executed, not left as planning placeholders

The current refinement memo is explicit that `PBI-022` is not fully decomposed until `PBI-121` and `PBI-122` also have child tasks, and that the feature should remain in progress until all three stories are completed and validated. :contentReference[oaicite:1]{index=1}

## 4. Preflight repairs

These repairs should be applied before Wave 0 execution is treated as clean:

- confirm the backlog reflects:
  - `PBI-022 = In Progress`
  - `PBI-120 = Ready for refinement / near Sprint-ready`
  - `PBI-121` and `PBI-122` now have their child-task decomposition
- verify durable docs are ready to carry:
  - minimum audit payload
  - MVP interpretation of ¿cryptographic or equivalent non-repudiation evidence¿
  - search/query contract behavior
  - event-detail and sequence inspection behavior
- ensure no open task still assumes a blank policy space for audit payload or event evidence

Preflight exit condition:
- the feature is fully decomposed
- execution order is agreed
- MVP evidence semantics are explicit enough that no task must invent them ad hoc

## 5. Entry gates before Sprint 4 waves

Sprint 4 build work starts only after these baseline docs exist and remain authoritative:
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- `API_CONTRACTS.md`
- `STATE_MODELS.md`
- `SPRINT4_TASKS.md`
- latest `backlog.xlsx`

Critical unresolved flags must be tracked explicitly, not hidden:
- `FLAG-AUDIT-PAYLOAD-MVP`
- `FLAG-NONREPUDIATION-EVIDENCE-MVP`
- `FLAG-SENSITIVE-READ-CAPTURE-SCOPE`
- `FLAG-AUDIT-QUERY-ORDERING`
- `FLAG-AUDIT-SEQUENCE-CHAINING`

## 6. Current Sprint 4 planning baselines

Current working baselines:
- `PBI-022` is a foundational MVP security/compliance feature under `R22`
- the approved feature split is:
  - `PBI-120` recording baseline
  - `PBI-121` auditor search/query
  - `PBI-122` event-detail and sequence inspection
- `PBI-120` is the correct first implementation story
- `PBI-123` is the recommended first task
- `PBI-121` and `PBI-122` are now treated as fully decomposed through:
  - `PBI-128` to `PBI-132`
  - `PBI-133` to `PBI-137`

The refinement memo also recommends that `PBI-123` explicitly define the MVP minimum evidence set, including actor ID, trusted actor-context source, target type/id, action, outcome, timestamp, request/correlation ID, schema version, event hash or payload hash, and optional previous-event hash if chain-style evidence is adopted. If real signatures/certificates/key infrastructure are out of scope, that must be stated clearly. 

## 7. Wave plan

### Wave 0 ¿ audit feature contract freeze

Goal:
- freeze the minimum event payload, capture scope, and MVP non-repudiation interpretation needed for implementation

Tasks:
- `PBI-123` ¿ capture matrix and minimum event payload contract

Dependencies:
- `PBI-022` remains active
- the team accepts that this is a real implementation prerequisite, not a lightweight note task
- MVP evidence scope is explicitly bounded

Exit condition:
- in-scope governed writes, denied protected actions, and selected sensitive reads are explicitly mapped
- minimum event payload is explicit
- MVP non-repudiation interpretation is explicit

### Wave 1 ¿ recording baseline

Goal:
- implement the stable event-capture path and complete the recording story

Tasks:
- `PBI-124` ¿ shared audit event capture and persistence seam
- `PBI-125` ¿ governed writes and denied protected actions
- `PBI-126` ¿ selected sensitive-read audit capture
- `PBI-127` ¿ validation, regression, docs, and evidence closure for `PBI-120`

Dependencies:
- Wave 0 complete
- no route-by-route ad hoc audit payload invention
- selected sensitive-read capture scope is explicit

Exit condition:
- `PBI-120` is complete
- governed writes, denied protected actions, and selected sensitive reads are recorded with approved evidence fields
- story-level evidence and docs are complete

### Wave 2 ¿ auditor search/query

Goal:
- make recorded audit events retrievable in a stable, usable query model

Tasks:
- `PBI-128` ¿ define access-history query contract and supported filters
- `PBI-129` ¿ implement access-history query repository/read model
- `PBI-130` ¿ expose auditor access-history query API
- `PBI-131` ¿ validate query filters, ordering, empty results, and authorization
- `PBI-132` ¿ document access-history query behavior and evidence

Dependencies:
- `PBI-120` complete enough that query consumes a stable event model
- query filters and ordering semantics are explicit
- authorization for audit-history query is implemented, not implied

Exit condition:
- `PBI-121` is complete
- auditors can search by actor, target, action, outcome, and time range
- empty results and authorization behavior are stable and documented

### Wave 3 ¿ event detail and sequence inspection

Goal:
- make event-level evidence and chronological sequence inspection usable for investigation

Tasks:
- `PBI-133` ¿ define event-detail and sequence inspection contract
- `PBI-134` ¿ implement event-detail retrieval by event ID
- `PBI-135` ¿ implement chronological sequence retrieval by actor or target
- `PBI-136` ¿ harden incomplete-sequence and missing-event handling
- `PBI-137` ¿ validate non-repudiation evidence inspection and document evidence

Dependencies:
- `PBI-121` complete enough that inspection builds on a stable retrieval model
- incomplete-sequence behavior is defined explicitly
- evidence fields exposed by detail/sequence retrieval match the MVP payload contract

Exit condition:
- `PBI-122` is complete
- auditors can inspect event evidence and reconstruct chronological sequence safely
- incomplete or missing chains do not crash or mislead

### Wave 4 ¿ feature closure and reconciliation

Goal:
- close `PBI-022` cleanly once all three stories are complete

Tasks:
- reconcile feature/story/task status in backlog
- verify docs, evidence, and story-level done gates
- ensure `PBI-022` is not closed until:
  - `PBI-120` complete
  - `PBI-121` complete
  - `PBI-122` complete

Dependencies:
- Waves 1 to 3 complete
- no remaining child tasks open
- feature-level evidence exists for recording, search, and inspection

Exit condition:
- `PBI-022` may move from `In Progress` to `Completed`
- feature closure is backed by implementation, evidence, and durable docs

## 8. Parallelism rules

Allowed:
- query-contract work may begin in parallel with late `PBI-120` validation only if the event payload contract is already frozen
- event-detail contract work may begin in parallel with late `PBI-121` implementation only if the retrieval baseline is stable
- documentation updates may proceed in parallel with non-conflicting implementation slices

Not allowed:
- start `PBI-121` repository/API work before `PBI-120` capture semantics are stable
- start `PBI-122` implementation before search/query behavior is stable enough to consume
- invent real cryptographic-signature semantics if MVP only supports equivalent evidence fields
- collapse recording, search, and inspection into one ungovernable execution blob

## 9. Repo-scope execution note

Current working assumption:
- Sprint 4 is focused on the backend auditability feature under `R22`
- the feature should be completed vertically:
  - record
  - search
  - inspect
- UI work is not required for this sprint unless later explicitly planned
- durable docs must remain the single governed description of audit payload, evidence semantics, and sequence behavior

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
- update durable docs if audit payload, query semantics, sequence behavior, or evidence rules changed
- verify no flagged assumption was silently expanded

## 11. Story-level done gates

A story is not done until:
- implementation tasks pass
- audit/evidence slice is implemented where required
- documentation is updated
- evidence task is complete
- API contract and state/read-model rules remain accurate
- no still-open child task contradicts story closure

## 12. Flag impact map

### `FLAG-AUDIT-PAYLOAD-MVP`
Blocks:
- `PBI-123`
- `PBI-124`
- `PBI-125`
- `PBI-126`

### `FLAG-NONREPUDIATION-EVIDENCE-MVP`
Touches:
- `PBI-123`
- `PBI-124`
- `PBI-127`
- `PBI-133`
- `PBI-137`

### `FLAG-SENSITIVE-READ-CAPTURE-SCOPE`
Blocks:
- `PBI-126`
- touches `PBI-128` and `PBI-133`

### `FLAG-AUDIT-QUERY-ORDERING`
Blocks:
- `PBI-128`
- `PBI-129`
- `PBI-130`
- `PBI-131`

### `FLAG-AUDIT-SEQUENCE-CHAINING`
Touches:
- `PBI-133`
- `PBI-135`
- `PBI-136`
- `PBI-137`

## 13. Recommended first execution sequence

1. `PBI-123`
2. `PBI-124`
3. `PBI-125`
4. `PBI-126`
5. `PBI-127`
6. `PBI-128`
7. `PBI-129`
8. `PBI-130`
9. `PBI-131`
10. `PBI-132`
11. `PBI-133`
12. `PBI-134`
13. `PBI-135`
14. `PBI-136`
15. `PBI-137`

Rationale:
- freeze capture scope first
- complete recording before retrieval
- complete retrieval before deeper sequence/evidence inspection
- keep the feature vertically governed until closure
