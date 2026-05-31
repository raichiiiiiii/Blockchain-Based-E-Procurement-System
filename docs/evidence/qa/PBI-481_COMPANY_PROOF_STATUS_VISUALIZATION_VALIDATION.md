# PBI-481 Company Proof Status Visualization Validation

Date: 2026-05-31
Branch: `codex/issue-15-company-centric-ux`

## Scope

Validated company-centric proof status visualization across the dashboard summary and company deal projection.

## UI Added

- `src/frontend/components/organization/CompanyProofStatusBadge.tsx`
- Company context proof summary
- Company Ledger deal proof status

## Supported States

The component distinguishes:

- `notAnchored`
- `pending`
- `anchored`
- `failed`
- `verified`
- `mismatch`
- `notFound`
- `unavailable`

## Validation Result

- Statuses use visual indicators and text.
- Pending and unavailable states remain distinct from verified.
- No transaction ID, block number, or verified state is fabricated when proof metadata is absent.
- Company Ledger displays proof event and proof hash only when returned by the backend.

## Browser Smoke

Passed against the rebuilt Docker app stack:

- Buyer dashboard showed company proof status.
- Company Ledger rendered pending proof state and proof hash for the seeded Amanah-Barakah deal.

## Known Limitations

- Live Fabric verification remains dependent on configured Fabric infrastructure. This UI slice does not implement production Fabric consortium operations.
