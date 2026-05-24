# PBI-189: Auditor/Security Investigation Widgets Implementation Evidence

## PBI Summary and Scope

This evidence document covers the implementation of auditor and security operator dashboard investigation widgets as defined in the AUDITOR_SECURITY_DASHBOARD_WIDGET_CONTRACT.md. The implementation includes:

1. Adding auditor dashboard widgets for access history search, event detail, event sequence, and investigation boundary alerts
2. Adding security operator widgets as placeholders/contract-pending
3. Updating the dashboard target registry with new targets
4. Creating minimal frontend entry pages for investigation flows
5. Preserving backend audit payload semantics and field names
6. Maintaining the backend authorization boundary

## Files Changed

1. `src/frontend/lib/dashboard-contract.ts` - Updated with new widgets and targets
2. `src/frontend/components/dashboard/DashboardWidgetZone.tsx` - Added widget rendering logic
3. `src/frontend/App.tsx` - Added new page routes
4. Created new page components:
   - `src/frontend/pages/AccessHistorySearchPage.tsx`
   - `src/frontend/pages/AccessEventDetailPage.tsx`
   - `src/frontend/pages/AccessEventSequencePage.tsx`
   - `src/frontend/pages/SecurityInvestigationPlaceholderPage.tsx`
5. `docs/evidence/qa/PBI-189_AUDITOR_SECURITY_INVESTIGATION_WIDGETS.md` - Updated implementation evidence and final validation result.

## Contract Consumed

This implementation consumes the following contracts:
- `docs/architecture/AUDITOR_SECURITY_DASHBOARD_WIDGET_CONTRACT.md`
- `docs/contracts/API_CONTRACTS.md` section 10
- `docs/contracts/ACCESS_HISTORY_QUERY_CONTRACT.md`
- `docs/contracts/ACCESS_AUDIT_EVENT_INSPECTION_CONTRACT.md`

## Implemented Auditor Widget IDs

1. `auditor-access-history-search-overview` - Primary zone widget for access history search
2. `auditor-event-detail-overview` - Primary zone widget for event detail inspection
3. `auditor-event-sequence-overview` - Investigation zone widget for event sequence inspection
4. `auditor-investigation-boundary-alert` - Alerts zone widget showing authorization boundary

## Implemented Security Widget IDs

1. `security-investigation-placeholder` - Primary zone placeholder for security investigation
2. `security-investigation-boundary-alert` - Alerts zone widget showing authorization boundary

## Target Registry Entries

Added the following targets to the dashboard target registry:

1. `access-history-search`:
   - allowedRoles: ['auditor']
   - availability: available
   - pageKey: access-history-search

2. `access-event-detail`:
   - allowedRoles: ['auditor']
   - availability: available
   - pageKey: access-event-detail

3. `access-event-sequence`:
   - allowedRoles: ['auditor']
   - availability: available
   - pageKey: access-event-sequence

4. `security-investigation`:
   - allowedRoles: ['securityOperator']
   - availability: placeholder
   - pageKey: security-investigation

Note: Legacy generic targets (`access-history`, `investigations`, `monitoring`, `incidents`) are retained for backward compatibility but are not exposed as approved PBI-189 navigation entries.

## Action-Entry Mapping Table

| Widget ID | Action Entry | Target | Allowed Role | Navigation Behavior |
|-----------|--------------|--------|--------------|---------------------|
| auditor-access-history-search-overview | open-access-history-search | access-history-search | auditor | navigate |
| auditor-event-detail-overview | open-access-event-detail | access-event-detail | auditor | navigate |
| auditor-event-sequence-overview | open-access-event-sequence | access-event-sequence | auditor | navigate |
| security-investigation-placeholder | open-security-investigation | security-investigation | securityOperator | showContractPending |

## Access-History API Consumption Mapping

| Capability | Widget | API Endpoint | Method | Backend Authorization |
|------------|--------|--------------|--------|----------------------|
| Search | auditor-access-history-search-overview | /api/v1/access-history | GET | auditorRequired |
| Event Detail | auditor-event-detail-overview | /api/v1/access-history/events/{eventId} | GET | auditorRequired |
| Sequence | auditor-event-sequence-overview | /api/v1/access-history/sequences | GET | auditorRequired |

Note: Actual API calls are scaffolded in the frontend pages with clear contract notes for future implementation.

## SecurityOperator Placeholder/Contract-Pending Note

Security operator widgets are implemented as placeholders/contract-pending because:
1. Current backend access-history APIs require `auditor` role
2. No security-specific audit API is approved in the contracts
3. Security operators should see investigation affordances without gaining unauthorized access
4. Copy clearly states that access-history APIs currently require auditor backend authorization
5. The `security-investigation-placeholder` action routes to `security-investigation`, which resolves as unavailable because the target is a placeholder.

## Navigation and Legacy Target Note

Approved PBI-189 navigation entries are limited to:

- `access-history-search`
- `access-event-detail`
- `access-event-sequence`
- `security-investigation`

Legacy generic targets (`access-history`, `investigations`, `monitoring`, `incidents`) are not exposed as approved PBI-189 navigation entries.

## Payload Preservation Note

All backend audit payload semantics are preserved:
- Field names are not renamed or reinterpreted
- Evidence fields are maintained as-is
- No synthetic evidence hash values are created
- Sequence completeness is only shown when provided by backend metadata

## Backend Authorization Boundary Note

The implementation maintains the backend authorization boundary by:
1. Visible copy stating investigation dashboard visibility is not backend authorization
2. Clear messaging that access-history payloads are governed by backend contracts
3. Ensuring that securityOperator access to auditor-only targets resolves as forbidden
4. Using the existing `resolveDashboardTargetAccess(...)` function for all access resolution

## Summary-Data Honesty Note

No fake counts or metrics are shown:
- Access-event counts are not fabricated
- Incident counts are not fabricated
- Security alert counts are not fabricated
- Missing data sources are shown as unavailable/contract-pending, not zero

## ADR-001 Compliance Note

This implementation complies with ADR-001 by:
1. Not changing the dashboard auth boundary
2. Not redefining API response semantics
3. Not changing access-history payload semantics
4. Not modifying role vocabulary
5. Not changing widget-zone model
6. Not altering backend authorization rules
7. Not adding client-authored actor identity as an authorization source

## Validation Commands/Results

Manual validation was executed locally by the developer after the final security placeholder action fix and reported as passing on 2026-05-23.

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

1. Actual API fetching is scaffolded with clear contract notes rather than implemented
2. No automated tests were added due to lack of existing frontend test infrastructure
3. Pages are minimal implementations focused on contract adherence rather than UI polish

## Follow-up Recommendations for PBI-190

1. Implement or harden actual API calls in the frontend pages if backend/browser integration scope allows it
2. Add proper error handling for API responses
3. Implement real data display for search results, event details, and sequences if API binding is approved
4. Add loading states for API calls
5. Implement proper validation for form inputs
6. Validate empty-result, validation-error, forbidden, not-found, and incomplete-sequence states
7. Keep securityOperator access-history behavior placeholder/forbidden unless backend contracts explicitly change
