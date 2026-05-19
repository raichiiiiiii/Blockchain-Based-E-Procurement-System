# PBI-105: Actor Source Usage Inventory

## Title and Purpose

This document inventories current actor-source usage in protected routes and audit emitters to establish a baseline for implementing secure, reusable foundations for protected backend actions.

## Scope Inspected

- src/modules/membership/api/routes.ts
- src/modules/access-control/api/routes.ts
- src/modules/shariah-review/api/routes.ts
- src/app/server.ts

## Summary Findings

1. Protected write routes currently depend on raw client-supplied actor headers (`x-actor-id`, `x-actor-role`) where actor identity or authorization is enforced.
2. Actor identity is currently extracted from request headers rather than from a trusted server-derived auth context in the inspected protected routes.
3. Audit events in the inspected protected routes are emitted with `actorId` sourced from the same client headers.
4. A consistent server-side authenticated actor context is the intended durable baseline, but it is not yet the runtime source of truth in the inspected protected routes.
5. Current modules show repeated transitional scaffolding patterns that should be migrated in Wave 4.

## Route Inventory Table

| Module | Method | Route | Protected or not | Current authorization signal | Current actorId source | Current actorRole source | Audit emitted | Raw client-supplied actor dependency? | Notes |
|---|---|---|---|---|---|---|---|---|---|
| membership | POST | /member-organizations | Protected write / transitional | No trusted auth boundary visible in inspected route | x-actor-id header | N/A | Yes | Yes | Uses client header for audit attribution |
| access-control | POST | /roles | Protected | x-actor-role header | x-actor-id header | x-actor-role header | Yes | Yes | Admin check and audit both rely on client headers |
| access-control | PATCH | /roles/:roleId | Protected | x-actor-role header | x-actor-id header | x-actor-role header | Yes | Yes | Admin check and audit both rely on client headers |
| access-control | GET | /roles | Not protected | None | N/A | N/A | No | No | Public/read route in current implementation |
| access-control | POST | /role-assignments | Protected | x-actor-role header | x-actor-id header | x-actor-role header | Yes | Yes | Admin check and audit both rely on client headers |
| access-control | DELETE | /role-assignments | Protected | x-actor-role header | x-actor-id header | x-actor-role header | Yes | Yes | Admin check and audit both rely on client headers |
| access-control | PATCH | /role-assignments/change | Protected | x-actor-role header | x-actor-id header | x-actor-role header | Yes | Yes | Admin check and audit both rely on client headers |
| shariah-review | POST | /shariah-reviews | Protected | Current protected submission path still depends on transitional actor handling | x-actor-id header | N/A | Yes | Yes | Actor attribution still depends on client header scaffolding |

## Audit Emitter Inventory Table

| Module | Event / action | Emitted from route/path | actorId source | requestId source | Outcome variants seen | Raw client-supplied actor dependency? | Notes |
|---|---|---|---|---|---|---|---|
| membership | createMemberOrganization | POST /member-organizations | x-actor-id header | request.id | success | Yes | Audit actor comes from client header |
| access-control | createRole | POST /roles | x-actor-id header | request.id | success, conflict | Yes | Audit actor comes from client header |
| access-control | updateRole | PATCH /roles/:roleId | x-actor-id header | request.id | success, notFound | Yes | Audit actor comes from client header |
| access-control | createRoleAssignment | POST /role-assignments | x-actor-id header | request.id | success, conflict, validationError | Yes | Audit actor comes from client header |
| access-control | removeRoleAssignment | DELETE /role-assignments | x-actor-id header | request.id | success | Yes | Audit actor comes from client header |
| access-control | changeRoleAssignment | PATCH /role-assignments/change | x-actor-id header | request.id | success | Yes | Audit actor comes from client header |
| shariah-review | submitShariahReview | POST /shariah-reviews | x-actor-id header | request.id | success | Yes | Audit actor comes from client header scaffolding |

## Raw Client-Supplied Actor Dependency List

1. `membership` module `POST /member-organizations` depends on `x-actor-id` for audit attribution.
2. `access-control` module `POST /roles` depends on `x-actor-id` and `x-actor-role`.
3. `access-control` module `PATCH /roles/:roleId` depends on `x-actor-id` and `x-actor-role`.
4. `access-control` module `POST /role-assignments` depends on `x-actor-id` and `x-actor-role`.
5. `access-control` module `DELETE /role-assignments` depends on `x-actor-id` and `x-actor-role`.
6. `access-control` module `PATCH /role-assignments/change` depends on `x-actor-id` and `x-actor-role`.
7. `shariah-review` module `POST /shariah-reviews` depends on `x-actor-id`.

## Initial Migration Impact Notes

1. Protected routes that currently authorize from `x-actor-role` will need a trusted server-derived actor context source.
2. Audit emitters that currently attribute `actorId` from `x-actor-id` will need to consume actor identity from the trusted request context instead.
3. Transitional header-based tests will need to migrate toward mocked/authenticated request context once the boundary is implemented.
4. Route protection and audit attribution should converge on one shared actor-context boundary rather than per-route header parsing.

## Explicit Out-of-Scope Note

This inventory:
- does not implement the auth boundary
- does not finalize the trusted actor-context shape
- does not resolve `FLAG-ACTOR-SOURCE`
- does not resolve `FLAG-AUDIT-POLICY`
- does not make code changes