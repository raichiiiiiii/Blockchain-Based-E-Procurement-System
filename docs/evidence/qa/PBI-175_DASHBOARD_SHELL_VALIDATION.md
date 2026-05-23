# PBI-175 Dashboard Shell Validation Evidence

## PBI Summary and Scope

This evidence file validates the PBI-146 dashboard shell work completed through:

- PBI-172 — dashboard shell contract, role-to-dashboard mapping, navigation model, and widget zones
- PBI-173 — dashboard shell and role-based navigation implementation
- PBI-174 — dashboard access checks, blocked-route handling, and shared error-state behavior

This task is a validation/evidence task. It does not implement new widgets or authentication behavior.

## Validation Source and Review Mode

Validation was performed by remote repository inspection on branch:

```text
feature/PBI-017-role-based-ui-dashboards
```

Important source-control note:

- The branch is currently ahead of `main` but also behind `main`.
- ADR-001 was inspected from `origin/main` and is treated as the controlling decision for this evidence.
- Before final merge, the branch should be reconciled with `main` so `docs/architecture/adr/ADR-001-dashboard-auth-boundary-and-state-flow.md` is present in the merge base/history used for review.

## Files Inspected

Backlog and planning:

- `backlog/backlog.csv`
- `docs/sprint-planning/SPRINT5_TASKS.md`

Architecture and contracts:

- `docs/architecture/adr/ADR-001-dashboard-auth-boundary-and-state-flow.md` from `origin/main`
- `docs/contracts/API_CONTRACTS.md`
- `docs/architecture/STATE_MODELS.md`
- `docs/architecture/DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md`
- `docs/architecture/dashboard-state-flow.mermaid`

Prior evidence:

- `docs/evidence/qa/PBI-172_DASHBOARD_SHELL_CONTRACT.md`
- `docs/evidence/qa/PBI-173_DASHBOARD_SHELL_IMPLEMENTATION.md`
- `docs/evidence/qa/PBI-174_DASHBOARD_ACCESS_HARDENING.md`

Frontend implementation:

- `src/frontend/App.tsx`
- `src/frontend/types/dashboard.ts`
- `src/frontend/lib/dashboard-contract.ts`
- `src/frontend/components/dashboard/DashboardShell.tsx`
- `src/frontend/components/dashboard/DashboardNavigation.tsx`
- `src/frontend/components/dashboard/DashboardWidgetZone.tsx`
- `src/frontend/components/dashboard/DashboardStateMessage.tsx`
- `src/frontend/pages/RoleManagementPage.tsx`
- `src/frontend/api/http-client.ts`

Test/build configuration:

- `package.json`
- `scripts/run-tests.mjs`
- `tsconfig.frontend.json`
- `vite.config.ts`

## Files Changed by PBI-175

- `docs/evidence/qa/PBI-175_DASHBOARD_SHELL_VALIDATION.md`

No implementation files were changed by this evidence update.

## ADR-001 Alignment Checklist

| ADR-001 rule | Validation result | Evidence / note |
|---|---|---|
| PBI-017 must not implement login, session issuance, logout, public account creation, or public self-registration. | Pass for current implementation. | The frontend uses a local `demoUserContext` only and does not implement production auth/session flows. |
| PBI-017 should start after resolved actor context exists. | Partial / scaffold only. | `App.tsx` creates a local demo context rather than consuming a real server-derived actor context. This is acceptable only as temporary demo scaffolding. |
| Dashboard role resolution must not imply backend authorization. | Pass with limitation. | State messages and evidence state that backend authorization remains authoritative. |
| Frontend role labels must not grant backend privileges. | Pass with limitation. | The dashboard role is used for UI shell visibility. Backend protected routes still determine real authorization. |
| Only active role assignments should influence dashboard access. | Gap. | Current shell consumes a string list of role codes; it does not yet consume role assignment status. |
| Revoked assignments must not grant dashboard access. | Gap. | No assignment-status input exists in the dashboard shell initializer. |
| Inactive roles must not appear as assignable controls. | Not validated in dashboard shell. | Role catalog assignability belongs to access-control/role-management UI, not the dashboard shell evidence. |
| Inactive users must resolve to access-blocked before role selection. | Gap. | Current dashboard initializer does not accept user status. |
| `pendingReview` organizations must see limited/status dashboard, not full operational dashboard. | Gap. | Current dashboard initializer does not accept organization status. |
| `inactive`, `suspended`, and `deleted` organizations must not receive operational protected-write affordances. | Gap. | Current dashboard shell does not gate by organization status. |
| Buyer, supplier, and financier areas may exist only as placeholders/disabled until backend workflow contracts are approved. | Pass. | These areas are placeholder-targets/widgets, not completed business workflow widgets. |
| Contract-backed widgets may be implemented only for stable backend areas. | Partial. | The shell exposes stable navigation targets for membership/RBAC and Shariah pages; most widgets remain placeholders. |

## Role-to-Dashboard Validation Summary

### Confirmed

The dashboard contract layer implements the canonical dashboard role list:

- `administrator`
- `buyer`
- `supplier`
- `financier`
- `complianceReviewer`
- `shariahReviewer`
- `auditor`
- `securityOperator`

The contract layer also implements deterministic landing priority through `getHighestPriorityRole(...)`.

### Limitation

Role resolution currently accepts raw role-code strings. It does not yet model:

- active vs revoked role assignments
- active vs inactive role catalog state
- server-derived actor/session source
- organization-scoped assignment validity

This means the current role resolver is suitable for the PBI-173/PBI-174 shell scaffold, but not sufficient as the final ADR-001-complete actor-context resolver.

## Navigation and Blocked-Route Validation Summary

### Confirmed

- `DashboardNavigation` filters navigation groups by active dashboard role.
- `resolveDashboardTargetAccess(...)` returns:
  - `allowed`
  - `forbidden`
  - `unavailable`
  - `unknown`
- Direct attempts to a known target outside the active role map to `forbidden`.
- Placeholder or unimplemented targets map to `unavailable` and are handled by the dashboard error path.
- Unknown targets map to `unknown` and are handled by the dashboard error path.

### Code hygiene note

`App.tsx` contains an unused/incorrect attempt to inspect target info via:

```ts
Object.values(resolveDashboardTargetAccess as any)
```

This does not affect the current page-key switch behavior because routing is ultimately handled by the local `targetToPageKey` map, but it should be removed in a future cleanup task.

## Shared Shell State Validation Summary

### Confirmed

The shell has shared rendering for:

- `noRole`
- `unsupportedRole`
- `forbidden`
- `loading`
- `error`

The `forbidden` state explicitly states that backend authorization remains authoritative for protected actions.

### Limitation

The top-level `App.tsx` state currently narrows runtime dashboard shell override to:

```ts
'ready' | 'forbidden' | 'error'
```

The other shell states are produced by `initializeDashboardShell(...)` rather than the top-level page handler. This is acceptable for the current scaffold, but future tests should exercise all states from the contract layer.

## pendingReview Limited/Status Behavior Result

Status: **Gap identified.**

Current implementation does not include an organization-state input or gate in the dashboard shell initializer.

ADR-001 requires `pendingReview` organizations to see a limited/status dashboard or onboarding-status experience, not the full operational dashboard.

Required follow-up:

- Add organization-status input to the dashboard shell context.
- Render `pendingReview` as limited/status-only.
- Hide or disable protected-write affordances for `pendingReview` organizations.
- Add evidence/tests for this state.

## Inactive/Suspended/Deleted Organization Behavior Result

Status: **Gap identified.**

Current implementation does not include organization-state gating for:

- `inactive`
- `suspended`
- `deleted`

ADR-001 requires those states to route to blocked or status-only views for operational actions.

Required follow-up:

- Add organization-state gate before rendering operational dashboard widgets/actions.
- Route `inactive`, `suspended`, and `deleted` organizations to safe blocked/status-only states.
- Verify protected-write affordances are absent or disabled.

## Inactive User Behavior Result

Status: **Gap identified.**

Current dashboard shell does not accept or evaluate user status.

ADR-001 requires inactive users to resolve to an access-blocked state before dashboard role selection.

Required follow-up:

- Add user-status input to the dashboard shell context.
- Block inactive users before role-resolution logic.
- Add validation evidence for inactive-user behavior.

## Widget Readiness Confirmation

| Widget area | ADR-001 classification | Current branch result |
|---|---|---|
| Membership / RBAC | contract-backed | Navigation exists for member onboarding, role management, and role assignment. Widget rendering remains placeholder-based. |
| Shariah Review | contract-backed | Navigation exists for submission/checklist/decision/history pages. Widget rendering remains placeholder-based. |
| Audit / Access History | contract-backed when contracts stable | Auditor/security navigation exists, but access-history targets are placeholder/unavailable in dashboard target registry. |
| KYC / AML | contract-pending | Compliance reviewer navigation exists for KYC/AML placeholders; no completed KYC/AML widget implementation is claimed. |
| Buyer | placeholder | Buyer targets are placeholder/unavailable. |
| Supplier | placeholder | Supplier targets are placeholder/unavailable. |
| Financing / PLS | placeholder | Financier targets are placeholder/unavailable. |

## Representative State/Role Evidence

### Administrator ready-state shell

Expected from current demo scaffold:

```text
Dashboard Shell State: ready
Demo Role Context: administrator
Navigation Groups:
- Membership
  - Member Onboarding
  - Member Management
- Access Control
  - Role Management
  - Role Assignment
Widget Zones:
- Summary
- Primary
- Secondary
- Actions
- Alerts
- Investigation
```

Notes:

- `Member Onboarding`, `Role Management`, and `Role Assignment` are available page targets.
- `Member Management` is registered as a placeholder target and should resolve to unavailable/error rather than a real page.
- This evidence is for frontend shell behavior only, not backend authorization.

### Shared forbidden state

Expected behavior:

```text
Dashboard Shell State: forbidden
Message: Access is blocked in the dashboard shell.
Boundary: Backend authorization remains authoritative for protected actions.
```

Notes:

- This is a UX guard.
- It does not prove backend authorization success or failure.
- Backend protected endpoints remain the final authority.

### noRole and unsupportedRole contract behavior

Expected from `initializeDashboardShell(...)`:

```text
[] -> shellState: noRole
[unsupportedRole] -> shellState: unsupportedRole
```

Notes:

- These are implemented in the contract layer.
- The current app does not expose a role selector to manually exercise them from the UI.

## Validation Commands and Results

Manual validation was executed locally by the developer and reported as passing on 2026-05-23.

```bash
npm run frontend:build
# PASS

npm run build
# PASS

npm test
# PASS

git diff --check
# PASS
```

Remote inspection result:

- The evidence file was updated by repository inspection.
- Local command execution was performed by the developer and reported back as all passed.
- No implementation changes were made as part of this validation evidence update.

## Closure Assessment

PBI-146 shell foundation is partially validated:

- PBI-172 contract artifacts exist.
- PBI-173 shell/navigation scaffold exists.
- PBI-174 route access and shared negative-state handling exist.
- ADR-001-aligned state-flow reference docs exist.
- Required build/test/whitespace validation commands were reported as passing locally.

However, PBI-146 should be closed only with explicit acknowledgement that the following ADR-001 validation expectations are not implemented yet:

1. `pendingReview` limited/status dashboard.
2. inactive user blocked-before-role-resolution behavior.
3. inactive/suspended/deleted organization blocked/status-only behavior.
4. role assignment status gating (`active` only; `revoked` ignored).
5. real server-derived actor context integration.

If the Scrum Master / PO accepts those items as follow-up scope, PBI-175 may close as evidence for the current shell scaffold. If ADR-001 is interpreted as mandatory for PBI-146 closure, then PBI-175 should remain open until those gaps are implemented or a follow-up task is created and explicitly accepted.

## Known Limitations

1. **Demo/mock actor context only**
   - `App.tsx` uses a local `demoUserContext` with `administrator` role.
   - No real auth/session integration exists in PBI-017.
   - This is consistent with ADR-001 only if treated as temporary scaffold.

2. **No user-status gate**
   - inactive users are not blocked by the dashboard shell yet.

3. **No organization-status gate**
   - `pendingReview`, `inactive`, `suspended`, and `deleted` are not handled by dashboard shell logic yet.

4. **No role-assignment status gate**
   - raw role-code strings are used for role resolution.
   - active/revoked assignment states are not represented.

5. **Most widgets remain placeholders**
   - buyer, supplier, financing, and KYC/AML areas are placeholders or contract-pending.

6. **Visual design remains low-fidelity / scaffolded**
   - current layout is functional but not a final UI/UX direction.

## Follow-up Backlog Recommendations

### Follow-up 1 — Dashboard actor-context gate

Implement dashboard context resolution input that includes:

- user status
- active role assignments
- organization status
- supported dashboard role mapping

This should enforce:

- inactive user -> access blocked
- no active assignment -> `noRole`
- unsupported role code -> `unsupportedRole`
- pendingReview organization -> limited/status dashboard
- inactive/suspended/deleted organization -> blocked/status-only
- active organization -> operational dashboard if role mapping passes

### Follow-up 2 — Remove demo-only assumptions from production path

When auth/session capability exists, replace `demoUserContext` with server-derived actor/session context.

### Follow-up 3 — Add frontend resolver tests when test infrastructure is approved

Add focused tests for:

- active assignment resolves dashboard role
- revoked assignment does not grant role
- inactive user blocks before role resolution
- pendingReview organization resolves limited/status dashboard
- inactive/suspended/deleted organizations resolve blocked/status-only state
- placeholder targets remain unavailable

### Follow-up 4 — Figma tree prototype after state acceptance

Rebuild the Figma prototype as a tree from `Resolved Actor Context` after Scrum Master / PO accepts the state gates.

Frames should represent system states/components only. Explanatory text should be outside product frames.
