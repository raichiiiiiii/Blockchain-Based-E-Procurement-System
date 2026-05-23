# PBI-261 Auth Session Documentation Evidence

## Scope

PBI-261 documents the implemented PBI-253 auth/session boundary for API, architecture, and Sprint 5 branch consumers.

Feature: PBI-253  
Task: PBI-261  
ReqIDs: R03, R22

## Files Changed

- `docs/contracts/AUTH_SESSION_API_CONSUMER_NOTE.md`
- `docs/architecture/AUTH_SESSION_ARCHITECTURE_NOTE.md`
- `docs/sprint-planning/PBI-253_AUTH_BRANCH_CONSUMPTION_NOTE.md`
- `docs/evidence/pbi-closure/PBI-261_AUTH_SESSION_DOCS_EVIDENCE.md`

## Documented Behavior

The new notes document:

- login endpoint behavior
- logout endpoint behavior
- bearer session validation
- trusted actor-context shape
- transitional legacy actor-context compatibility fields
- authentication versus authorization boundary
- audit attribution rule
- branch-consumption guidance for PBI-005, PBI-002, and PBI-017

## Durable Sources

- `docs/contracts/AUTH_SESSION_CONTRACT.md` remains the detailed binding auth/session contract.
- `docs/contracts/API_CONTRACTS.md` remains the global API contract source for base path, envelopes, auth convention, and actor-source rule.
- `docs/contracts/AUTH_SESSION_API_CONSUMER_NOTE.md` adds the auth/session API consumer summary without rewriting the large API contract file.
- `docs/architecture/AUTH_SESSION_ARCHITECTURE_NOTE.md` records the implemented module and runtime boundary.
- `docs/sprint-planning/PBI-253_AUTH_BRANCH_CONSUMPTION_NOTE.md` records branch guidance for active Sprint 5 feature branches.

## ADR Position

ADR-002 remains the accepted auth/session boundary.

ADR-001 remains valid because PBI-017 consumes authenticated actor context but does not own login, logout, session issuance, or session validation.

## Validation Evidence

This task is documentation-only.

Before this documentation update, PBI-260 validation passed:

```text
node --loader ts-node/esm --test src/modules/auth/api/auth-regression.test.ts src/modules/auth/application/logout-user.test.ts src/modules/auth/api/auth.routes.test.ts src/modules/auth/api/authenticated-request.test.ts src/modules/auth/application/login-user.test.ts src/modules/auth/domain/auth-session.test.ts src/modules/auth/domain/platform-user-credential.test.ts
npm run build
npm test
```

## Notes

This task implements PBI-261 only.

Out of scope:

- code changes
- test changes
- new auth behavior
- route authorization redesign
- broad SDLC rewrite
- PBI-262 final merge-gate checklist

## Closure Decision

PBI-261 is ready to close because login, session validation, logout, actor-context consumption, and feature-branch consumption guidance are documented in durable repo files.
