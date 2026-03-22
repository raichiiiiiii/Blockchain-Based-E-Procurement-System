# Sprint 1 Tasks

Status: Draft execution sheet  
Owner: Scrum Master / Tech Lead  
Last updated: YYYY-MM-DD

## 1. Sprint objective

Build the minimal governed platform slice for:
- R03: membership and access-control baseline
- R20: Shariah review workflow baseline

## 2. Operating rules

- Granular tasks, not stories, are the execution unit.
- Each Aider session must target one task only.
- Each task must use the durable docs as the source of truth, not chat memory.
- No task may silently turn a provisional assumption into hidden permanent behavior.
- Any code change that affects contract, state, or dependency behavior must update the durable docs in the same task or the immediate follow-up task.

## 3. Assumption handling rule

Sprint 1 may proceed with provisional assumptions only when:
- the assumption is written in a durable doc
- downstream tasks reference the doc instead of chat memory
- the assumption is narrow enough to be revised later
- the assumption is tagged with a clear flag or assumption marker
- the implementation does not silently expand the assumption into extra behavior

## 4. Preflight document repairs

These repairs must be applied before Wave 0 build execution is treated as clean:

- normalize `SPRINT1_TASKS.md` into a single authoritative version
- align `API_CONTRACTS.md` so Shariah review submission actor identity is derived from auth context, not client input
- align flag inventory across:
  - `ARCHITECTURE.md`
  - `API_CONTRACTS.md`
  - `STATE_MODELS.md`
  - `SPRINT1_TASKS.md`
- ensure all truncated lines and duplicated sections are removed

Preflight exit condition:
- this task file is no longer duplicated or truncated
- the submission-actor contract is repaired
- blockers and assumptions are listed consistently

## 5. Entry gates before implementation waves

Sprint 1 build work starts only after these baseline docs exist:
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- `API_CONTRACTS.md`
- `STATE_MODELS.md`
- `SPRINT1_TASKS.md`

Critical unresolved flags must be tracked explicitly, not hidden:
- `FLAG-MEMBERSHIP-INITIAL-STATE`
- `FLAG-MEMBERSHIP-STATE-SET`
- `FLAG-MEMBERSHIP-UNIQUENESS`
- `FLAG-USER-IDENTITY`
- `FLAG-ROLE-CATALOG`
- `FLAG-ASSIGNMENT-MULTIPLICITY`
- `FLAG-PROTECTED-FUNCTIONS`
- `FLAG-SHARIAH-SUBMISSION-METADATA`
- `FLAG-CHECKLIST-SOURCE`
- `FLAG-CONDITIONAL-APPROVAL`
- `FLAG-AUDIT-POLICY`
- `FLAG-READ-AUDIT`

## 6. Current provisional baselines allowed for Sprint 1 planning

Current working assumptions:
- member organization initial state: `pendingReview`
- member organization lifecycle: `pendingReview | active | inactive | suspended | deleted`
- member organization uniqueness baseline: `registrationNumber`
- role model shape: RBAC with role definitions separated from assignments
- assignment baseline: many-to-many is allowed; duplicate active assignment of the same role to the same user in the same organization is not allowed
- protected-function baseline: deactivation-aware enforcement applies to governed writes and sensitive reads
- checklist source baseline: seeded reference data
- review outcomes baseline: `approved | rejected | conditionalApproved`
- audit baseline: minimum event scaffolding exists, but full policy remains open
- submission actor baseline: review submission actor is derived from authenticated context, not client-supplied request body data
- submission metadata baseline: `organizationId`, `title`, and `summary` are required; `references` are optional; richer metadata remains provisional

These baselines are usable for Sprint 1 planning and early implementation, but they remain revisable where flagged.

## 7. Wave plan

### Wave 0 — architecture runway

Goal:
- freeze the minimum contracts, state models, coding rules, and execution assumptions needed for Sprint 1

Tasks:
- PBI-039 define member organization schema
- PBI-044 define role model
- PBI-049 define assignment rules
- PBI-054 define deactivation rules
- PBI-059 define review-request schema
- PBI-064 define checklist structure
- PBI-069 define decision states
- PBI-074 define status-history query model

Exit condition:
- all downstream build tasks have stable enough contract/state guidance
- unresolved flags are documented and bounded
- provisional assumptions are explicit where full resolution is not yet available
- the submission-actor contract is repaired in the public API docs

### Wave 1 — member organization

Tasks:
- PBI-040 create organization API/service
- PBI-041 admin registration UI
- PBI-042 auth/audit/data handling
- PBI-043 validation/docs/evidence

Dependencies:
- PBI-039 complete
- `FLAG-MEMBERSHIP-INITIAL-STATE` explicitly accepted as provisional or resolved
- `FLAG-MEMBERSHIP-UNIQUENESS` written in durable docs
- organization status effects are documented in `STATE_MODELS.md`

### Wave 2 — role catalog

Tasks:
- PBI-045 role management API
- PBI-046 role management UI
- PBI-047 role auth/audit/status checks
- PBI-048 validation/docs/evidence

Dependencies:
- PBI-044 complete
- `FLAG-ROLE-CATALOG` explicitly accepted as provisional or resolved
- role state rules documented
- role immutability/editability rules documented in contracts or state rules

### Wave 3 — role assignment

Tasks:
- PBI-050 assignment service
- PBI-051 assignment UI
- PBI-052 permissions/audit/prevention
- PBI-053 validation/docs/evidence

Dependencies:
- PBI-040 complete
- PBI-045 complete
- PBI-049 complete
- `FLAG-USER-IDENTITY` explicitly accepted as provisional or resolved
- `FLAG-ASSIGNMENT-MULTIPLICITY` explicitly accepted as provisional or resolved

### Wave 4 — deactivation enforcement

Tasks:
- PBI-055 deactivation-aware access service
- PBI-056 protected endpoints/UI guards
- PBI-057 audit/safeguards/configuration
- PBI-058 validation/docs/evidence

Dependencies:
- PBI-050 complete enough for realistic access checks
- PBI-054 complete
- `FLAG-PROTECTED-FUNCTIONS` written in durable docs
- membership state effects on reads vs protected actions are documented

### Wave 5 — review submission

Tasks:
- PBI-060 submission API
- PBI-061 submission UI
- PBI-062 access control/audit/reference handling
- PBI-063 validation/docs/evidence

Dependencies:
- PBI-059 complete
- `FLAG-SHARIAH-SUBMISSION-METADATA` explicitly accepted as provisional or resolved
- `FLAG-AUDIT-POLICY` resolved enough for submission logging scaffolding
- submission actor is documented as auth-derived, not client-supplied

### Wave 6 — checklist

Tasks:
- PBI-065 checklist API
- PBI-066 checklist UI
- PBI-067 checklist auth/audit/state guards
- PBI-068 validation/docs/evidence

Dependencies:
- PBI-060 complete
- PBI-064 complete
- `FLAG-CHECKLIST-SOURCE` explicitly accepted as provisional or resolved
- checklist completion rules are documented in `STATE_MODELS.md`

### Wave 7 — decisioning

Tasks:
- PBI-070 decision API
- PBI-071 decision UI
- PBI-072 decision auth/audit/state guards
- PBI-073 validation/docs/evidence

Dependencies:
- PBI-065 complete
- PBI-069 complete
- `FLAG-CONDITIONAL-APPROVAL` explicitly accepted as provisional or resolved
- final decision rules are documented as stable enough for implementation

### Wave 8 — status/history

Tasks:
- PBI-075 status-history API
- PBI-076 status-history UI
- PBI-077 view permissions/read audit/hardening
- PBI-078 validation/docs/evidence

Dependencies:
- PBI-070 complete
- PBI-074 complete
- `FLAG-READ-AUDIT` documented at least provisionally
- history ordering and current-status derivation rules are written in `API_CONTRACTS.md` or `STATE_MODELS.md`

## 8. Parallelism rules

Allowed:
- UI tasks after their API contract is stable enough
- security/audit tasks after the base implementation slice exists
- validation/evidence tasks after functional slices are complete
- documentation refinement tasks in parallel with non-conflicting implementation work

Not allowed:
- start assignment implementation before user-identity assumptions are clear enough
- start decision implementation before checklist and decision rules are stable enough
- start deactivation enforcement before protected-function categories are documented
- let UI work redefine backend workflow states or backend contract semantics
- accept client-authored actor identity for protected write endpoints unless a separate delegated-action contract is explicitly approved later

## 9. Repo-scope execution note

Current working assumption:
- backend implementation in this repo is the primary governed work surface
- UI-labeled PBIs may proceed if a real frontend boundary exists
- if no real frontend boundary exists in this repo, UI tasks should be treated as contract-consumer placeholders or deferred implementation tasks
- frontend work must consume backend contracts; it must not redefine them

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
- update durable docs if contract/state/dependency behavior changed
- verify no flagged assumption was silently expanded

## 11. Story-level done gates

A story is not done until:
- implementation tasks pass
- security/audit slice is implemented where required
- documentation is updated
- evidence task is complete
- state model and API contract remain accurate
- any provisional assumption used by the story is still explicitly documented

## 12. Flag impact map

### `FLAG-MEMBERSHIP-INITIAL-STATE`
Blocks:
- PBI-040
- PBI-041
- PBI-042
- PBI-043

### `FLAG-MEMBERSHIP-STATE-SET`
Touches:
- PBI-039
- PBI-040
- PBI-054
- PBI-055

### `FLAG-MEMBERSHIP-UNIQUENESS`
Blocks:
- PBI-039
- PBI-040
- PBI-043

### `FLAG-ROLE-CATALOG`
Blocks:
- PBI-045
- PBI-046
- PBI-047
- PBI-048
- also weakly blocks assignment design

### `FLAG-USER-IDENTITY`
Blocks:
- PBI-050
- PBI-051
- PBI-052
- PBI-053
- PBI-055
- PBI-060

### `FLAG-ASSIGNMENT-MULTIPLICITY`
Blocks:
- PBI-049
- PBI-050
- PBI-051
- PBI-052
- PBI-053

### `FLAG-PROTECTED-FUNCTIONS`
Blocks:
- PBI-054
- PBI-055
- PBI-056
- PBI-057
- PBI-058

### `FLAG-SHARIAH-SUBMISSION-METADATA`
Affects:
- PBI-060
- PBI-061
- PBI-062
- PBI-063

PBI-059 is complete for the minimum contract baseline. Richer submission metadata remains provisional and affects downstream tasks.

### `FLAG-CHECKLIST-SOURCE`
Blocks:
- PBI-064
- PBI-065
- PBI-066
- PBI-067
- PBI-068

### `FLAG-CONDITIONAL-APPROVAL`
Blocks:
- PBI-069
- PBI-070
- PBI-071
- PBI-072
- PBI-073

### `FLAG-AUDIT-POLICY`
Touches:
- PBI-042
- PBI-047
- PBI-052
- PBI-057
- PBI-062
- PBI-067
- PBI-072
- PBI-077

### `FLAG-READ-AUDIT`
Blocks:
- PBI-074
- PBI-075
- PBI-076
- PBI-077
- PBI-078

## 13. Recommended first Aider sequence

0. Apply durable doc repairs:
   - normalize `SPRINT1_TASKS.md`
   - patch the review-submission actor contract
1. PBI-039
2. PBI-040
3. PBI-042
4. PBI-041
5. PBI-043
6. PBI-044
7. PBI-045
8. PBI-047

Rationale:
- start with the member-organization vertical slice
- use the durable docs as memory before branching into role and review work
- avoid mixing role, review, and audit policy invention in the same session
- ensure the review submission contract is safe before submission implementation begins
