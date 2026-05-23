# ADR-002: Define MVP authentication and session management boundary

Status: Accepted
Date: 2026-05-23
Owners: Scrum Master / Product Owner / Architecture / Security
Related PBIs: PBI-253, PBI-254, PBI-255, PBI-256, PBI-257, PBI-258, PBI-259, PBI-260, PBI-261, PBI-262
Related requirements: R03 - Permissioned network membership and role management; R22 - Access logging and cryptographic non-repudiation
Related ADR: ADR-001 - Define dashboard authentication boundary and role-based state flow for PBI-017

## Context

The platform already has membership, role assignment, protected-action checks, audit logging, and an actor-context seam. However, it does not yet have a complete MVP authentication/session capability that owns login, session or token issuance, authenticated request validation, logout or invalidation, and trusted actor-context derivation.

PBI-017 is building role-based dashboards and must consume authenticated actor context, but ADR-001 explicitly keeps login, session issuance, logout, account creation, public self-registration, SSO, MFA, and external identity-provider rollout outside PBI-017 scope.

PBI-005, PBI-002, PBI-006, PBI-007, and PBI-015 also need stable actor attribution for audit records, authorization decisions, and protected workflow behavior. If these branches continue using client-authored actor headers or feature-local assumptions, the project risks inconsistent actor identity, weak audit evidence, and merge conflicts across protected route handling.

## Decision

1. The platform will implement a minimal MVP authentication/session capability as a separate branch before merging the three active feature branches for PBI-005, PBI-002, and PBI-017.
2. The auth/session capability will be tracked under PBI-253 and its child tasks PBI-254 through PBI-262.
3. The branch name will be feature/PBI-253-auth-session-management.
4. Protected routes must derive actor identity from the authenticated request lifecycle, not from client-authored actor headers.
5. The authenticated request lifecycle must populate one trusted actor context shape for route handlers and audit emitters.
6. PBI-017 may consume authenticated actor context, but it must not implement login, session issuance, logout, account creation, or public registration.
7. PBI-005, PBI-002, PBI-006, PBI-007, and PBI-015 must consume the approved actor context for protected workflow actor attribution.
8. MVP authentication will use a local platform-owned session or token approach. External enterprise IdP, SSO, MFA, DID/VC federation, password recovery, and public SME self-registration are out of scope for this ADR.
9. Logout or session invalidation must make the issued session or token unusable for future protected requests according to the approved contract.
10. Auth failure responses must follow the existing standardized API error-envelope pattern.
11. Auth/session behavior must be documented in docs/contracts/AUTH_SESSION_CONTRACT.md before implementation is treated as complete.
12. Any expansion beyond the MVP auth/session boundary must be handled by a new ADR or a revision to this ADR.

## Scope boundary

### Inside scope

- MVP login contract.
- Local session or token issuance.
- Session or token validation.
- Authenticated request middleware or plugin boundary.
- Trusted request actor context.
- Logout or session invalidation.
- Invalid, expired, missing, or revoked session handling.
- Integration with protected routes and audit emitters.
- Documentation and tests proving actor context is server-derived.

### Outside scope

- External identity-provider rollout.
- SSO.
- MFA.
- Password recovery.
- Public account creation.
- Public SME self-registration.
- DID/VC federation.
- Authorization policy redesign.
- Role assignment redesign.
- Dashboard UI implementation.

## Required merge order

The auth/session branch is a pre-merge integration gate.

Required order:

1. feature/PBI-253-auth-session-management
2. feature/PBI-005-immutable-audit-trail
3. feature/PBI-002-kyc-aml-onboarding
4. feature/PBI-017-role-based-ui-dashboards

The three feature branches may continue contract or local implementation work in parallel, but production-like protected-route behavior must consume the auth/session capability after it lands on main.

## Actor context rule

The trusted actor context must be derived from validated session or token state.

Minimum actor context fields should include:

- actorUserId
- actorOrganizationId, when applicable
- actorRoleCodes or effective permission context, when applicable
- authenticationSessionId or equivalent correlation reference, when applicable
- authenticationMethod or MVP equivalent label

Client-authored actor headers may be retained only as test scaffolding if explicitly documented and isolated from production protected-route decisions.

## Consequences

### Positive consequences

- Prevents PBI-017 from absorbing auth/session scope.
- Gives PBI-005, PBI-002, PBI-006, PBI-007, and PBI-015 one stable actor attribution seam.
- Strengthens audit evidence by avoiding client-authored actor identity for protected decisions.
- Reduces merge conflict risk by centralizing authentication and actor-context handling.
- Makes future auth upgrades easier because the MVP boundary is explicit.

### Negative consequences

- Adds a pre-merge dependency before the three active feature branches can be treated as production-like.
- Requires feature branches to rebase or merge main after the auth branch lands.
- May require route tests to be updated where they previously depended on raw actor headers.
- Does not solve external IdP, MFA, SSO, or public self-registration needs.

## Implementation guidance

1. Complete PBI-254 before implementing login or middleware behavior.
2. Implement only the MVP auth/session contract needed for protected route integration.
3. Keep public account creation and public registration out of the branch.
4. Use one shared request actor context pattern across protected routes.
5. Keep route-specific authorization separate from authentication.
6. Update tests so protected-route actors come from authenticated request context.
7. Update docs/contracts/AUTH_SESSION_CONTRACT.md as the binding consumer contract.
8. Update API and architecture docs only where the auth boundary changes public or durable behavior.
9. Prepare branch rebase guidance for PBI-005, PBI-002, and PBI-017 after auth lands.

## Validation expectations

The auth/session branch should provide tests or evidence for:

- successful login.
- invalid login.
- issued session or token validation.
- missing session or token rejection.
- invalid session or token rejection.
- expired or revoked session rejection, if represented in the MVP model.
- logout or invalidation.
- protected route access with trusted actor context.
- protected route rejection without valid auth.
- audit actor attribution from trusted request context.

## Status note

PBI-254 finalized the MVP auth/session contract in `docs/contracts/AUTH_SESSION_CONTRACT.md`. Implementation tasks PBI-255 through PBI-260 must follow that contract unless a new ADR revision is approved.
