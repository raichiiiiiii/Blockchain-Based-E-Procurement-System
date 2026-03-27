# Architecture

Status: Draft for Sprint 1 baseline  
Owner: Platform / Architecture  
Last updated: YYYY-MM-DD

## 1. Purpose

This document defines the minimum architecture baseline for Sprint 1 so implementation can proceed task-by-task without allowing code generation sessions to invent structure, boundaries, or contracts.

This baseline is intentionally lightweight. It is not a full enterprise architecture document.

## 2. Product and delivery context

The MVP is centralized-first. Optional blockchain anchoring or hybrid patterns are out of Sprint 1 scope unless a later requirement explicitly pulls them in.

Sprint 1 focuses on two requirement families:
- R03: permissioned membership and role/access control
- R20: Shariah governance workflow

## 3. Architectural principles

1. Business rules live in module application/domain layers, not in transport handlers.
2. Domain code must not depend on framework, HTTP, or database libraries.
3. Shared code must stay minimal and only hold cross-cutting primitives.
4. Contracts and state models are written before implementation tasks that consume them.
5. Every implementation task must end with tests and durable documentation updates.
6. Security, authorization, and audit are separate implementation slices, not hidden side work.
7. Unresolved domain details must be expressed as explicit assumptions or flags, not hidden inside code.

## 4. Assumption handling policy

Sprint 1 is allowed to proceed under explicit provisional assumptions where public evidence is strong on structure but not yet strong enough to freeze every business rule.

Rules:
- every assumption must be written in a durable file
- every assumption must be cheap to revise later
- contracts should prefer extension points over brittle hard-coding
- Aider sessions must not silently resolve flagged business decisions on their own

## 5. Current repo shape

```text
backlog/
docs/
feature/
src/
  app/
  modules/
    access-control/
    membership/
    shared/
    shariah-review/
```

## 6. Module ownership

### membership

Owns:
- member organization entity and lifecycle
- member organization registration
- membership uniqueness rules
- organization state transitions

Does not own:
- role catalog
- role assignment rules
- Shariah review workflow

### access-control

Owns:
- role catalog
- role assignment
- permission enforcement
- deactivation-aware access checks

Does not own:
- member organization core data
- Shariah checklist or decision semantics

### shariah-review

Owns:
- review request submission
- checklist model and completion
- governance decisions
- review history and current-status read models

Does not own:
- user identity source of truth
- generic auth middleware

### shared

Owns only:
- auth context shape
- shared error model
- validation helpers
- audit event primitives
- cross-module kernel abstractions

## 7. Layering rule

Allowed dependency direction inside each module:

`api -> application -> domain -> infrastructure`

Rules:
- `api` may depend on application and shared transport concerns.
- `application` coordinates use cases and repositories.
- `domain` contains entities, value objects, policies, invariants.
- `infrastructure` implements repositories, persistence, external adapters.
- `domain` must not import `fastify`, DB clients, ORM types, or transport DTOs.

## 8. Runtime baseline

Current repo evidence suggests the backend baseline is:
- Node.js + TypeScript ESM
- Fastify-style HTTP app and plugins
- JWT-based authentication middleware
- centralized security plugin registration
- shared application error hierarchy
- schema-based request validation helpers

### Sprint 1 repo-scope assumption
For Sprint 1, these docs govern the backend modules in the current repo.
UI work may consume these contracts in parallel, but frontend architecture is not allowed to redefine backend contracts.

[ASSUMPTION-FRONTEND-SCOPE]
Current working assumption:
- backend remains the primary governed implementation surface in this repo
- UI tasks may proceed contract-first
- if a frontend boundary is added later, it must consume these contracts rather than rewrite them

## 9. Cross-cutting architecture

### 9.1 Authentication

Authentication is middleware/plugin based and populates request user context.

### 9.2 User identity assumption

Sprint 1 assumes that authenticated requests can provide:
- a stable opaque `userId`
- a user category or equivalent authorization context
- enough context to attribute audit events

[FLAG-USER-IDENTITY]
Still unresolved:
- source of truth for user lifecycle
- whether users are internal-only, member-facing, or mixed
- whether provisioning is real or scaffolded in Sprint 1

### 9.3 Authorization

Authorization must be enforced in two places:
- route/endpoint entry
- application/service policy checks for sensitive actions

### 9.4 Validation

External input is validated at the API boundary.
Business invariants are re-checked in application/domain logic where required.

### 9.5 Errors

All business and validation failures must map to a shared error envelope.
Handlers must not emit ad hoc response shapes.

### 9.6 Audit

Audit is mandatory for:
- governance-sensitive writes
- denied protected actions
- selected sensitive reads such as review-history access

Minimum provisional audit shape:
- actorId
- action
- targetType
- targetId
- timestamp
- outcome
- requestId

[FLAG-AUDIT-POLICY]
Still unresolved:
- canonical event catalog
- retention/storage policy
- field masking policy
- exact read-audit coverage

## 10. Primary business flows in Sprint 1

### R03 flow family
1. define member organization model
2. implement member organization creation
3. define role catalog
4. implement role catalog management
5. define assignment rules
6. implement assignment
7. define deactivation rules
8. enforce deactivation on protected actions

### R20 flow family
1. define review request schema
2. implement submission
3. define checklist structure
4. implement checklist completion
5. define decision state model
6. implement decision capture
7. define history query model
8. implement current-status/history read model

## 11. Architecture decisions for Sprint 1

### AD-01: contract-first before build
Definition tasks are true prerequisites for downstream API/UI tasks.

### AD-02: one Aider session per granular task
Aider is used as a scoped task executor, not as project memory.

### AD-03: durable files as memory
Architecture, contracts, state models, and task plan must be updated as durable repo files after each completed slice.

### AD-04: backend-first governed baseline
Sprint 1 assumes backend-first governance, with UI work consuming stable contracts.

### AD-05: assumption-first where evidence is incomplete
Where exact business semantics are not final, the repo may proceed only with explicit provisional assumptions and extension-friendly models.

## 12. Testing strategy

Testing layers:
- module/unit tests near each module
- integration tests for API + persistence slices
- e2e tests for story-level flows

Minimum rule:
- every implementation task must add or update tests
- every story-closing validation task must attach evidence

## 13. Provisional Sprint 1 baselines

### membership baseline
- provisional initial state: `pendingReview`
- provisional state set includes `pendingReview`, `active`, `inactive`, `suspended`, `deleted`
- inactive records remain viewable
- deactivation is soft-disable, not destructive deletion

### role and assignment baseline
- RBAC structure is fixed
- role definitions are separate from assignments
- only active roles may be assigned
- duplicate active assignment of the same role to the same user in the same organization is not allowed

### review workflow baseline
- initial review state is `submitted`
- checklist and decisioning are separate phases
- final outcomes are `approved`, `rejected`, and `conditionalApproved`
- history read model must support incomplete progression without error

## 14. Open flags

[FLAG-MEMBERSHIP-INITIAL-STATE]
Provisional assumption is `pendingReview`, but backlog wording that implies immediate `active` must still be reconciled.

[FLAG-USER-IDENTITY]
Assignment and deactivation still depend on the user source-of-truth model and user categories.

[FLAG-ROLE-CATALOG]
RBAC structure is fixed, but exact role taxonomy, role codes, and reserved-role policy are not yet frozen.

[FLAG-SHARIAH-SUBMISSION-METADATA]
Structured submission is required, but the exact mandatory field set may still expand.

[FLAG-CHECKLIST-SOURCE]
Provisional assumption is seeded reference data for Sprint 1; longer-term configurability is not frozen.

[FLAG-CONDITIONAL-APPROVAL]
Conditional approval is supported, but expiry, closure, and follow-up ownership are not yet frozen.

[FLAG-AUDIT-POLICY]
Minimum audit scaffolding is set, but final audit policy is not yet fully approved.
