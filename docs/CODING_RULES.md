# Coding Rules

Status: Draft for Sprint 1 baseline  
Owner: Engineering Lead  
Last updated: YYYY-MM-DD

## 1. Purpose

These rules constrain how code is written so Sprint 1 implementation remains consistent across task-by-task AI-assisted edits.

## 2. Language and quality baseline

- Use TypeScript only for application code.
- Keep strict typing on.
- Do not introduce `any`.
- Do not use non-null assertions unless there is no safer alternative and the reason is documented.
- Prefer explicit return types on public functions and exported methods.
- Prefer `type` imports where applicable.

## 3. Architectural coding rules

1. Do not bypass application services from route handlers.
2. Do not leak infrastructure types into domain models.
3. Do not put business rules only in controllers/handlers.
4. Do not put authorization-only logic inside UI code without backend enforcement.
5. Do not place module-specific business logic in `shared`.
6. Keep each module independently understandable.
7. Encode provisional business assumptions in named constants, policies, or documented schema types, not in magic strings.
8. Do not let generated code silently invent new states, role codes, or error shapes.

## 4. Folder usage

### api
Use for:
- route registration
- request/response DTOs
- transport mapping
- request validation boundary

Do not use for:
- persistence logic
- core business rules

### application
Use for:
- use cases
- orchestration
- repository interfaces
- transaction boundaries
- policy coordination

### domain
Use for:
- entities
- value objects
- invariants
- pure policies

### infrastructure
Use for:
- DB adapters
- repository implementations
- framework integrations
- external service clients

### tests
Use for:
- module-level tests close to behavior under change

## 5. Naming rules

- File names: kebab-case
- Types/interfaces/classes: PascalCase
- Functions/variables: camelCase
- Enum-like status values in code: lower camel or string literal unions
- Public API JSON fields: camelCase

[FLAG-JSON-CONVENTION]
If external integration later requires snake_case, add explicit mapping at the transport boundary. Do not change domain naming to fit transport quirks.

## 6. Validation rules

- Validate request payloads at the API boundary.
- Convert validation-library errors into shared application validation errors.
- Re-check business invariants after parsing whenever persistence state or cross-entity rules matter.
- Never trust UI validation as the only validation layer.
- Where a field is provisional, validate the current allowed shape narrowly and document the assumption.
- Rejected state transitions must produce stable validation or forbidden errors, not silent no-ops.

## 7. Error rules

- Use shared application error classes for business/validation/access failures.
- Do not throw raw strings.
- Do not return ad hoc error JSON from feature handlers.
- Map known business failures to stable error codes.
- Include request correlation data where the platform already supports it.

Expected categories:
- validation
- unauthorized
- forbidden
- not found
- conflict
- external service failure
- unexpected internal failure

## 8. Logging and audit rules

### operational logs
Use for:
- startup/shutdown
- unexpected failures
- infrastructure diagnostics

### audit logs
Use for:
- governance-sensitive writes
- denied protected actions
- selected sensitive reads

### provisional minimum audit fields
Every audit event created in Sprint 1 should be able to carry:
- `actorId`
- `action`
- `targetType`
- `targetId`
- `timestamp`
- `outcome`
- `requestId`

[FLAG-AUDIT-POLICY]
Do not finalize audit implementation details until the audit research outcome is approved.

## 9. HTTP/API rules

- Use REST JSON for Sprint 1.
- Version external routes under `/api/v1`.
- Return consistent success and error envelopes.
- Do not mix multiple response shapes for the same endpoint.
- Prefer opaque public identifiers over exposing DB internals.
- Treat authenticated `userId` as opaque contract data, not as a database assumption.

[FLAG-ID-STRATEGY]
Public ID format is not yet frozen.

## 10. Persistence rules

- Repositories are owned by application/infrastructure boundaries.
- Domain entities must not know ORM or table schemas directly.
- Soft-disable/state transitions are preferred over destructive deletion where governance evidence matters.
- Separate internal system identity from business identifiers where needed.
- Historical records must remain readable after deactivation or revocation.

[FLAG-MEMBERSHIP-STATE-MODEL]
Member organization deletion vs inactive/suspended semantics are still under clarification, but destructive deletion must not be used as a shortcut for normal deactivation.

## 11. Status and workflow rules

- No hidden status values not documented in `STATE_MODELS.md`.
- No final decision states outside `approved`, `rejected`, or `conditionalApproved` unless the docs are updated first.
- Checklist completion must be derived from explicit completion rules, not inferred loosely in UI code.
- Protected function enforcement must be implemented in backend code even if the UI also hides blocked actions.

## 12. Testing rules

For every implementation task:
- add or update happy-path tests
- add or update invalid-path tests
- add authorization/state-guard tests when relevant

For every story completion:
- attach evidence for docs/demo/regression task
- ensure API contract and state-model docs are still accurate

## 13. Aider operating rules

1. One granular task per session.
2. Load architecture/contracts/task files as read-only context.
3. Ask for file plan before edits.
4. Keep edit scope narrow.
5. Run tests before considering task complete.
6. Update durable docs when contract/state behavior changes.
7. Do not ask Aider to resolve business flags implicitly; flags must be handled by explicit approved assumptions or doc updates.

## 14. Prohibited shortcuts

- No direct DB access from route handlers.
- No framework imports in domain layer.
- No hidden status values not documented in `STATE_MODELS.md`.
- No silent fallback behavior for authorization failures.
- No “temporary” contract fields merged without doc updates.
- No hardcoding of role catalogs, protected functions, or review state transitions outside their documented sources of truth.