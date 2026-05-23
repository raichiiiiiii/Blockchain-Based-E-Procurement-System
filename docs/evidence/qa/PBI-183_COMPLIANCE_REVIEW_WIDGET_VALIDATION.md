# PBI-183 Compliance/Review Widget Validation Evidence

## PBI Summary and Scope

PBI-183 validates and closes the PBI-148 compliance/review dashboard widget story after completion of:

- PBI-180 — compliance/review widget contract, governed action mapping, and blocked-state rules
- PBI-181 — compliance/review dashboard widgets and governed workflow entry points
- PBI-182 — blocked-action handling, permission filtering, and shared status-state hardening

This evidence file validates role visibility, blocked-state handling, governed workflow entry points, placeholder/contract-pending compliance behavior, Shariah workflow status messaging, summary-state honesty, and ADR-001 dashboard boundary compliance.

## Validation Source and Review Mode

Validation was performed by remote repository inspection on branch:

```text
feature/PBI-017-role-based-ui-dashboards
```

Repository state note:

- The feature branch is still diverged from `main`.
- It is ahead of `main` and behind `main`.
- This is acceptable while PBI-017 feature-line work continues.
- Before final feature integration, reconcile the branch with `main`, especially because ADR-001 exists on `main` and remains the controlling dashboard boundary decision.

## Files Inspected

Architecture and contract documents:

- `docs/architecture/COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md`
- `docs/architecture/ADMIN_DASHBOARD_WIDGET_CONTRACT.md`
- `docs/architecture/DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md`
- `docs/contracts/API_CONTRACTS.md`
- `docs/architecture/STATE_MODELS.md`

Evidence from prerequisite tasks:

- `docs/evidence/qa/PBI-181_COMPLIANCE_REVIEW_WIDGETS.md`
- `docs/evidence/qa/PBI-182_COMPLIANCE_REVIEW_WIDGET_HARDENING.md`

Frontend implementation:

- `src/frontend/lib/dashboard-contract.ts`
- `src/frontend/components/dashboard/DashboardShell.tsx`
- `src/frontend/components/dashboard/DashboardWidgetZone.tsx`
- `src/frontend/components/dashboard/DashboardNavigation.tsx`
- `src/frontend/components/dashboard/DashboardStateMessage.tsx`
- `src/frontend/types/dashboard.ts`
- `src/frontend/App.tsx`

## Files Changed by PBI-183

- `docs/evidence/qa/PBI-183_COMPLIANCE_REVIEW_WIDGET_VALIDATION.md`

No implementation files were changed by this validation evidence task.

## Contract Consumed

The accepted compliance/review widget contract is:

```text
docs/architecture/COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md
```

The contract defines:

- complianceReviewer and shariahReviewer role coverage;
- KYC/AML widgets as contract-pending or placeholder;
- Shariah review widgets as contract-backed entry points;
- governed action mappings;
- direct-access forbidden behavior;
- summary-state honesty rules;
- backend authorization and workflow-validation boundaries.

## Validation Matrix

| Validation item | Result | Evidence |
|---|---|---|
| Compliance/review contract exists. | Pass | `COMPLIANCE_REVIEW_DASHBOARD_WIDGET_CONTRACT.md` defines role coverage, widget IDs, action mapping, blocked states, and PBI-183 validation guidance. |
| Compliance reviewer widgets are implemented. | Pass | `createComplianceReviewerWidgets()` returns compliance-specific widgets in `dashboard-contract.ts`. |
| Shariah reviewer widgets are implemented. | Pass | `createShariahReviewerWidgets()` returns Shariah-specific widgets in `dashboard-contract.ts`. |
| Role filtering is present. | Pass | `filterWidgetsByRole(...)` filters widgets by `activeRoleCode`; shell render path applies the filter before zone rendering. |
| Compliance widgets do not render for Shariah reviewer. | Pass by contract/inspection | Compliance widgets have `allowedRoles: ['complianceReviewer']`. |
| Shariah widgets do not render for compliance reviewer. | Pass by contract/inspection | Shariah widgets have `allowedRoles: ['shariahReviewer']`. |
| Shariah targets are shariahReviewer-only. | Pass | `DASHBOARD_TARGETS` restricts `shariah-reviews`, `shariah-checklists`, `shariah-decisions`, and `shariah-history` to `shariahReviewer`. |
| Compliance KYC/AML/onboarding targets remain placeholder/unavailable. | Pass | `kyc-queue`, `aml-reviews`, and `onboarding-status` are registered as placeholder targets for `complianceReviewer`. |
| Widget actions route through dashboard handler. | Pass | `DashboardWidgetZone` calls `onPageChange(...)`; `App.tsx` resolves target access through `resolveDashboardTargetAccess(...)`. |
| Shariah decision validation-blocked semantics are visible. | Pass | `shariah-decision-overview` states decisions are valid only from `checklistComplete` and that backend `VALIDATION_ERROR` remains authoritative. |
| Checklist validation semantics are visible. | Pass | `shariah-checklist-overview` states mandatory completion rules and validation-error behavior. |
| History semantics are visible. | Pass | `shariah-history-overview` states intermediate histories are valid and absence of final decision is not an error. |
| Summary data is not fabricated. | Pass | No queue counts, blocked counts, AML counts, onboarding counts, or Shariah review counts are rendered. |
| Backend authorization boundary remains visible. | Pass | Compliance and Shariah boundary alert widgets state that backend authorization/workflow state remains authoritative. |
| ADR-001 scope is preserved. | Pass with known follow-up gaps | No login/session/public account creation was added; actor-context and organization-state gates remain documented follow-up scope. |

## Implemented Widget IDs

### Compliance reviewer widgets

| Widget ID | Zone | Status | Validation result |
|---|---|---|---|
| `compliance-kyc-queue-overview` | `primary` | `placeholder` | Renders as contract-pending/unavailable; no fake queue count. |
| `compliance-aml-review-overview` | `primary` | `placeholder` | Renders as contract-pending/unavailable; no fake review count. |
| `compliance-onboarding-status-overview` | `summary` | `placeholder` | Renders as contract-pending/unavailable; no fake blocked/flagged count. |
| `compliance-blocked-state-alert` | `alerts` | `active` | Shows backend authorization and governed workflow boundary. |

### Shariah reviewer widgets

| Widget ID | Zone | Status | Validation result |
|---|---|---|---|
| `shariah-review-submission-overview` | `primary` | `active` | Routes to Shariah review submission/intake entry point. |
| `shariah-checklist-overview` | `primary` | `active` | Routes to checklist workspace and explains checklist validation semantics. |
| `shariah-decision-overview` | `actions` | `active` | Routes to decision workspace and explains validation-blocked semantics. |
| `shariah-history-overview` | `secondary` | `active` | Routes to history/status view and explains intermediate-history semantics. |
| `shariah-review-boundary-alert` | `alerts` | `active` | Shows review authorization/workflow-state boundary. |

## Role Visibility Matrix

| Active dashboard role | Compliance widgets | Shariah widgets | Expected result |
|---|---|---|---|
| `complianceReviewer` | Visible | Hidden/filtered | Compliance placeholders and boundary alert render. |
| `shariahReviewer` | Hidden/filtered | Visible | Shariah governed entry points and boundary alert render. |
| `administrator` | Hidden/filtered | Hidden/filtered | Administrator widgets remain separate from PBI-148. |
| `auditor` | Hidden/filtered | Hidden/filtered | Auditor/security scope excluded. |
| `securityOperator` | Hidden/filtered | Hidden/filtered | Auditor/security scope excluded. |
| `buyer` | Hidden/filtered | Hidden/filtered | Buyer scope excluded. |
| `supplier` | Hidden/filtered | Hidden/filtered | Supplier scope excluded. |
| `financier` | Hidden/filtered | Hidden/filtered | Financing scope excluded. |
| missing role | Hidden/filtered | Hidden/filtered | Role-specific widgets do not render. |

## Action-Entry Mapping Validation

| Source widget | Target | Access behavior | Validation result |
|---|---|---|---|
| `compliance-kyc-queue-overview` | `kyc-queue` | `unavailable` for `complianceReviewer` | Placeholder/contract-pending; no fake page. |
| `compliance-aml-review-overview` | `aml-reviews` | `unavailable` for `complianceReviewer` | Placeholder/contract-pending; no fake page. |
| `compliance-onboarding-status-overview` | `onboarding-status` | `unavailable` for `complianceReviewer` | Placeholder/contract-pending; no fake page. |
| `shariah-review-submission-overview` | `shariah-reviews` | `allowed` for `shariahReviewer` | Routes through central access resolver. |
| `shariah-checklist-overview` | `shariah-checklists` | `allowed` for `shariahReviewer` | Routes through central access resolver. |
| `shariah-decision-overview` | `shariah-decisions` | `allowed` for `shariahReviewer` | Routes through central access resolver; workflow state remains backend-governed. |
| `shariah-history-overview` | `shariah-history` | `allowed` for `shariahReviewer` | Routes through central access resolver. |

All widget actions use `onPageChange(...)` and therefore preserve the dashboard target access resolver path.

## Direct-Access Negative Path Evidence

Expected resolver behavior:

```text
activeRoleCode = complianceReviewer + target = shariah-reviews
-> forbidden

activeRoleCode = complianceReviewer + target = shariah-checklists
-> forbidden

activeRoleCode = complianceReviewer + target = shariah-decisions
-> forbidden

activeRoleCode = complianceReviewer + target = shariah-history
-> forbidden

activeRoleCode = administrator + target = shariah-decisions
-> forbidden
```

This satisfies the PBI-180/PBI-182 rule that direct access to review targets outside the active role must render the dashboard forbidden state.

## KYC/AML Contract-Pending Evidence

KYC/AML/onboarding review widgets remain intentionally incomplete:

- `kyc-queue` is placeholder/unavailable.
- `aml-reviews` is placeholder/unavailable.
- `onboarding-status` is placeholder/unavailable.
- No KYC queue count is shown.
- No AML review count is shown.
- No onboarding blocked/flagged count is shown.
- No KYC/AML workflow completion is claimed.
- No eligibility enforcement is implemented in PBI-148.

This satisfies the PBI-180 contract-pending posture for compliance reviewer widgets.

## Shariah Workflow-State Evidence

Shariah review widgets preserve governed workflow semantics:

- Submission widget is an entry point; backend authorization remains authoritative for protected writes.
- Checklist widget states completion depends on mandatory item/comment/evidence rules.
- Checklist completion failures must surface validation errors, not frontend success.
- Decision widget states final decisions are valid only from `checklistComplete`.
- Decision widget states `submitted` and `checklistInProgress` reviews cannot directly record a final decision.
- Decision widget states backend `VALIDATION_ERROR` remains authoritative if workflow state rules fail.
- History widget states intermediate histories are valid.
- History widget states absence of final decision is not an error condition.

## Backend Authorization Boundary Evidence

Compliance and Shariah review dashboards preserve the ADR-001 authorization boundary:

- frontend widget visibility is not backend authorization;
- backend authorization remains authoritative;
- governed workflow state remains authoritative;
- backend `FORBIDDEN` remains a blocked action;
- backend `VALIDATION_ERROR` remains a workflow-state validation outcome;
- widgets are frontend shell affordances only.

No client-authored actor identity was added as an authorization source.

## Summary-State Honesty Evidence

No fabricated metrics were added.

Observed behavior:

- compliance widgets render placeholder/contract-pending copy;
- Shariah widgets render descriptive action-entry copy;
- missing data is described as unavailable/contract-pending, not zero;
- empty state is not confused with unavailable state;
- no advanced analytics were introduced.

## ADR-001 Compliance Note

PBI-148 does not violate ADR-001:

- no login/session implementation was added;
- no logout/session invalidation was added;
- no public account creation was added;
- no public SME self-registration was added;
- frontend role labels do not grant backend privileges;
- backend authorization remains authoritative;
- PBI-017 still starts from resolved actor context as an upstream assumption.

Known ADR-001 follow-up gaps remain documented:

- real server-derived actor context integration;
- inactive user gate;
- organization-state gate for `pendingReview`, `inactive`, `suspended`, and `deleted`;
- active/revoked assignment-state gate.

## Validation Commands and Results

These commands must be run locally after this evidence-only commit:

```bash
npm run frontend:build
npm run build
npm test
git diff --check
```

Remote inspection result:

- Code and evidence were inspected on origin.
- This PBI-183 evidence file was created through repository inspection.
- Local command execution has not yet been recorded for this evidence commit.

## Closure Assessment

PBI-148 is acceptable for closure if local validation passes after this evidence commit.

Confirmed by inspection:

- PBI-180 contract exists and defines the compliance/review widget behavior.
- PBI-181 implements compliance and Shariah reviewer widgets.
- PBI-182 hardens role filtering, blocked-state behavior, status-state copy, and summary honesty.
- Compliance widgets remain placeholder/contract-pending.
- Shariah widgets route to governed entry points.
- Shariah decision, checklist, and history semantics are explicit.
- Direct access outside assigned review roles resolves forbidden.
- Backend authorization boundary remains explicit.
- ADR-001 follow-up gaps remain documented and are not hidden.

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
   - This story validates functional widget behavior, not high-fidelity UI/UX design.

6. **KYC/AML functionality is placeholder-only**
   - No actual KYC/AML workflow is implemented, only placeholder widgets.

## Follow-up Recommendations

1. Record final local validation results in this evidence file.
2. Reconcile `feature/PBI-017-role-based-ui-dashboards` with `main` before final feature merge.
3. Keep ADR-001 actor-context and organization-state gates as explicit follow-up work.
4. Defer real KYC/AML workflow and summary metrics until stable backend contracts exist.
5. Use the PBI-180/PBI-183 pattern as a baseline for auditor/security widget contracts in the next story chain.
