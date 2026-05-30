# Frontend Product Journey

Status: Sprint 6 reference
Owner: Frontend Engineer / Scrum Master
Related PBIs: PBI-263, PBI-282, PBI-333, PBI-006
Related requirements: R03, R05, R06, R17, R22
Related docs:

- `docs/contracts/AUTH_SESSION_CONTRACT.md`
- `docs/architecture/DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md`
- `docs/architecture/dashboard-state-flow.mermaid`
- `docs/architecture/adr/ADR-001-dashboard-auth-boundary-and-state-flow.md`
- `docs/architecture/adr/ADR-002-auth-session-management-boundary.md`

## 1. Purpose

This document defines the product-facing frontend journey for the blockchain procurement MVP.

It prevents the UI from becoming a backlog visualizer. Product screens must express user goals and domain workflows, not internal PBI/task structure.

The target journey is:

```text
Landing page
-> sign in
-> resolved authenticated actor context
-> role dashboard
-> procurement/audit/escrow workflow
-> blockchain proof visibility
-> auditor verification
```

## 2. Product navigation vocabulary

Use product vocabulary in the UI.

Allowed navigation labels:

```text
Home
Sign in
Dashboard
Orders
Escrow
Audit Trail
Blockchain Proof
Compliance
Members
Roles
Shariah Review
Financing
```

Do not use these labels in product navigation or user-facing product cards:

```text
PBI-263
Sprint 6
Feature lane
Story
Task
Enabler
Backlog
```

PBI IDs may appear only in developer docs, backlog rows, evidence files, and commit messages.

## 3. Route map

Minimum Sprint 6 route map:

| Route | Product purpose | Auth required | Notes |
|---|---|---|---|
| `/` | Landing page | No | Default localhost entry point. |
| `/login` | Sign in | No | Credential-only sign-in using issued demo credentials. |
| `/dashboard` | Role dashboard | Yes | Requires authenticated actor context. |
| `/logout` | Logout transition | Yes where possible | Clears local session after backend logout attempt. |
| `/audit` | Audit trail entry | Yes | May route to existing access-history pages. |
| `/audit/events/:eventId` | Audit event detail | Yes | May show blockchain proof panel. |
| `/escrow` | Escrow overview | Yes | Introduced when PBI-006 first slice starts. |
| `*` | Not found or safe fallback | No | Should not silently render dashboard. |

## 4. Landing page information architecture

The landing page should communicate the system in domain language:

1. Hero: digital procurement with verifiable blockchain audit proof.
2. Workflow: onboarding, procurement, escrow, audit, financing.
3. Blockchain proof: event hashes anchored to a permissioned ledger.
4. Islamic finance/PLS seedbed: Shariah-reviewed financing workflow, not a generic lending app.
5. Roles: buyer, supplier, financier, auditor, compliance, Shariah reviewer, administrator.
6. Call to action: sign in to demo environment.

The landing page must not list PBI tasks or sprint artifacts as user-facing content.

## 5. Login and credential journey

The product login page uses issued credentials only. Demo accounts are database-seeded for local supervisor demonstration and documented in runbooks, but the product UI must not show role-card shortcuts, a role picker, or "Continue as" controls.

Recommended seeded roles:

| Demo role | Product purpose |
|---|---|
| administrator | Members, roles, assignments. |
| complianceReviewer | KYC/AML and governed compliance actions. |
| shariahReviewer | Shariah review workflow. |
| auditor | Audit trail and blockchain proof verification. |
| buyer | Order and escrow initiation. |
| supplier | Supplier-side procurement status. |
| financier | Financing/PLS placeholder or future flow. |
| securityOperator | Security investigation placeholder where backend contract is unavailable. |

Login must consume the PBI-253 authentication/session contract where possible:

```text
POST /api/v1/auth/login
Authorization: Bearer <sessionToken>
POST /api/v1/auth/logout
```

The frontend must not derive protected privileges from a role dropdown alone. Demo account selection can prefill credentials, but authorization must remain backend-owned.

## 6. Authenticated frontend session state

Frontend session state should minimally track:

```ts
export type FrontendSessionState =
  | { status: 'anonymous' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; sessionToken: string; expiresAt: string; actor: FrontendActorContext }
  | { status: 'expired' }
  | { status: 'error'; message: string };
```

Actor context should mirror the auth contract without inventing a conflicting model:

```ts
export type FrontendActorContext = {
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId: string;
  authenticationMethod: 'localPassword';
};
```

## 7. Dashboard state entry

The dashboard must not initialize from a hardcoded App-level demo actor in production-like runtime.

Correct flow:

```text
Frontend session authenticated
-> actor context exists
-> dashboard state resolver
-> user lifecycle gate
-> role assignment gate
-> organization state gate
-> dashboard ready, limited, noRole, unsupportedRole, forbidden, or blocked state
```

This document does not replace `DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md`; it connects the upstream login journey to that state model now that PBI-253 exists.

## 8. Dashboard visual principles

The dashboard should look like an operational application.

Minimum UI standards:

- clear sidebar or top navigation
- role and organization context in header
- cards with consistent spacing and hierarchy
- status badges for pending, active, blocked, anchored, failed, and verified states
- empty states that explain next action
- error states that do not expose stack traces
- no raw technical object dumps in primary screens
- no sprint/PBI terminology in product copy

## 9. Blockchain proof journey

The blockchain proof journey must be visible in UI:

```text
Audit or procurement event exists
-> proof panel shows anchor status
-> Fabric transaction reference is displayed when anchored
-> user can request verification
-> result shows verified, mismatch, not found, pending, or failed
```

Proof panel fields should come from `BLOCKCHAIN_ANCHOR_CONTRACT.md` and `BLOCKCHAIN_PROOF_UI_CONTRACT.md`.

## 10. Escrow journey first slice

When PBI-006 starts, the initial frontend journey should be:

```text
Buyer dashboard
-> Escrow
-> view or create escrow first slice
-> escrowCreated status
-> blockchain proof panel for escrowCreated event

Auditor dashboard
-> Audit Trail
-> event detail
-> verify blockchain proof
```

Full settlement, dispute, and PLS distribution UI is future scope unless explicitly pulled into the sprint.

## 11. Validation expectations

Frontend validation evidence should confirm:

- localhost default route opens landing page
- login page is reachable
- login page is credential-only and does not expose role-card shortcuts
- successful login reaches role dashboard
- unauthenticated dashboard access redirects to login
- logout returns user to anonymous flow
- dashboard copy does not expose PBI/task language
- frontend build passes
- build/test/diff-check results are recorded where applicable
