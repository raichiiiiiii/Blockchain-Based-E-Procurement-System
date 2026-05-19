# PBI-106: Trusted Actor-Context Boundary Proposal

## Title and purpose

This document proposes the trusted actor-context boundary and migration approach for protected backend actions. Its purpose is to define one approved request-actor pattern for downstream implementation while keeping unresolved flags explicit.

## Inputs and dependencies

- PBI-105 actor-source inventory
- `API_CONTRACTS.md`
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- current route implementations in:
  - `src/modules/membership/api/routes.ts`
  - `src/modules/access-control/api/routes.ts`
  - `src/modules/shariah-review/api/routes.ts`

## Current-state summary from PBI-105

The current protected-route baseline still depends on raw client-supplied actor scaffolding:

- `x-actor-id` is currently used for audit attribution in protected routes
- `x-actor-role` is currently used in access-control routes for authorization checks
- protected routes are not yet consuming one shared trusted server-derived actor context
- audit emitters currently derive actor identity from the same client-supplied scaffolding

This creates inconsistency between the intended durable baseline and current implementation reality.

## Proposed trusted actor-context boundary

Trusted actor data should enter the request lifecycle at a single server-side authentication boundary.

Proposed boundary:

1. authentication middleware or plugin validates the inbound authenticated request
2. trusted actor data is derived from that server-side authentication result
3. the middleware/plugin attaches normalized trusted actor context to the request
4. route handlers consume the normalized trusted actor context
5. audit emitters consume actor identity from that same trusted request context
6. protected routes must not trust client-authored actor identity headers or body fields as the source of truth

This keeps authorization and audit attribution aligned to one server-derived boundary.

## Proposed request-context shape

This proposal does **not** finalize the exact long-term context shape. That remains partially open under `FLAG-ACTOR-SOURCE`.

However, the candidate minimum trusted actor context for implementation should support:

- `userId`: stable opaque actor identifier
- `authorizationContext`: enough server-derived authorization information for protected route checks
- `isAuthenticated`: whether trusted authentication context is present

Illustrative candidate shape:

```ts
type TrustedActorContext = {
  userId: string;
  authorizationContext: {
    roles?: string[];
    userCategory?: string;
  };
  isAuthenticated: boolean;
};
```

Notes:
- `roles` are illustrative, not yet the only allowed model
- `userCategory` remains compatible with the architecture baseline that only assumes enough authorization context exists
- multi-tenant fields must not be invented here unless a later approved requirement needs them

## Proposed route-consumption pattern

Protected route handlers should follow one pattern:

1. read trusted actor data from normalized request actor context
2. do not read `x-actor-id` or `x-actor-role` as trusted inputs
3. use trusted actor context for authorization checks
4. pass trusted actor identity to audit emitters
5. pass actor context or actor-derived values explicitly to downstream application services when needed

Allowed route behavior:
- `request.actorContext.userId` for actor identity
- `request.actorContext.authorizationContext` for authorization decisions

Disallowed route behavior:
- direct trust in `x-actor-id`
- direct trust in `x-actor-role`
- mixed precedence rules between token-derived and header-derived actor data

## Transitional scaffolding rule

During migration:

- `x-actor-*` scaffolding may remain only as temporary local/transitional scaffolding
- it is not authoritative public-contract input
- new protected-route work must not introduce additional trusted dependence on `x-actor-*`
- migrated routes must consume trusted actor context instead
- removal of transitional scaffolding should be tracked explicitly in follow-up implementation tasks

## Affected-route migration map

### membership
- `POST /member-organizations`
  - current: audit attribution depends on `x-actor-id`
  - migrate to: trusted request actor context for actor identity

### access-control
- `POST /roles`
  - current: authorization depends on `x-actor-role`; audit depends on `x-actor-id`
  - migrate to: trusted request actor context for both authorization and audit
- `PATCH /roles/:roleId`
  - current: authorization depends on `x-actor-role`; audit depends on `x-actor-id`
  - migrate to: trusted request actor context for both authorization and audit
- `POST /role-assignments`
  - current: authorization depends on `x-actor-role`; audit depends on `x-actor-id`
  - migrate to: trusted request actor context for both authorization and audit
- `DELETE /role-assignments`
  - current: authorization depends on `x-actor-role`; audit depends on `x-actor-id`
  - migrate to: trusted request actor context for both authorization and audit
- `PATCH /role-assignments/change`
  - current: authorization depends on `x-actor-role`; audit depends on `x-actor-id`
  - migrate to: trusted request actor context for both authorization and audit

### shariah-review
- `POST /shariah-reviews`
  - current: actor attribution depends on `x-actor-id`
  - migrate to: trusted request actor context for submission actor identity and audit attribution

## Follow-up implementation work

This proposal identifies the following downstream implementation work:

1. implement a shared request actor-context boundary (`PBI-107`)
2. refactor protected backend consumers to use trusted actor context (`PBI-108`)
3. test and document trusted actor-context integration (`PBI-109`)
4. continue denied-action audit-policy work separately (`PBI-110`, `PBI-111`, `PBI-091`)
5. apply the approved actor boundary to review-submission hardening and role-assignment authorization hardening (`PBI-088`, `PBI-096`)

## Explicit exclusions

This proposal does not:

- implement middleware or plugin code
- choose a production auth provider
- finalize token format details
- resolve `FLAG-AUDIT-POLICY`
- normalize denied-action audit semantics
- silently close `FLAG-ACTOR-SOURCE`

## Open flags / decisions not closed here

The following remain open after this proposal:

- `FLAG-ACTOR-SOURCE`
  - exact long-term trusted request-context shape
  - final migration completion boundary
- `FLAG-AUDIT-POLICY`
  - denied-action audit standardization
  - event catalog and retention/masking detail
- `FLAG-USER-IDENTITY`
  - user lifecycle/source-of-truth details beyond stable opaque actor identity