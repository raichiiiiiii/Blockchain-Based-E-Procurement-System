# Sprint 5 Tasks

Status: Draft execution sheet
Owner: Scrum Master / Tech Lead
Audience: Team A - PBI-005, Team B - PBI-002, Team C - PBI-017
Source of truth: backlog/backlog.csv
Last updated: YYYY-MM-DD

## 1. Sprint objective

Sprint 5 develops three planned feature lanes concurrently after completion of PBI-022:

1. PBI-005 - Immutable audit trail for procure-to-pay events
2. PBI-002 - KYC and AML onboarding workflow
3. PBI-017 - Role-based UI and operational dashboards

The sprint objective is to let three developer teams work independently on separate branches while keeping shared contracts, shared files, and merge order controlled.

## 2. Sprint 5 feature branches

| Team | Feature | Branch | Merge Priority |
|---|---|---|---|
| Team A | PBI-005 - Immutable audit trail for procure-to-pay events | feature/PBI-005-immutable-audit-trail | 1 |
| Team B | PBI-002 - KYC and AML onboarding workflow | feature/PBI-002-kyc-aml-onboarding | 2 |
| Team C | PBI-017 - Role-based UI and operational dashboards | feature/PBI-017-role-based-ui-dashboards | 3 |

Merge order must remain:

1. feature/PBI-005-immutable-audit-trail
2. feature/PBI-002-kyc-aml-onboarding
3. feature/PBI-017-role-based-ui-dashboards

Reason: PBI-005 stabilizes audit and transaction-history contracts that PBI-002 and PBI-017 may consume or reference.

## 3. Operating rules

- Use backlog/backlog.csv as the backlog source of truth.
- Use this file only as the sprint execution guide.
- Execute task PBIs, not parent feature PBIs.
- Each Aider session must target one task PBI only.
- Do not silently change shared contracts.
- Do not redefine completed PBI-022 audit or access-history semantics.
- Do not move UI work back into PBI-022.
- Audit UI consumption belongs under PBI-017.
- Any architecture or module-boundary decision must be captured as an ADR or explicit non-ADR rationale.
- Shared files must have one owner per wave.
- Parent stories close only after all child tasks are complete and evidence is available.
- Parent features close only after all planned child stories and tasks required for that feature are complete.

## 4. Shared contract hotspots

Before implementation diverges, the teams must agree on these shared points:

| Contract or Risk Area | Primary Owner | Affected Teams |
|---|---|---|
| Audit event schema | Team A | Team A, Team B, Team C |
| Transaction-history contract | Team A | Team A, Team C |
| KYC and AML status lifecycle | Team B | Team B, Team C |
| Onboarding eligibility response | Team B | Team B, future protected workflows |
| Role and permission names | Team C | Team C, Team B |
| Dashboard shell response and widget contract | Team C | Team C |
| Validation and error envelope usage | Platform / all teams | Team A, Team B, Team C |
| Migration ownership | Platform / task owner | Team A, Team B |
| ADR trigger list | Platform Engineer | Team A, Team B, Team C |

## 5. Wave 0 - mandatory coordination before branch divergence

### Parent context

This wave supports all three feature lanes:

- PBI-002
- PBI-005
- PBI-017

It exists to prevent hidden dependency mistakes, duplicate shared-file edits, and incompatible branch contracts.

### Tasks

| Order | Task | Purpose | Owner |
|---|---|---|---|
| 0.1 | PBI-138 - Investigate shared contracts and merge coordination for concurrent PBI-002, PBI-005, and PBI-017 branches | Identify shared contracts, shared files, ADR triggers, and merge order | Platform Engineer |
| 0.2 | PBI-139 - Do produce parallel coordination note and shared-file ownership map for PBI-002, PBI-005, and PBI-017 | Create the coordination artifact under backlog/ | Platform Engineer |

### Required output

- backlog/parallel-plan-PBI-002-PBI-005-PBI-017.md
- shared-contract matrix
- shared-file ownership map
- merge order confirmation
- ADR trigger list
- owner for each shared contract

### Exit condition

No feature implementation starts until PBI-138 and PBI-139 are complete.

# Team A - PBI-005 Immutable Audit Trail

## 6. Parent feature context: PBI-005

Feature: PBI-005 - Immutable audit trail for procure-to-pay events

Purpose:

- record procure-to-pay lifecycle events
- preserve actor, timestamp, correlation, and immutable reference evidence
- expose ordered transaction history
- avoid overstating completeness when history has gaps

Primary branch:

- feature/PBI-005-immutable-audit-trail

Merge priority:

- 1

Key dependencies:

- PBI-003
- PBI-022
- PBI-138
- PBI-139

## 7. Team A execution order

### Wave A1 - transaction-history contract foundation

| Order | Parent | Task | Purpose |
|---|---|---|---|
| A1.1 | PBI-005 | PBI-145 - Do define transaction-history contract and lifecycle event field semantics | Define lifecycle fields, identifiers, ordering rules, and incomplete or gap semantics before implementation |

Exit condition:

- transaction-history contract is documented
- lifecycle event fields are explicit
- incomplete or gap semantics are explicit
- downstream consumers must not invent alternate history semantics

### Wave A2 - lifecycle event capture story

Parent story:

PBI-143 - As the platform, I want procure-to-pay lifecycle events recorded with immutable reference evidence, so that PO, delivery, invoice, and settlement actions are traceable

Parent context:

- PBI-143 implements the write side of PBI-005.
- It records PO, delivery, invoice, and settlement lifecycle events.
- It depends on PBI-145 for the approved event contract.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| A2.1 | PBI-143 | PBI-164 - Do implement immutable procure-to-pay event capture using the approved transaction-history contract | Implement lifecycle event capture using approved fields |
| A2.2 | PBI-143 | PBI-165 - Do add append-only persistence safeguards and correlation hardening for procure-to-pay lifecycle events | Prevent unsupported overwrite and preserve correlation integrity |
| A2.3 | PBI-143 | PBI-166 - Do integrate procure-to-pay event sources into the immutable lifecycle write path | Wire PO, delivery, invoice, and settlement sources into event capture |
| A2.4 | PBI-143 | PBI-167 - Do execute immutable lifecycle event validation, documentation updates, and evidence closure for PBI-143 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-143 can be marked complete only after PBI-164 to PBI-167 are complete.
- Event samples and validation evidence exist.
- Append-only and correlation behavior are tested.

### Wave A3 - ordered transaction-history retrieval story

Parent story:

PBI-144 - As an auditor, I want to retrieve ordered transaction history for a procure-to-pay case, so that I can reconstruct the lifecycle honestly from available evidence

Parent context:

- PBI-144 implements the read side of PBI-005.
- It must expose ordered lifecycle history.
- It must not imply completeness when evidence is incomplete.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| A3.1 | PBI-144 | PBI-168 - Do implement ordered transaction-history read model for procure-to-pay cases | Build read model for ordered lifecycle events |
| A3.2 | PBI-144 | PBI-169 - Do expose transaction-history API with incomplete or gap signaling | Expose API with explicit incomplete or gap state |
| A3.3 | PBI-144 | PBI-170 - Do add transaction-history authorization and negative-path hardening for procure-to-pay retrieval | Enforce access and negative-path behavior |
| A3.4 | PBI-144 | PBI-171 - Do execute transaction-history retrieval validation, documentation updates, and evidence closure for PBI-144 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-144 can be marked complete only after PBI-168 to PBI-171 are complete.
- Ordered retrieval is tested.
- Empty results are tested.
- Incomplete or gap status is tested.
- Unauthorized access is tested.

### Wave A4 - consumer readiness closeout

| Order | Parent | Task | Purpose |
|---|---|---|---|
| A4.1 | PBI-005 | PBI-149 - Do validate transaction-history consumer readiness and document downstream contract usage | Ensure later features can consume transaction history safely |

Exit condition:

- downstream contract usage is documented
- consumer-readiness note exists
- PBI-005 can be evaluated for closure after PBI-143, PBI-144, PBI-145, and PBI-149 are complete

# Team B - PBI-002 KYC and AML Onboarding

## 8. Parent feature context: PBI-002

Feature: PBI-002 - KYC and AML onboarding workflow

Purpose:

- create regulated onboarding intake
- record KYC and AML review decisions
- expose onboarding status and history
- expose downstream eligibility so blocked or flagged SMEs cannot transact without explicit eligibility result

Primary branch:

- feature/PBI-002-kyc-aml-onboarding

Merge priority:

- 2

Key dependencies:

- PBI-003
- PBI-022
- PBI-138
- PBI-139

## 9. Team B execution order

### Wave B1 - onboarding intake story

Parent story:

PBI-140 - As a compliance officer, I want to submit an onboarding case with required KYC and AML evidence, so that regulated participants enter a traceable review workflow

Parent context:

- PBI-140 creates the intake side of PBI-002.
- It must define the data contract before service work.
- It must emit audit evidence for regulated onboarding.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| B1.1 | PBI-140 | PBI-152 - Do define onboarding intake schema, required evidence metadata, and initial KYC/AML status contract | Define intake schema and initial state |
| B1.2 | PBI-140 | PBI-153 - Do implement onboarding intake API and service validation for KYC/AML case creation | Implement intake API and service |
| B1.3 | PBI-140 | PBI-154 - Do add onboarding intake audit capture, ownership checks, and duplicate-case hardening | Add audit, authorization, duplicate, and open-case hardening |
| B1.4 | PBI-140 | PBI-155 - Do execute onboarding intake validation, documentation updates, and evidence closure for PBI-140 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-140 can be marked complete only after PBI-152 to PBI-155 are complete.
- Valid intake is tested.
- Invalid intake is tested.
- Duplicate or open-case behavior is tested.
- Audit evidence exists.

### Wave B2 - review decision story

Parent story:

PBI-141 - As a compliance reviewer, I want to review KYC and AML evidence and record the outcome, so that risky participants are flagged or blocked from transacting

Parent context:

- PBI-141 handles compliance review decisions.
- It defines pass, fail, flagged, and blocked outcomes.
- It must update case status and record reasons.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| B2.1 | PBI-141 | PBI-156 - Do define KYC/AML review outcome codes, reason fields, and status-transition rules | Define outcome vocabulary and transition rules |
| B2.2 | PBI-141 | PBI-157 - Do implement KYC/AML review decision API and outcome persistence | Implement review decision path |
| B2.3 | PBI-141 | PBI-158 - Do add reviewer authorization, decision audit capture, and block-or-flag hardening for KYC/AML outcomes | Harden authorization and audit behavior |
| B2.4 | PBI-141 | PBI-159 - Do execute KYC/AML review decision validation, documentation updates, and evidence closure for PBI-141 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-141 can be marked complete only after PBI-156 to PBI-159 are complete.
- Pass, fail, flagged, and blocked outcomes are tested.
- Invalid transition is tested.
- Reviewer authorization is tested.
- Audit evidence exists.

### Wave B3 - onboarding status/history story

Parent story:

PBI-142 - As a bank or compliance user, I want to retrieve onboarding status and decision history, so that I can verify whether an SME may transact

Parent context:

- PBI-142 is backend/read-contract capability.
- It is not dashboard UI.
- It supports later dashboard or downstream consumers.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| B3.1 | PBI-142 | PBI-160 - Do define onboarding status-history read contract and authorized retrieval semantics | Define read contract and access rules |
| B3.2 | PBI-142 | PBI-161 - Do implement onboarding status-history read model and API | Implement status/history retrieval |
| B3.3 | PBI-142 | PBI-162 - Do add authorization checks, history ordering, and privacy hardening for onboarding status retrieval | Harden privacy, ordering, and access |
| B3.4 | PBI-142 | PBI-163 - Do execute onboarding status-history validation, documentation updates, and evidence closure for PBI-142 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-142 can be marked complete only after PBI-160 to PBI-163 are complete.
- Authorized retrieval is tested.
- Unauthorized retrieval is tested.
- Intermediate state is tested.
- Privacy-sensitive fields are handled correctly.

### Wave B4 - downstream eligibility story

Parent story:

PBI-150 - As the platform, I want to expose onboarding eligibility for downstream protected workflows, so that blocked or flagged SMEs cannot proceed without an explicit eligibility decision

Parent context:

- PBI-150 turns KYC/AML outcome into an enforceable downstream seam.
- It prevents "blocked from transacting" from being only a stored label.
- It should not implement every downstream block inside this story.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| B4.1 | PBI-150 | PBI-184 - Do define onboarding eligibility contract, blocked-or-flagged reason metadata, and downstream check semantics | Define eligibility response contract |
| B4.2 | PBI-150 | PBI-185 - Do implement onboarding eligibility retrieval service and API for downstream workflow checks | Implement eligibility check API and service |
| B4.3 | PBI-150 | PBI-186 - Do add authorization, audit capture, and blocked-flow hardening for onboarding eligibility checks | Harden authorization and audit behavior |
| B4.4 | PBI-150 | PBI-187 - Do execute onboarding eligibility validation, documentation updates, and evidence closure for PBI-150 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-150 can be marked complete only after PBI-184 to PBI-187 are complete.
- Eligible, blocked, flagged, and indeterminate paths are tested.
- Downstream contract is documented.

# Team C - PBI-017 Role-Based UI and Operational Dashboards

## 10. Parent feature context: PBI-017

Feature: PBI-017 - Role-based UI and operational dashboards

Purpose:

- provide role-specific dashboard shell
- expose administrator widgets
- expose compliance/review widgets
- expose auditor/security investigation widgets consuming completed PBI-022 APIs
- hide or block actions outside the user's role

Primary branch:

- feature/PBI-017-role-based-ui-dashboards

Merge priority:

- 3

Key dependencies:

- PBI-003
- PBI-020
- PBI-022
- PBI-121
- PBI-122
- PBI-138
- PBI-139

## 11. Team C execution order

### Wave C1 - dashboard shell story

Parent story:

PBI-146 - As a user, I want to land on a dashboard tailored to my role, so that I see navigation and widgets relevant to my responsibilities

Parent context:

- PBI-146 creates the shared dashboard shell.
- Other widget stories depend on this shell.
- This is the first Team C implementation slice.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| C1.1 | PBI-146 | PBI-172 - Do define role-to-dashboard mapping, navigation shell contract, and shared widget zones | Define role mapping and layout contract |
| C1.2 | PBI-146 | PBI-173 - Do implement role-based dashboard shell and navigation resolution | Implement dashboard shell |
| C1.3 | PBI-146 | PBI-174 - Do add dashboard access checks, blocked-route handling, and shared error-state behavior | Harden access and blocked states |
| C1.4 | PBI-146 | PBI-175 - Do execute dashboard shell validation, documentation updates, and evidence closure for PBI-146 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-146 can be marked complete only after PBI-172 to PBI-175 are complete.
- Role navigation is tested.
- Blocked route behavior is tested.
- Shell evidence exists.

### Wave C2 - administrator dashboard widgets story

Parent story:

PBI-147 - As an administrator, I want membership and access-control widgets on my dashboard, so that I can act on onboarding, roles, and assignments efficiently

Parent context:

- PBI-147 exposes completed membership/access-control flows through dashboard widgets.
- It must not redefine backend role or assignment rules.
- It depends on PBI-146 dashboard shell.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| C2.1 | PBI-147 | PBI-176 - Do define administrator widget contract and membership or access-control action entry mapping | Define admin widget contract |
| C2.2 | PBI-147 | PBI-177 - Do implement administrator dashboard widgets for member onboarding, roles, and assignments | Implement admin widgets |
| C2.3 | PBI-147 | PBI-178 - Do add administrator widget permission filtering and summary-state hardening | Harden permission and summary states |
| C2.4 | PBI-147 | PBI-179 - Do execute administrator widget validation, documentation updates, and evidence closure for PBI-147 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-147 can be marked complete only after PBI-176 to PBI-179 are complete.
- Admin widgets are visible only to permitted users.
- Widget navigation is tested.
- Blocked behavior is tested.

### Wave C3 - compliance/review dashboard widgets story

Parent story:

PBI-148 - As a compliance or review user, I want dashboard widgets that surface my governed workflow actions, so that I can reach the correct workflow quickly and only see actions allowed to me

Parent context:

- PBI-148 surfaces governed workflows to compliance/review users.
- It may consume completed PBI-020 Shariah workflow outputs.
- It must remain permission-aware.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| C3.1 | PBI-148 | PBI-180 - Do define compliance or review widget contract, governed action mapping, and blocked-state rules | Define compliance/review widget contract |
| C3.2 | PBI-148 | PBI-181 - Do implement compliance or review dashboard widgets and governed workflow entry points | Implement compliance/review widgets |
| C3.3 | PBI-148 | PBI-182 - Do add blocked-action handling, permission filtering, and shared status-state hardening for compliance or review widgets | Harden blocked actions and statuses |
| C3.4 | PBI-148 | PBI-183 - Do execute compliance or review widget validation, documentation updates, and evidence closure for PBI-148 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-148 can be marked complete only after PBI-180 to PBI-183 are complete.
- Compliance/review widgets are role-aware.
- Blocked actions are tested.
- Governed workflow entry points are evidenced.

### Wave C4 - auditor/security investigation widgets story

Parent story:

PBI-151 - As an auditor or security operator, I want access-history investigation widgets on my dashboard, so that I can search access events and inspect event evidence from the dashboard

Parent context:

- PBI-151 belongs under PBI-017, not PBI-022.
- It consumes completed PBI-121 and PBI-122.
- It must preserve backend audit payload semantics.

| Order | Parent Story | Task | Purpose |
|---|---|---|---|
| C4.1 | PBI-151 | PBI-188 - Do define auditor or security dashboard investigation widget contract and access-history consumption mapping | Define investigation widget contract |
| C4.2 | PBI-151 | PBI-189 - Do implement dashboard investigation widgets consuming access-history search and event-detail capabilities | Implement investigation widgets |
| C4.3 | PBI-151 | PBI-190 - Do add empty-result, validation, and forbidden-state handling for dashboard investigation widgets | Harden empty, validation, and forbidden states |
| C4.4 | PBI-151 | PBI-191 - Do execute dashboard investigation widget validation, documentation updates, and evidence closure for PBI-151 | Validate, document, and collect closure evidence |

Exit condition:

- PBI-151 can be marked complete only after PBI-188 to PBI-191 are complete.
- Dashboard widgets consume approved access-history APIs.
- Empty results are tested.
- Invalid input is tested.
- Forbidden access is tested.
- Backend audit semantics are not redefined.

## 12. Parallel execution model

After Wave 0 is complete, the three teams may work concurrently.

| Lane | Can start after | Must not block |
|---|---|---|
| Team A - PBI-005 | PBI-138, PBI-139 | Team B and Team C local implementation |
| Team B - PBI-002 | PBI-138, PBI-139 | Team A contract stabilization |
| Team C - PBI-017 | PBI-138, PBI-139 | Team A and Team B backend implementation |

However:

- Team C must not consume unstable backend contracts unless those contracts are explicitly marked ready.
- Team B must not redefine audit event schema created by Team A.
- Team A must publish transaction-history and audit-event contracts before Team B or Team C depend on them.
- If shared files must be edited by more than one branch, the ownership map from PBI-139 controls sequencing.

## 13. Recommended execution sequence

### Global first

1. PBI-138
2. PBI-139

### Team A - critical path

3. PBI-145
4. PBI-164
5. PBI-165
6. PBI-166
7. PBI-167
8. PBI-168
9. PBI-169
10. PBI-170
11. PBI-171
12. PBI-149

### Team B - KYC and AML lane

13. PBI-152
14. PBI-153
15. PBI-154
16. PBI-155
17. PBI-156
18. PBI-157
19. PBI-158
20. PBI-159
21. PBI-160
22. PBI-161
23. PBI-162
24. PBI-163
25. PBI-184
26. PBI-185
27. PBI-186
28. PBI-187

### Team C - dashboard lane

29. PBI-172
30. PBI-173
31. PBI-174
32. PBI-175
33. PBI-176
34. PBI-177
35. PBI-178
36. PBI-179
37. PBI-180
38. PBI-181
39. PBI-182
40. PBI-183
41. PBI-188
42. PBI-189
43. PBI-190
44. PBI-191

## 14. Story closure map

| Parent Feature | Parent Story | Closing Tasks |
|---|---|---|
| PBI-005 | PBI-143 | PBI-164, PBI-165, PBI-166, PBI-167 |
| PBI-005 | PBI-144 | PBI-168, PBI-169, PBI-170, PBI-171 |
| PBI-005 | Contract and consumer readiness | PBI-145, PBI-149 |
| PBI-002 | PBI-140 | PBI-152, PBI-153, PBI-154, PBI-155 |
| PBI-002 | PBI-141 | PBI-156, PBI-157, PBI-158, PBI-159 |
| PBI-002 | PBI-142 | PBI-160, PBI-161, PBI-162, PBI-163 |
| PBI-002 | PBI-150 | PBI-184, PBI-185, PBI-186, PBI-187 |
| PBI-017 | PBI-146 | PBI-172, PBI-173, PBI-174, PBI-175 |
| PBI-017 | PBI-147 | PBI-176, PBI-177, PBI-178, PBI-179 |
| PBI-017 | PBI-148 | PBI-180, PBI-181, PBI-182, PBI-183 |
| PBI-017 | PBI-151 | PBI-188, PBI-189, PBI-190, PBI-191 |

## 15. Done gates

A task is Done only when:

- implementation or artifact exists
- relevant tests pass
- acceptance criteria are covered
- validation and error paths are tested where applicable
- authorization and security paths are tested where applicable
- documentation is updated where applicable
- evidence is attached or listed
- no shared contract drift is introduced
- any ADR-triggering decision is captured

A story is Done only when:

- all child tasks are Done
- story acceptance criteria are satisfied
- story-level evidence exists
- parent feature notes remain consistent

A feature is Done only when:

- all required story-level PBIs for that feature are Done
- feature-level acceptance criteria are satisfied
- PO acceptance is recorded
- no blocking child task remains open

## 16. ADR triggers

Create or update an ADR when any task changes:

- audit event schema
- transaction-history field semantics
- append-only persistence boundary
- KYC and AML lifecycle model
- onboarding eligibility semantics
- role or permission vocabulary
- dashboard shell contract
- dashboard widget contract
- migration ownership
- validation or error response envelope
- module boundaries

## 17. Aider task prompt template

Use this structure for each task:

Task ID:
Parent Feature:
Parent Story:
Branch:
Goal:
In scope:
Out of scope:
Dependencies already satisfied:
Shared contracts touched:
Files to inspect first:
Acceptance criteria:
Required tests:
Required documentation/evidence:
ADR needed? Yes/No

Rules:

- one task per Aider session
- ask for file plan first
- do not let Aider edit unrelated files
- run build and tests before closeout
- update durable docs if contracts, states, APIs, or architecture boundaries changed

## 18. Backlog update rule after Sprint 5

At sprint close:

- completed task PBIs get Sprint = Sprint 5 and Status = Completed
- incomplete but started task PBIs get Sprint = Sprint 5 and Status = In-Progress or Blocked
- unstarted planned PBIs remain Planned
- parent stories become Completed only when all child tasks are completed
- parent features remain In-Progress unless all required child stories are completed and PO acceptance is recorded

Do not mark a parent feature complete just because one branch merged partially.
