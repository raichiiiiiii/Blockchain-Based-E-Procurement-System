# PBI-190: Auditor/Security Investigation Widget Hardening Evidence

## PBI Summary and Scope

This evidence document covers the hardening of auditor and security operator dashboard investigation widgets to ensure correct handling of empty-result, validation-error, forbidden, not-found, unavailable, and incomplete-sequence states without redefining backend access-history semantics. The implementation includes:

1. Hardening access-history search entry flow state handling
2. Hardening access event detail entry flow state handling
3. Hardening access event sequence entry flow state handling
4. Hardening security investigation placeholder/unavailable behavior
5. Preserving auditor-only access-history backend authorization
6. Preserving securityOperator placeholder/contract-pending behavior
7. Adding clear UI states for all required scenarios
8. Preserving backend payload field names and semantics

## Files Changed

1. `src/frontend/pages/AccessHistorySearchPage.tsx` - Added comprehensive state handling for search scenarios
2. `src/frontend/pages/AccessEventDetailPage.tsx` - Added comprehensive state handling for event detail scenarios
3. `src/frontend/pages/AccessEventSequencePage.tsx` - Added comprehensive state handling for sequence scenarios
4. `src/frontend/pages/SecurityInvestigationPlaceholderPage.tsx` - Enhanced placeholder messaging and restrictions
5. `docs/evidence/qa/PBI-190_AUDITOR_SECURITY_INVESTIGATION_HARDENING.md` - Created this evidence document

## Contract Consumed

This implementation consumes the following contracts:
- `docs/architecture/AUDITOR_SECURITY_DASHBOARD_WIDGET_CONTRACT.md`
- `docs/contracts/API_CONTRACTS.md` section 10
- `docs/contracts/ACCESS_HISTORY_QUERY_CONTRACT.md`
- `docs/contracts/ACCESS_AUDIT_EVENT_INSPECTION_CONTRACT.md`

## Empty-Result Behavior

Implemented in all three main pages:
1. **AccessHistorySearchPage**: Shows "No access history events matched your search criteria" with clear note that this is a successful search with `data.items = []`
2. **AccessEventSequencePage**: Shows "No access events found for the specified sequence" with clear note that this is a successful empty result
3. **AccessEventDetailPage**: Does not have an empty result state since it's a specific lookup - uses NotFound instead

## Validation-Error Behavior

All pages implement robust validation:
1. **AccessHistorySearchPage**: Validates time range consistency (from ≤ to)
2. **AccessEventDetailPage**: Validates that Event ID is provided
3. **AccessEventSequencePage**: Validates required fields based on mode (actorUserId for actor mode, targetType+targetId for target mode) and time range consistency

Each validation error clearly indicates it's a VALIDATION_ERROR, not an empty result.

## Forbidden-State Behavior

All pages handle forbidden states:
1. When user lacks auditor role for access-history APIs
2. Clear messaging that "Backend FORBIDDEN means auditor authorization failed or actor lacks access"
3. Consistent presentation across all entry points

## Event-Detail Not-Found Behavior

Implemented in AccessEventDetailPage:
1. Shows "Access audit event with ID [xyz] was not found"
2. Clearly labeled as NOT_FOUND semantics, not empty result
3. Distinct from validation errors or forbidden states

## Sequence Completeness Behavior

Implemented in AccessEventSequencePage:
1. Handles completeness status: complete | partial | unknown
2. Shows completeness warning when status is not 'complete'
3. Includes reason ("completeness_not_proven") and explanatory message
4. Clearly states that "Unknown completeness must not be presented as complete lifecycle evidence"

## SecurityOperator Placeholder Behavior

Enhanced in SecurityInvestigationPlaceholderPage:
1. Clearly marked as "Unavailable / Contract Pending"
2. Explicitly states "Current access-history APIs require auditor backend authorization"
3. Emphasizes "Security dashboard visibility does not grant access-history API permission"
4. Lists restrictions including "No fake results, metrics, incidents, alerts, or event data are shown"
5. Maintains that "Backend contracts remain authoritative at all times"

## Payload Preservation Note

All implementations preserve backend audit semantics:
- Do not rename or reinterpret event fields
- Do not synthesize evidence values
- Maintain exact field names from contracts
- Preserve ordering semantics
- Do not collapse distinct error states into generic errors

## Backend Authorization Boundary Note

The implementation maintains the backend authorization boundary by:
1. Clearly distinguishing between frontend visibility and backend authorization
2. Explicitly stating that "Investigation dashboard visibility is not backend authorization"
3. Maintaining that "Auditor-only backend contracts remain authoritative"
4. Ensuring security operators cannot access auditor-only APIs
5. Using the existing `resolveDashboardTargetAccess(...)` function for all access resolution

## Summary-Data Honesty Note

No fake counts or metrics are shown:
- Access-event counts are not fabricated
- Incident counts are not fabricated
- Security alert counts are not fabricated
- Missing data sources are shown as unavailable/contract-pending, not zero
- Empty successful backend results are shown as empty, not error

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

1. Actual API fetching is scaffolded with clear contract notes rather than implemented
2. No automated tests were added due to lack of existing frontend test infrastructure
3. State simulation uses special input values rather than real API responses
4. Pages are enhanced implementations focused on contract adherence rather than UI polish

## Follow-up Recommendations for PBI-191

1. Implement actual API calls in the frontend pages if backend/browser integration scope allows it
2. Add proper error handling for real API responses
3. Implement real data display for search results, event details, and sequences if API binding is approved
4. Add loading states for API calls
5. Implement proper validation for form inputs against real API constraints
6. Validate all error states with real backend responses
7. Keep securityOperator access-history behavior placeholder/forbidden unless backend contracts explicitly change
