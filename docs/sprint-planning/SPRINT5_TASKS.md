# Sprint 5 Tasks

Status: Draft execution sheet
Source of truth: backlog/backlog.csv
Last updated: 2026-05-23

## Sprint objective

Sprint 5 runs the current planned work with PBI-253 as a platform gate before the three active feature branches are merged.

Active lanes:

1. PBI-253 - Authentication and session management for platform users
2. PBI-005 - Immutable audit trail for procure-to-pay events
3. PBI-002 - KYC and AML onboarding workflow
4. PBI-017 - Role-based UI and operational dashboards

PBI-253 provides the shared actor-context capability that PBI-005, PBI-002, and PBI-017 must consume.

## Branches and merge order

| Order | Branch | Scope |
|---|---|---|
| 1 | feature/PBI-253-auth-session-management | Platform actor-context gate |
| 2 | feature/PBI-005-immutable-audit-trail | Immutable audit trail |
| 3 | feature/PBI-002-kyc-aml-onboarding | KYC and AML onboarding |
| 4 | feature/PBI-017-role-based-ui-dashboards | Role-based UI and dashboards |

## Required references

- docs/architecture/adr/ADR-001-dashboard-auth-boundary-and-state-flow.md
- docs/architecture/adr/ADR-002-auth-session-management-boundary.md
- docs/contracts/AUTH_SESSION_CONTRACT.md
- backlog/backlog.csv
- docs/process/pbi-guideline.tex

## Global rules

- Execute task PBIs, not parent feature PBIs.
- Use one Aider session per task.
- PBI-017 must not implement login, session issuance, logout, account creation, or public registration.
- PBI-253 owns the shared actor-context boundary.
- Feature teams must not define local actor-context behavior.
- Shared contract changes require documentation and ADR review when applicable.
- Parent stories close only after all child tasks and evidence are complete.

## Wave 0 - coordination

| Order | Task | Purpose |
|---|---|---|
| 0.1 | PBI-138 | Investigate shared contracts, file ownership, ADR triggers, and merge order |
| 0.2 | PBI-139 | Produce the parallel coordination note and shared-file ownership map |

Exit condition: merge order and shared ownership are explicit.

## PBI-253 gate tasks

Parent context: PBI-253 enables the shared authentication/session and actor-context capability needed by PBI-005, PBI-002, and PBI-017.

Branch: feature/PBI-253-auth-session-management

| Order | Task | Purpose |
|---|---|---|
| G1 | PBI-254 | Define MVP authentication/session contract and threat assumptions |
| G2 | PBI-255 | Implement user credential and session domain model with repository seams |
| G3 | PBI-256 | Implement login endpoint and session issuance |
| G4 | PBI-257 | Implement authenticated request validation middleware |
| G5 | PBI-258 | Integrate actor context with protected routes and audit emitters |
| G6 | PBI-259 | Implement logout or session invalidation behavior |
| G7 | PBI-260 | Add authentication and actor-context regression tests |
| G8 | PBI-261 | Update API contracts, architecture docs, and coordination notes |
| G9 | PBI-262 | Prepare merge gate and rebase guidance for PBI-005, PBI-002, and PBI-017 |

Exit condition: PBI-253 is merged before PBI-005, PBI-002, and PBI-017.

## Team A tasks for PBI-005

Parent context: PBI-005 records procure-to-pay lifecycle events and exposes ordered transaction history.

Branch: feature/PBI-005-immutable-audit-trail

| Order | Parent | Task | Purpose |
|---|---|---|---|
| A1 | PBI-005 | PBI-145 | Define transaction-history contract and lifecycle event semantics |
| A2 | PBI-143 | PBI-164 | Implement immutable procure-to-pay event capture |
| A3 | PBI-143 | PBI-165 | Add append-only persistence and correlation hardening |
| A4 | PBI-143 | PBI-166 | Integrate procure-to-pay event sources |
| A5 | PBI-143 | PBI-167 | Validate and document PBI-143 |
| A6 | PBI-144 | PBI-168 | Implement ordered transaction-history read model |
| A7 | PBI-144 | PBI-169 | Expose transaction-history API with incomplete/gap signaling |
| A8 | PBI-144 | PBI-170 | Add authorization and negative-path hardening |
| A9 | PBI-144 | PBI-171 | Validate and document PBI-144 |
| A10 | PBI-005 | PBI-149 | Validate consumer readiness and downstream contract usage |

## Team B tasks for PBI-002

Parent context: PBI-002 creates regulated onboarding intake, review decision, status/history, and eligibility capability.

Branch: feature/PBI-002-kyc-aml-onboarding

| Order | Parent | Task | Purpose |
|---|---|---|---|
| B1 | PBI-140 | PBI-152 | Define onboarding intake schema and initial status contract |
| B2 | PBI-140 | PBI-153 | Implement onboarding intake API and service validation |
| B3 | PBI-140 | PBI-154 | Add intake audit capture and duplicate-case hardening |
| B4 | PBI-140 | PBI-155 | Validate and document PBI-140 |
| B5 | PBI-141 | PBI-156 | Define review outcome codes and status-transition rules |
| B6 | PBI-141 | PBI-157 | Implement review decision API and persistence |
| B7 | PBI-141 | PBI-158 | Add reviewer authorization and decision audit capture |
| B8 | PBI-141 | PBI-159 | Validate and document PBI-141 |
| B9 | PBI-142 | PBI-160 | Define onboarding status-history read contract |
| B10 | PBI-142 | PBI-161 | Implement status-history read model and API |
| B11 | PBI-142 | PBI-162 | Add authorization, ordering, and privacy hardening |
| B12 | PBI-142 | PBI-163 | Validate and document PBI-142 |
| B13 | PBI-150 | PBI-184 | Define onboarding eligibility contract |
| B14 | PBI-150 | PBI-185 | Implement onboarding eligibility retrieval service and API |
| B15 | PBI-150 | PBI-186 | Add authorization, audit capture, and blocked-flow hardening |
| B16 | PBI-150 | PBI-187 | Validate and document PBI-150 |

## Team C tasks for PBI-017

Parent context: PBI-017 creates role-based dashboard behavior. It consumes actor context but does not implement auth/session behavior.

Branch: feature/PBI-017-role-based-ui-dashboards

| Order | Parent | Task | Purpose |
|---|---|---|---|
| C1 | PBI-146 | PBI-172 | Define role-to-dashboard mapping and widget zones |
| C2 | PBI-146 | PBI-173 | Implement role-based dashboard shell |
| C3 | PBI-146 | PBI-174 | Add dashboard access checks and blocked-route handling |
| C4 | PBI-146 | PBI-175 | Validate and document PBI-146 |
| C5 | PBI-147 | PBI-176 | Define administrator widget contract |
| C6 | PBI-147 | PBI-177 | Implement administrator dashboard widgets |
| C7 | PBI-147 | PBI-178 | Add administrator widget permission filtering |
| C8 | PBI-147 | PBI-179 | Validate and document PBI-147 |
| C9 | PBI-148 | PBI-180 | Define compliance/review widget contract |
| C10 | PBI-148 | PBI-181 | Implement compliance/review dashboard widgets |
| C11 | PBI-148 | PBI-182 | Add blocked-action handling and status hardening |
| C12 | PBI-148 | PBI-183 | Validate and document PBI-148 |
| C13 | PBI-151 | PBI-188 | Define auditor/security investigation widget contract |
| C14 | PBI-151 | PBI-189 | Implement dashboard investigation widgets |
| C15 | PBI-151 | PBI-190 | Add empty-result, validation, and forbidden-state handling |
| C16 | PBI-151 | PBI-191 | Validate and document PBI-151 |

## Done gates

A task is Done only when implementation or artifact exists, relevant tests pass, acceptance criteria are covered, documentation is updated where applicable, and evidence is available.

An enabler is Done only when the technical capability exists, consuming teams can use it without local redefinition, required contract docs are updated, and tests prove the capability is safe for feature consumption.

A story is Done only when all child tasks are Done and story acceptance criteria are satisfied.

A feature is Done only when required story-level PBIs are Done and PO acceptance is recorded.

## Backlog update rule

At sprint close:

- completed task PBIs get Sprint = Sprint 5 and Status = Completed
- incomplete but started task PBIs get Sprint = Sprint 5 and Status = In-Progress or Blocked
- unstarted planned PBIs remain Planned
- parent stories become Completed only when all child tasks are completed
- parent features or enablers remain In-Progress unless all required child items are completed

Do not merge PBI-005, PBI-002, or PBI-017 before PBI-253 unless a new ADR explicitly changes this rule.
