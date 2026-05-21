# PBI-079 Frontend Runway Investigation

## Decision

Frontend runway is approved for implementation with a governed approach that maintains alignment with backend contracts and architecture principles.

## Current Repository Frontend Readiness

The repository currently has no established frontend boundary or framework:

- **No existing frontend boundary**: No dedicated frontend directory structure
- **No frontend framework**: No React, Vue, Angular, or other frontend framework dependencies
- **No frontend build/test scripts**: Package.json contains only backend-related scripts
- **No shared API client**: No existing client library for backend API consumption
- **No shared error handling pattern**: No frontend-specific error handling utilities
- **No shared auth/actor-context handling pattern**: No frontend authentication utilities
- **No UI route/page structure**: No pages, routes, or component directories
- **No component structure**: No existing component library or structure

The repository is currently backend-focused with:
- Node.js/TypeScript backend using Fastify
- ESM module system
- In-memory repositories for development
- Established API contracts in docs/API_CONTRACTS.md

## Governed Frontend Boundary Rules

Frontend work must adhere to strict governance rules to prevent architecture divergence:

1. **Contract Compliance**: Must consume existing backend API contracts without modification
2. **State Model Adherence**: Must respect workflow states defined in STATE_MODELS.md
3. **Authorization Respect**: Must not bypass backend authorization/deactivation checks
4. **Actor Identity Policy**: Must follow trusted actor-context handling; no client-authored actor identity for protected writes
5. **Error Handling Consistency**: Must use standardized backend error envelopes without reinterpretation
6. **Audit Boundary**: Must not expose internal audit fields not intended for UI consumption
7. **Validation Alignment**: Must map backend validation errors directly to UI feedback

## Contract-Consumer Rules

Frontend must consume backend contracts with these specific patterns:

- **Requests**: Follow exact payload structures defined in docs/API_CONTRACTS.md
- **Responses**: Handle success envelopes with `data` property
- **Errors**: Consume standardized error envelopes with `error.code` and `error.message`
- **Validation Failures**: Map `VALIDATION_ERROR` with `error.details.issues` array
- **Forbidden Access**: Handle `403 FORBIDDEN` responses appropriately
- **Not Found**: Handle `404 NOT_FOUND` responses appropriately
- **Conflicts**: Handle `409 CONFLICT` responses appropriately
- **Actor Context**: Derive UI state from trusted backend actor context, not client-supplied headers

## Recommended Frontend Boundary for PBI-080

Recommended frontend boundary structure:

- **Location**: `src/frontend/` (aligns with existing src/ structure)
- **Framework**: React with TypeScript (modern, well-supported, aligns with existing TypeScript usage)
- **Build Tool**: Vite (fast, modern, good TypeScript support)
- **Expected Scripts**:
  - `frontend:dev` - Start development server
  - `frontend:build` - Build production bundle
  - `frontend:test` - Run frontend tests
  - `frontend:preview` - Preview production build locally

- **Expected Directory Structure**:
  - `src/frontend/api/` - Typed API clients and request/response models
  - `src/frontend/components/` - Reusable UI components
  - `src/frontend/pages/` - Page-level components matching routes
  - `src/frontend/routes/` - Routing configuration
  - `src/frontend/lib/` - Utility functions and shared logic
  - `src/frontend/types/` - TypeScript type definitions
  - `src/frontend/assets/` - Static assets (CSS, images, etc.)

## Dashboard Shell Architecture

The dashboard shell is the primary landing experience for authenticated users, providing a role-tailored interface with navigation and widgets relevant to the user's responsibilities.

### Dashboard Shell Layout Regions

The dashboard shell separates page layout regions from widget zones.

Shell layout regions:

1. **Header region**: Contains user context, active dashboard role, global controls, and shell-level status.
2. **Navigation region**: Contains role-specific navigation groups and items.
3. **Content region**: Contains the approved widget zones defined by the dashboard contract.
4. **Footer region**: Contains system information and non-operational links.

Widget zones are not shell regions. The approved widget zones are:

- `summary`
- `primary`
- `secondary`
- `actions`
- `alerts`
- `investigation`

Downstream dashboard stories must place widgets into these approved widget zones and must not create alternate top-level widget-zone names.

### Dashboard Component Structure

The dashboard shell consists of the following core components:

- **DashboardShell**: Root component managing overall layout and state
- **DashboardHeader**: User context and global controls
- **DashboardNavigation**: Role-specific navigation menu
- **WidgetContainer**: Manages widget zones and placement
- **Widget**: Individual widget components
- **DashboardFooter**: System information and links

### Role-Based Rendering

The dashboard shell dynamically renders content based on the user's assigned roles:

1. On authentication, the system retrieves the user's assigned roles
2. Based on the role-to-dashboard mapping defined in API_CONTRACTS.md, the appropriate navigation and widgets are displayed
3. Users with multiple roles can switch between role contexts
4. Widgets and navigation items are filtered based on role permissions

### Widget Management

Widgets are organized into predefined zones as defined in the dashboard contract:

- Widgets declare which zone they belong to
- Widget visibility is controlled by role permissions
- Widgets can be in placeholder, loading, active, unavailable, or error states according to the dashboard shell contract.
- Placeholder widgets are displayed when no content is available

## Downstream Widget Implementation

### PBI-173 Dashboard Shell Implementation
Implements the core dashboard shell and navigation resolution using the contract defined in API_CONTRACTS.md. This includes:
- Role-based navigation rendering
- Widget zone management
- Shell state handling (loading, ready, error, etc.)

### PBI-174 Access Hardening
Adds dashboard access checks, blocked-route handling, and shared error-state behavior. This includes:
- Permission-aware navigation
- Blocked-route handling
- Unauthorized-state rendering

### PBI-147 Administrator Widgets
Exposes membership and access-control widgets on the administrator dashboard. Must not redefine backend role or assignment rules.

### PBI-148 Compliance/Review Widgets
Surfaces governed workflow actions to compliance/review users. Must remain permission-aware and not expose disallowed actions.

### PBI-151 Auditor/Security Investigation Widgets
Consumes completed access-history APIs to provide investigation capabilities. Must preserve backend audit payload semantics and not redefine backend behavior.

## Contract Consumption Guidelines

PBI-173 must consume the approved shell regions and widget zones without inventing alternate navigation or layout contracts.

All downstream widget implementations must follow these guidelines:

1. **Consume Approved Contracts**: All components must use the dashboard shell contract defined in API_CONTRACTS.md
2. **No Alternate Navigation Models**: Widget stories must not create new top-level shells or alternate navigation models
3. **Respect Role Boundaries**: Widgets must only display content appropriate to the user's role
4. **Handle States Properly**: Components must properly handle all dashboard shell states (loading, error, forbidden, etc.)
5. **Use Standard Error Handling**: All error handling must follow the patterns defined in the contract

## Sprint 3 UI Execution Model

Safe execution model for UI PBIs:

1. **Contract Inspection**: Review relevant sections of docs/API_CONTRACTS.md
2. **Typed Consumer Creation**: Create TypeScript interfaces for request/response payloads
3. **Form/Page Development**: Build UI components with proper validation
4. **Error Mapping**: Connect standardized backend errors to user feedback
5. **Testing**: Add frontend unit/integration tests for components
6. **Documentation**: Update evidence notes with implementation details
7. **Backend Integrity**: Never modify backend unless a clear contract bug is identified

## Open Flags and Handling

- **`FLAG-FRONTEND-RUNWAY`**: RESOLVED BY THIS INVESTIGATION - Approved for implementation
- **`FLAG-ACTOR-SOURCE`**: Affects PBI-080 and later UI work; frontend must use server-derived actor context
- **`FLAG-AUDIT-POLICY`**: Affects only feature UI work; no frontend audit implementation needed
- **`FLAG-PROTECTED-FUNCTIONS`**: Affects PBI-056 and related UI guard work; frontend respects backend enforcement
- **`FLAG-CHECKLIST-SOURCE`**: Affects PBI-066; frontend consumes seeded checklist items as defined
- **`FLAG-CONDITIONAL-APPROVAL`**: Affects PBI-071; frontend handles conditions per contract
- **`FLAG-READ-AUDIT`**: Affects PBI-076; frontend displays history per backend read model

None of these flags block PBI-079 or PBI-080. They represent ongoing considerations for specific feature implementations.

## PBI-079 Outcome

Approved to proceed to PBI-082
