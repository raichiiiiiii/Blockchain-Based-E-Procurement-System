# PBI-254 Auth Session Contract Evidence

## Scope

PBI-254 defines the MVP authentication/session contract and threat assumptions for PBI-253.

Feature: PBI-253  
Task: PBI-254  
ReqIDs: R03, R22

## Files Changed

- `docs/contracts/AUTH_SESSION_CONTRACT.md`
- `docs/architecture/adr/ADR-002-auth-session-management-boundary.md`
- `docs/evidence/pbi-closure/PBI-254_AUTH_SESSION_CONTRACT_EVIDENCE.md`

## Contract Decisions

The contract defines:

- MVP bearer session strategy
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- session record semantics
- active, expired, and revoked session states
- default 8-hour MVP session duration
- trusted actor context shape
- server-derived actor-context rule
- missing, malformed, invalid, expired, and revoked authentication failure responses
- separation between authentication and route-specific authorization
- audit expectations for login/logout/session failures
- threat assumptions and security rules

## Explicit Exclusions

The contract excludes:

- external IdP
- SSO
- MFA
- password recovery
- DID/VC federation
- public account creation
- public SME self-registration
- dashboard UI behavior
- route-specific authorization redesign

## Downstream Guidance

The contract gives downstream guidance for:

- backend protected routes
- audit emitters
- PBI-017 dashboard consumers
- PBI-005, PBI-002, PBI-006, PBI-007, and PBI-015 protected workflows

## ADR Status

ADR-002 is accepted after PBI-254 because the MVP auth/session boundary and consumer contract are now defined.

## API Contract Note

`docs/contracts/API_CONTRACTS.md` already defines the global authentication convention that protected endpoints expect `Authorization: Bearer <token>` and that protected actions and sensitive reads derive actor identity from authenticated server-side request context.

The detailed binding contract is now `docs/contracts/AUTH_SESSION_CONTRACT.md`.

## Validation Status

This task is documentation-only.

No runtime implementation was changed.

No runtime tests are required.

## Closure Decision

PBI-254 is ready to close because:

- login, session, logout, invalid-session, and actor-context semantics are documented
- implementation tasks can consume the approved contract
- auth failure responses align with the standard API error-envelope family
- threat assumptions and exclusions are explicit
