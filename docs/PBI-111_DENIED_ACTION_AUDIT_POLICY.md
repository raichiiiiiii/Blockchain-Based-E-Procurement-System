# PBI-111: Denied Protected-Action Audit Policy

## Title and purpose

This document defines the approved policy for denied protected-action audit behavior. Its purpose is to standardize when and how denied protected actions must be audited, and to provide an implementation-ready payload definition for denied-action audit events.

## Inputs and dependency basis

- PBI-110 audit inventory findings
- `API_CONTRACTS.md`
- `ARCHITECTURE.md`
- `CODING_RULES.md`
- current audit event implementations in:
  - `src/modules/membership/application/audit/create-member-organization-audit-event.ts`
  - `src/modules/access-control/application/audit/create-role-audit-event.ts`
  - `src/modules/access-control/application/audit/create-role-assignment-audit-event.ts`
  - `src/modules/shariah-review/application/audit/submit-shariah-review-audit-event.ts`

## Current-state problem summary

PBI-110 audit inventory revealed these gaps in denied-action audit coverage:

1. No currently protected route clearly emits forbidden-action audit events
2. Denied and invalid outcome audit coverage is inconsistent across protected routes
3. requestId presence is inconsistent across modules in audit events
4. Error-outcome audit coverage varies:
   - `POST /roles` audits success and conflict
   - `PATCH /roles/:roleId` audits success and notFound
   - `POST /role-assignments` audits success, conflict, and validationError
   - Other protected routes audit success only
5. Success auditing is much more standardized than denied/error auditing

## Approved policy rule

Protected routes must emit audit events for all denied outcomes that represent intentional security or business rule enforcement. This includes:

- Forbidden actions (authorization failures)
- Not found resources when the absence is security-sensitive
- Validation errors that represent business rule violations
- Conflict errors that represent intentional duplicate prevention

Routes must not emit audit events for:
- Schema validation failures at the transport boundary
- Infrastructure errors (database failures, etc.)
- Non-security-sensitive not found cases

## Minimum payload definition

All denied-action audit events must include these fields:

- `action`: The attempted action name (e.g., "createRole", "assignRole")
- `targetType`: The type of resource being acted upon (e.g., "role", "roleAssignment")
- `targetId`: The identifier of the resource when available; when not available, use a placeholder value that preserves auditability without leaking sensitive information
- `actorId`: The authenticated user who attempted the action (from trusted `request.actorContext.userId`)
- `requestId`: The request correlation identifier
- `timestamp`: The time of the attempt (ISO 8601 UTC)
- `outcome`: The outcome category ("forbidden", "notFound", "validationError", "conflict")
- `reason`: A stable code or message describing the reason for the denial

## Route application classes

Protected routes fall into these application classes for audit policy:

1. **Membership creation** (`POST /member-organizations`)
   - Currently not protected but may become protected
   - Audits success writes
   - Would audit forbidden if protected

2. **Role management** (`POST /roles`, `PATCH /roles/:roleId`)
   - Protected by admin authorization
   - Audits success writes
   - Must audit forbidden, notFound, conflict

3. **Role assignment** (`POST /role-assignments`, `DELETE /role-assignments`, `PATCH /role-assignments/change`)
   - Protected by admin authorization
   - Audits success writes
   - Must audit forbidden, validationError, conflict

4. **Shariah review submission** (`POST /shariah-reviews`)
   - Protected by organization membership
   - Audits success writes
   - Must audit forbidden, validationError

## Outcome matrix

| Outcome Category | Always Audited | Sometimes Audited | Never Audited | Notes |
|------------------|----------------|-------------------|---------------|-------|
| Success | All protected routes | N/A | N/A | Already implemented per PBI-110 |
| Forbidden | All protected routes | None | None | New requirement |
| NotFound | Security-sensitive cases | Non-sensitive cases | Infrastructure failures | Context-dependent |
| ValidationError | Business rule violations | Schema validation | Malformed requests | Implementation boundary matters |
| Conflict | Intentional duplicates | Accidental duplicates | Infrastructure races | Policy intent matters |
| InternalError | None | Exceptional diagnostics | Normal flow | Operational logging, not audit |

## Explicit exclusions

This policy does not:

- Require audit events for schema validation failures at the API boundary
- Require audit events for infrastructure-level failures (DB connection errors, etc.)
- Define exact audit event storage, retention, or masking policies
- Finalize the complete audit event type taxonomy
- Does not fully resolve `FLAG-AUDIT-POLICY` beyond denied-action behavior
- Mandate audit events for non-protected routes

## Follow-up implementation mapping

This policy identifies the following downstream implementation work:

1. Add forbidden-action audit emission to role management routes (`PBI-112`)
2. Standardize denied-action audit coverage in role assignment routes (`PBI-113`)
3. Add forbidden-action audit emission to Shariah review submission route (`PBI-114`)
4. Standardize requestId inclusion across all audit events (`PBI-115`)
5. Document and test the complete denied-action audit behavior (`PBI-116`)

## Open items not closed here

The following remain open after this policy:

- `FLAG-AUDIT-POLICY`
  - Complete audit event catalog
  - Storage and retention policy
  - Field masking policy
  - Read-audit coverage for sensitive history access
- `FLAG-ACTOR-SOURCE`
  - Exact trusted request-context shape (only impacts field sourcing, not policy)
- Audit event type naming conventions
- Cross-module audit event consistency beyond the minimum payload
