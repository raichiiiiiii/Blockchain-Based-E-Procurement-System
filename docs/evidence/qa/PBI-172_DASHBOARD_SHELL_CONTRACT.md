# PBI-172 Dashboard Shell Contract Documentation

## Overview
This document summarizes the changes made for PBI-172 to define the dashboard shell contract, role-to-dashboard mapping, navigation model, widget zones, and related semantics for the role-based UI implementation.

## Files Changed

1. `docs/contracts/API_CONTRACTS.md` - Added Section 15: Dashboard shell contracts
2. `docs/architecture/FRONTEND_RUNWAY.md` - Added Dashboard Shell Architecture section
3. `docs/evidence/qa/PBI-172_DASHBOARD_SHELL_CONTRACT.md` - This evidence file

## Contract Definitions

### Role-to-Dashboard Mapping
Defined eight dashboard role profiles with their purposes and downstream stories:

- `administrator` - PBI-147
- `buyer` - PBI-146
- `supplier` - PBI-146
- `financier` - PBI-146
- `complianceReviewer` - PBI-148
- `shariahReviewer` - PBI-148
- `auditor` - PBI-151
- `securityOperator` - PBI-151

### Navigation Model
Established navigation item properties:
- id, label, target
- allowedRoles, requiredPermissions
- visibility, blockedBehavior

Defined navigation behavior rules:
- Disallowed items are hidden by default
- Direct access to restricted routes shows blocked state
- Backend remains authoritative for access control

### Widget-Zone Model
Defined six widget zones with specific purposes:
1. Summary Zone - High-level overview information
2. Primary Zone - Main functional area
3. Secondary Zone - Supporting information
4. Actions Zone - Quick access actions
5. Alerts Zone - Notifications and warnings
6. Investigation Zone - Specialized investigation tools

Each zone specifies:
- Purpose and allowed content types
- Ordering rules
- Empty/placeholder behavior
- Accessibility expectations
- Downstream widget ownership

`FRONTEND_RUNWAY.md` now separates shell layout regions from widget zones. Shell regions are `header`, `navigation`, `content`, and `footer`. Widget zones remain `summary`, `primary`, `secondary`, `actions`, `alerts`, and `investigation`.

### Shell States
Defined dashboard shell states:
- ready, noRole, unsupportedRole, forbidden, loading, error

### Fallback Semantics
Established handling for:
- Users with no roles
- Unsupported role codes
- Multiple role assignments
- Empty widget zones

## Data Structures
Documented TypeScript-like interfaces for:
- DashboardShell
- DashboardNavigationGroup
- DashboardNavigationItem
- DashboardWidgetZone
- DashboardWidget

## Downstream Dependencies
This contract must be consumed by the following implementation tasks:
- PBI-173: Implement role-based dashboard shell and navigation resolution
- PBI-174: Add dashboard access checks and blocked-route handling
- PBI-176/PBI-179: Administrator dashboard widgets
- PBI-180/PBI-183: Compliance/review dashboard widgets
- PBI-188/PBI-191: Auditor/security investigation widgets
- PBI-173 must consume this contract as-is for shell regions, role resolution, navigation behavior, and widget-zone names. It must not invent alternate dashboard zones or navigation models.

## Implementation Status
Documentation-only: No runtime tests required for this contract definition task.
Runtime tests were not required because PBI-172 remained documentation-only and did not add executable mappings, constants, or frontend runtime code.

## Backend Impact
No changes to backend authorization, audit, KYC/AML, Shariah, or access-history behavior.
No alternate error envelopes introduced.
No hidden role/status vocabulary added without documentation.

## ADR Status
No architecture decision record required for this documentation task.
