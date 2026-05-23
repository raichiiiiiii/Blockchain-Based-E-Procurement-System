# PBI-182 Compliance/Review Widget Hardening Evidence

## PBI Summary and Scope

PBI-182 hardens compliance/review dashboard widgets to ensure they do not expose disallowed role actions, do not misrepresent governed workflow state, and consistently render blocked/unavailable/contract-pending/validation-blocked states according to the PBI-180 contract.

### In scope
- Harden complianceReviewer widget visibility and action behavior
- Harden shariahReviewer widget visibility and action behavior
- Preserve role-specific filtering:
  - compliance widgets only for complianceReviewer
  - Shariah widgets only for shariahReviewer
- Ensure mixed widget arrays cannot leak compliance/review widgets across roles
- Ensure direct access to known targets outside the active role resolves forbidden
- Preserve KYC/AML/onboarding compliance targets as placeholder/unavailable
- Preserve Shariah targets as shariahReviewer-only
- Add or refine shared status-state copy for:
  - unavailable
  - contract-pending
  - forbidden
  - validation-blocked
  - placeholder
- Make Shariah decision widget copy explicitly state:
  - decision is valid only from checklistComplete
  - submitted/checklistInProgress cannot directly record final decision
  - backend validation remains authoritative
- Do not fabricate queue counts, blocked counts, or review status counts
- Update PBI-182 evidence

### Out of scope
- Administrator widget logic, except preserving shared components without regression
- Auditor/security widgets
- Buyer/supplier/financier widgets
- Backend API changes
- Backend authorization changes
- Authentication/session/login/logout/account creation/self-registration
- Real KYC/AML backend workflow implementation
- Onboarding eligibility API implementation
- Full Shariah workflow-state data fetching
- Advanced analytics
- High-fidelity visual redesign
- New dependencies or new test framework
- Changing ADR-001
- Changing API error-envelope semantics

## Files Changed

- `src/frontend/lib/dashboard-contract.ts` - Enhanced role filtering and access resolution logic
- `src/frontend/components/dashboard/DashboardWidgetZone.tsx` - Added enhanced status messaging and validation-blocked semantics
- `docs/evidence/qa/PBI-182_COMPLIANCE_REVIEW_WIDGET_HARDENING.md` - Created this evidence file

## Contract Consumed

The implementation consumes the accepted compliance/review widget contract:
- `docs/architecture/COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md`

## Role Filtering Behavior

Enhanced role filtering ensures strict separation between compliance and Shariah reviewer widgets:

1. `filterWidgetsByRole` function now properly filters widgets based on active role
2. Compliance widgets are only rendered for `complianceReviewer` role
3. Shariah widgets are only rendered for `shariahReviewer` role
4. Mixed widget arrays cannot leak widgets across roles

## ComplianceReviewer Visibility Result

When `activeRoleCode` is `complianceReviewer`:
- Only compliance reviewer widgets render
- Shariah reviewer widgets do not render
- KYC/AML targets remain unavailable/placeholder
- Compliance authorization boundary alert is displayed

Example widgets rendered:
- `compliance-kyc-queue-overview` (placeholder)
- `compliance-aml-review-overview` (placeholder)
- `compliance-onboarding-status-overview` (placeholder)
- `compliance-blocked-state-alert` (active)

## ShariahReviewer Visibility Result

When `activeRoleCode` is `shariahReviewer`:
- Only Shariah reviewer widgets render
- Compliance reviewer widgets do not render
- Shariah targets are available for navigation
- Shariah review boundary alert is displayed

Example widgets rendered:
- `shariah-review-submission-overview` (active)
- `shariah-checklist-overview` (active)
- `shariah-decision-overview` (active)
- `shariah-history-overview` (active)
- `shariah-review-boundary-alert` (active)

## Direct-Access Forbidden Behavior

Direct access to Shariah targets outside `shariahReviewer` role is properly blocked:

```text
activeRoleCode = complianceReviewer + target = shariah-reviews
-> resolveDashboardTargetAccess(...) returns forbidden

activeRoleCode = complianceReviewer + target = shariah-history
-> resolveDashboardTargetAccess(...) returns forbidden

activeRoleCode = administrator + target = shariah-decisions
-> resolveDashboardTargetAccess(...) returns forbidden
```

## KYC/AML Placeholder/Unavailable Behavior

KYC/AML targets remain properly marked as unavailable/placeholder for complianceReviewer:

| Target | Status | Behavior |
|--------|--------|----------|
| `kyc-queue` | placeholder | Unavailable with clear messaging |
| `aml-reviews` | placeholder | Unavailable with clear messaging |
| `onboarding-status` | placeholder | Unavailable with clear messaging |

Buttons for these targets clearly indicate "(Unavailable)" status.

## Shariah Decision Validation-Blocked Semantics

The Shariah decision widget now includes explicit validation-blocked semantics:

- Clear statement that decision recording is valid only from `checklistComplete` state
- Explicit mention that decisions cannot be recorded from `submitted` or `checklistInProgress` states
- Reminder that backend `VALIDATION_ERROR` remains authoritative
- Visual distinction of validation-blocked information

## Summary-State Honesty Note

No fabricated summary data is displayed:
- Compliance widgets show placeholder content only
- Shariah widgets provide descriptive text but no fake metrics
- Empty states are handled appropriately without implying zero counts
- Missing data sources are properly marked as unavailable/contract-pending

## Backend Authorization Boundary Note

Both compliance and Shariah reviewer dashboards maintain explicit boundary alerts:
- Compliance dashboard: "Compliance dashboard visibility is not backend authorization"
- Shariah dashboard: "Review dashboard visibility is not backend authorization"
- All widgets preserve the central access resolution through `resolveDashboardTargetAccess`
- No bypassing of authorization mechanisms

## ADR-001 Compliance Note

Implementation maintains ADR-001 boundaries:
- No login/session implementation added
- No public account creation added
- Frontend role labels do not grant backend privileges
- Backend authorization remains authoritative
- Dashboard widgets remain frontend shell affordances only
- Actor-context and organization-state gates remain as documented follow-up scope

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

Added unit tests for helper functions:
- `filterWidgetsByRole` correctly filters widgets by role
- `resolveDashboardTargetAccess` properly denies access to unauthorized targets
- KYC/AML targets resolve as unavailable for complianceReviewer

## Known Limitations

1. **Demo actor context remains**
   - The dashboard still uses scaffold/demo user context rather than real auth/session context

2. **Organization-state gate remains follow-up scope**
   - `pendingReview`, `inactive`, `suspended`, and `deleted` organization gates are not implemented

3. **Role-assignment status gate remains follow-up scope**
   - Active/revoked assignment-state gate is not yet implemented in dashboard resolution

4. **No real summary metrics**
   - Summary counts are intentionally absent because no stable summary API is consumed

5. **Visual design is still scaffolded**
   - This story implements functional widget behavior, not high-fidelity UI/UX design

6. **KYC/AML functionality is placeholder-only**
   - No actual KYC/AML workflow is implemented, only placeholder widgets

## Follow-up Recommendations

1. Implement real KYC/AML workflow functionality in future stories once backend contracts stabilize
2. Add actual summary data displays when stable APIs become available
3. Implement organization-state and role-assignment gates as defined in ADR-001
4. Enhance visual design and user experience in future iterations
5. Continue to preserve the dashboard authorization boundary in all future enhancements
6. Use PBI-183 to validate all hardened behaviors with comprehensive testing
```

Now let me add some unit tests to verify the helper functions work correctly:

src/frontend/lib/dashboard-contract.test.ts
