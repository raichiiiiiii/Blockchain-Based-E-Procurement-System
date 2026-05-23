# PBI-182 Compliance/Review Widget Hardening Evidence

## PBI Summary and Scope

PBI-182 hardens compliance/review dashboard widgets to ensure they do not expose disallowed role actions, do not misrepresent governed workflow state, and consistently render blocked/unavailable/contract-pending/validation-blocked states according to the PBI-180 contract.

### In scope
- Harden complianceReviewer widget visibility and action behavior.
- Harden shariahReviewer widget visibility and action behavior.
- Preserve role-specific filtering:
  - compliance widgets only for complianceReviewer.
  - Shariah widgets only for shariahReviewer.
- Ensure mixed widget arrays cannot leak compliance/review widgets across roles.
- Ensure direct access to known targets outside the active role resolves forbidden.
- Preserve KYC/AML/onboarding compliance targets as placeholder/unavailable.
- Preserve Shariah targets as shariahReviewer-only.
- Add/refine shared status-state copy for unavailable, contract-pending, forbidden, validation-blocked, and placeholder states.
- Make Shariah decision widget copy explicitly state that final decision recording is valid only from `checklistComplete` and that backend validation remains authoritative.
- Do not fabricate queue counts, blocked counts, or review status counts.
- Update PBI-182 evidence.

### Out of scope
- Administrator widget logic, except preserving shared components without regression.
- Auditor/security widgets.
- Buyer/supplier/financier widgets.
- Backend API changes.
- Backend authorization changes.
- Authentication/session/login/logout/account creation/self-registration.
- Real KYC/AML backend workflow implementation.
- Onboarding eligibility API implementation.
- Full Shariah workflow-state data fetching.
- Advanced analytics.
- High-fidelity visual redesign.
- New dependencies or new test framework.
- Changing ADR-001.
- Changing API error-envelope semantics.

## Files Changed

- `src/frontend/components/dashboard/DashboardWidgetZone.tsx` - Refined status-state copy for compliance/review widgets and Shariah workflow validation semantics.
- `docs/evidence/qa/PBI-182_COMPLIANCE_REVIEW_WIDGET_HARDENING.md` - Created/corrected this evidence file.

Existing PBI-181 behavior already provided:

- `filterWidgetsByRole(...)` defensive render-time filtering.
- Shariah targets restricted to `shariahReviewer`.
- KYC/AML/onboarding compliance targets registered as placeholder/unavailable.

## Contract Consumed

The implementation consumes the accepted compliance/review widget contract:

- `docs/architecture/COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md`

## Role Filtering Behavior

Role filtering remains enforced through the existing dashboard shell flow:

1. `initializeDashboardShell(...)` creates widgets for the active dashboard role.
2. `DashboardShell.tsx` applies `filterWidgetsByRole(widgets, activeRoleCode)` before rendering zones.
3. Compliance widgets have `allowedRoles: ['complianceReviewer']`.
4. Shariah widgets have `allowedRoles: ['shariahReviewer']`.
5. Mixed widget arrays are filtered so widgets not allowed for the active role are not rendered.

If `activeRoleCode` is missing, role-specific widgets do not render.

## ComplianceReviewer Visibility Result

When `activeRoleCode` is `complianceReviewer`:

- only compliance reviewer widgets are eligible to render;
- Shariah reviewer widgets are filtered out;
- KYC/AML/onboarding targets remain placeholder/unavailable;
- compliance authorization boundary alert is displayed.

Expected widgets:

- `compliance-kyc-queue-overview` — placeholder.
- `compliance-aml-review-overview` — placeholder.
- `compliance-onboarding-status-overview` — placeholder.
- `compliance-blocked-state-alert` — active boundary alert.

## ShariahReviewer Visibility Result

When `activeRoleCode` is `shariahReviewer`:

- only Shariah reviewer widgets are eligible to render;
- compliance reviewer widgets are filtered out;
- Shariah targets are available for navigation through the central access resolver;
- Shariah review boundary alert is displayed.

Expected widgets:

- `shariah-review-submission-overview` — active.
- `shariah-checklist-overview` — active.
- `shariah-decision-overview` — active.
- `shariah-history-overview` — active in the `secondary` zone.
- `shariah-review-boundary-alert` — active boundary alert.

## Direct-Access Forbidden Behavior

Direct access to Shariah targets outside `shariahReviewer` remains blocked by the dashboard target registry:

```text
activeRoleCode = complianceReviewer + target = shariah-reviews
-> resolveDashboardTargetAccess(...) returns forbidden

activeRoleCode = complianceReviewer + target = shariah-history
-> resolveDashboardTargetAccess(...) returns forbidden

activeRoleCode = administrator + target = shariah-decisions
-> resolveDashboardTargetAccess(...) returns forbidden
```

## KYC/AML Placeholder/Unavailable Behavior

KYC/AML and onboarding review targets remain placeholder/unavailable for `complianceReviewer`:

| Target | Status | Behavior |
|---|---|---|
| `kyc-queue` | placeholder | Unavailable with contract-pending copy; no queue count. |
| `aml-reviews` | placeholder | Unavailable with contract-pending copy; no review count. |
| `onboarding-status` | placeholder | Unavailable with contract-pending copy; no blocked/flagged count. |

Buttons for these targets continue to route through `onPageChange(...)`, so the central access resolver decides whether the target is unavailable.

## Shariah Workflow Status-State Hardening

### Decision widget

The Shariah decision widget now states:

- decision recording is a governed workflow entry point;
- final decisions are valid only from `checklistComplete`;
- `submitted` and `checklistInProgress` reviews cannot directly record a final decision;
- backend `VALIDATION_ERROR` remains authoritative if workflow state rules fail.

### Checklist widget

The Shariah checklist widget now states:

- checklist completion depends on mandatory item, comment, and evidence rules;
- completion failures must surface validation errors, not frontend success.

### History widget

The Shariah history widget now states:

- intermediate histories are valid;
- absence of a final decision is not an error condition.

## Summary-State Honesty Note

No fabricated summary data is displayed:

- Compliance widgets show placeholder/contract-pending content only.
- Shariah widgets provide descriptive entry-point text but no fake metrics.
- Missing data source is described as unavailable/contract-pending, not zero.
- No KYC queue counts, AML review counts, onboarding blocked counts, or Shariah review status counts were added.

## Backend Authorization Boundary Note

Both compliance and Shariah reviewer dashboards maintain explicit boundary alerts:

- Compliance dashboard visibility is not backend authorization.
- Review dashboard visibility is not backend authorization.
- Backend authorization and governed workflow state remain authoritative.
- Backend `FORBIDDEN` and `VALIDATION_ERROR` responses remain authoritative.

All widget actions preserve central access resolution through `onPageChange(...)` and `resolveDashboardTargetAccess(...)`.

## ADR-001 Compliance Note

Implementation maintains ADR-001 boundaries:

- No login/session implementation added.
- No public account creation added.
- Frontend role labels do not grant backend privileges.
- Backend authorization remains authoritative.
- Dashboard widgets remain frontend shell affordances only.
- Actor-context and organization-state gates remain documented follow-up scope.

## Validation Commands and Results

Manual validation was executed locally by the developer and reported as passing before this evidence correction:

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

After the final evidence/code correction commit, run the same validation commands again before accepting PBI-182.

## Tests Added

No new frontend unit test file was committed for PBI-182.

Reason:

- The repository still relies on build/typecheck and existing test scripts for this frontend slice.
- No new Jest/Vitest/Mocha infrastructure was added.
- The PBI-182 hardening is validated through TypeScript build, frontend build, existing tests, and repository inspection.

## Known Limitations

1. **Demo actor context remains**
   - The dashboard still uses scaffold/demo user context rather than real auth/session context.

2. **Organization-state gate remains follow-up scope**
   - `pendingReview`, `inactive`, `suspended`, and `deleted` organization gates are not implemented.

3. **Role-assignment status gate remains follow-up scope**
   - Active/revoked assignment-state gate is not yet implemented in dashboard resolution.

4. **No real summary metrics**
   - Summary counts are intentionally absent because no stable summary API is consumed.

5. **Visual design is still scaffolded**
   - This story implements functional widget behavior, not high-fidelity UI/UX design.

6. **KYC/AML functionality is placeholder-only**
   - No actual KYC/AML workflow is implemented, only placeholder widgets.

## Follow-up Recommendations

1. Use PBI-183 to validate all hardened behavior with reviewable evidence.
2. Keep real KYC/AML workflow implementation deferred until backend contracts stabilize.
3. Add real summary displays only when stable list/summary APIs become available.
4. Implement organization-state and role-assignment gates as defined in ADR-001 as follow-up work.
5. Continue to preserve the dashboard authorization boundary in all future enhancements.
