# PBI-181 Compliance/Review Widget Implementation Evidence

## PBI Summary and Scope

PBI-181 implements compliance/review dashboard widgets and governed workflow entry points using the PBI-180 compliance/review dashboard widget contract.

### In scope
- Implement dashboard widgets for:
  - complianceReviewer
  - shariahReviewer
- Consume:
  - docs/architecture/COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md
- Add compliance reviewer widgets as contract-pending/placeholders:
  - compliance-kyc-queue-overview
  - compliance-aml-review-overview
  - compliance-onboarding-status-overview
  - compliance-blocked-state-alert
- Add Shariah reviewer widgets as contract-backed entry points:
  - shariah-review-submission-overview
  - shariah-checklist-overview
  - shariah-decision-overview
  - shariah-history-overview
  - shariah-review-boundary-alert
- Add governed action shortcuts that route through the existing dashboard page-change handler
- Preserve central access resolution through resolveDashboardTargetAccess
- Keep KYC/AML targets as unavailable/contract-pending placeholders
- Keep Shariah review targets routed to existing frontend pages:
  - shariah-reviews
  - shariah-checklists
  - shariah-decisions
  - shariah-history
- Do not fabricate KYC/AML, onboarding, or Shariah summary counts

### Out of scope
- Auditor/security widgets
- Administrator widget changes
- Buyer/supplier/financier widgets
- Backend API changes
- Backend authorization changes
- Authentication/session/login/logout/account creation/self-registration
- KYC/AML backend workflow implementation
- Onboarding eligibility API implementation
- Advanced analytics
- High-fidelity visual redesign
- New dependencies or new test framework

## Files Changed

- `src/frontend/lib/dashboard-contract.ts` - Added widget factory functions for compliance/review roles and registered placeholder/available review targets.
- `src/frontend/components/dashboard/DashboardWidgetZone.tsx` - Updated to render compliance/review widgets and route governed action buttons through `onPageChange(...)`.
- `docs/evidence/qa/PBI-181_COMPLIANCE_REVIEW_WIDGETS.md` - Created this evidence file.

## Contract Consumed

The implementation consumes the accepted compliance/review widget contract:
- `docs/architecture/COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md`

## Implemented Compliance Widget IDs

| Widget ID | Zone | Status | Purpose |
|---|---|---|---|
| `compliance-kyc-queue-overview` | `primary` | `placeholder` | KYC queue entry point (contract-pending) |
| `compliance-aml-review-overview` | `primary` | `placeholder` | AML review entry point (contract-pending) |
| `compliance-onboarding-status-overview` | `summary` | `placeholder` | Onboarding status overview (contract-pending) |
| `compliance-blocked-state-alert` | `alerts` | `active` | Compliance authorization boundary reminder |

## Implemented Shariah Widget IDs

| Widget ID | Zone | Status | Purpose |
|---|---|---|---|
| `shariah-review-submission-overview` | `primary` | `active` | Shariah review submission entry point |
| `shariah-checklist-overview` | `primary` | `active` | Shariah checklist workspace entry point |
| `shariah-decision-overview` | `actions` | `active` | Shariah decision recording entry point |
| `shariah-history-overview` | `secondary` | `active` | Shariah review history entry point |
| `shariah-review-boundary-alert` | `alerts` | `active` | Shariah review authorization boundary reminder |

## Action-Entry Mapping Table

| Source Widget | Target | Navigation Behavior | Notes |
|---|---|---|---|
| `compliance-kyc-queue-overview` | `kyc-queue` | `showUnavailable` | Contract-pending placeholder |
| `compliance-aml-review-overview` | `aml-reviews` | `showUnavailable` | Contract-pending placeholder |
| `compliance-onboarding-status-overview` | `onboarding-status` | `showUnavailable` | Contract-pending placeholder |
| `shariah-review-submission-overview` | `shariah-reviews` | `navigate` | Routes to existing submission page |
| `shariah-checklist-overview` | `shariah-checklists` | `navigate` | Routes to existing checklist page |
| `shariah-decision-overview` | `shariah-decisions` | `navigate` | Routes to existing decision page |
| `shariah-history-overview` | `shariah-history` | `navigate` | Routes to existing history page |

## Role Visibility and Direct-Access Behavior

The dashboard target registry keeps Shariah workflow targets restricted to `shariahReviewer`:

| Target | Allowed role |
|---|---|
| `shariah-reviews` | `shariahReviewer` |
| `shariah-checklists` | `shariahReviewer` |
| `shariah-decisions` | `shariahReviewer` |
| `shariah-history` | `shariahReviewer` |

Expected direct-access behavior:

```text
activeRoleCode = complianceReviewer + target = shariah-reviews
-> resolveDashboardTargetAccess(...) returns forbidden

activeRoleCode = complianceReviewer + target = shariah-history
-> resolveDashboardTargetAccess(...) returns forbidden
```

This preserves the PBI-180 rule that direct access to a known review target outside the active role renders the dashboard forbidden state instead of exposing the governed Shariah workflow.

## KYC/AML Placeholder/Contract-Pending Behavior

All compliance reviewer widgets related to KYC/AML are implemented as placeholders:
- No fake queue counts are displayed
- No fake blocked/flagged counts are displayed
- No claims about KYC/AML backend workflow implementation
- Compliance action buttons route through `onPageChange(...)` to placeholder/unavailable targets
- Clear messaging indicates functionality is pending

## Shariah Workflow-State Note

Shariah reviewer widgets correctly reflect workflow semantics:
- Checklist actions are presented as governed entry points
- Decision recording widget includes appropriate copy about workflow prerequisites
- Final decision states (approved, rejected, conditionalApproved) are treated as terminal
- No implication that decisions can be made from submitted or checklistInProgress states
- Detailed workflow-state hardening remains PBI-182 scope unless reliable review-state data is available in the current frontend path

## Backend Authorization Boundary Note

Both compliance and Shariah reviewer dashboards include explicit boundary alerts:
- Compliance dashboard: "Compliance dashboard visibility is not backend authorization"
- Shariah dashboard: "Review dashboard visibility is not backend authorization"
- All widgets preserve the central access resolution through `resolveDashboardTargetAccess`
- No bypassing of authorization mechanisms

## Summary-Data Honesty Note

No fabricated summary data is displayed:
- Compliance widgets show placeholder content only
- Shariah widgets provide descriptive text but no fake metrics
- Empty states are handled appropriately without implying zero counts

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
6. Use PBI-182 to harden validation and blocked-state handling for these widgets
