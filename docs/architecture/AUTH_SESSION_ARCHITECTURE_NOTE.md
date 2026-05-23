# Auth Session Architecture Note

Status: Approved PBI-261 architecture note  
Owner: Platform / Architecture  
Related PBIs: PBI-253, PBI-254, PBI-255, PBI-256, PBI-257, PBI-258, PBI-259, PBI-260, PBI-261  
Related requirements: R03, R22  
Related ADRs: `docs/architecture/adr/ADR-002-auth-session-management-boundary.md`, `docs/architecture/adr/ADR-001-dashboard-authentication-boundary.md`

## 1. Purpose

This note records the implemented MVP auth/session architecture boundary so feature branches can consume authentication and actor context without redefining the semantics locally.

This note complements `docs/architecture/ARCHITECTURE.md` and `docs/contracts/AUTH_SESSION_CONTRACT.md`.

## 2. Boundary decision

PBI-253 owns MVP authentication and session management.

The implemented boundary includes:

- local platform login
- opaque bearer session issuance
- token hash persistence
- authenticated request validation
- trusted actor-context population
- logout/session revocation
- invalid, expired, and revoked session rejection
- compatibility with existing actor-context scaffolding

The implemented boundary excludes:

- external identity provider rollout
- SSO
- MFA
- password recovery
- public account creation
- public SME self-registration
- DID/VC federation
- browser-level dashboard implementation
- route-specific authorization redesign

## 3. Runtime structure

Auth/session behavior is implemented under `src/modules/auth/` with domain, application, API, and infrastructure seams.

Key seams:

- `AuthSession`
- `PlatformUserCredential`
- `AuthSessionRepository`
- `PlatformUserCredentialRepository`
- in-memory MVP auth-session repository
- in-memory MVP platform-user credential repository
- login service
- logout service
- session-token helper
- authenticated-request preHandler
- request actor-context helper

## 4. Actor-context rule

Authenticated request validation populates trusted actor context from server-validated session state.

Protected-route and audit code should consume canonical actor fields:

- `actorUserId`
- `actorOrganizationId`, when present
- `actorRoleCodes`
- `authenticationSessionId`
- `authenticationMethod`
- `isAuthenticated`

Transitional compatibility fields remain available:

- `userId`
- `authorizationContext.roles`

These compatibility fields exist so current protected-route tests and transitional route scaffolding continue to pass while feature branches rebase and migrate. They are not a license to invent new client-authored actor identity sources.

## 5. Authentication vs authorization

Authentication is responsible for validating the session and producing trusted actor context.

Authorization remains separate:

- route-specific role checks remain in route/application logic
- deactivation-aware checks remain in protected-access services
- organization lifecycle checks remain in membership/access-control services
- dashboard role display and routing consume actor context but do not own auth/session mechanics

## 6. Audit attribution rule

Audit emitters for protected actions should attribute actors from trusted actor context.

Audit code must not prefer request body actor IDs or ad hoc client-authored actor headers over authenticated session-derived context.

Where compatibility fallback is required, route code should use the shared request actor-context helper so migration stays centralized.

## 7. Branch-consumer guidance

After this branch lands on `main`, the active feature branches should rebase or merge main and consume the auth/session boundary as follows:

- PBI-005 audit and transaction-history work should use trusted actor context for lifecycle and access-history attribution.
- PBI-002 KYC/AML onboarding work should use trusted actor context for intake ownership, review actions, and audit evidence.
- PBI-017 dashboard work should consume authenticated actor context for role-based dashboard state, but must not implement login, logout, token issuance, or session validation.

## 8. ADR relationship

ADR-002 defines and accepts the auth/session boundary.

ADR-001 remains valid: PBI-017 may depend on authenticated actor context but does not own authentication/session mechanics.

No new ADR is required for PBI-261 because this task documents the implemented boundary without changing it.
