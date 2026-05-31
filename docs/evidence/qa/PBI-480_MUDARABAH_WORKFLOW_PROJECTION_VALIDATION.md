# PBI-480 Mudarabah Workflow Projection Validation

Date: 2026-05-31
Branch: `codex/issue-15-company-centric-ux`

## Scope

Validated the restricted Mudarabah/PLS workflow projection required by GitHub Issue #15.

## API And UI Added

- `GET /api/v1/company-ledger/mudarabah`
- Mudarabah projection section on `CompanyLedgerPage`

## Validation Result

The projection shows:

- projection ID
- linked deal/contract reference
- restricted PLS status
- capital amount and currency where available
- financier/operator share percentages where available
- Shariah review reference where available
- certificate artifact reference where available
- distribution record count
- conservative safe summary

The projection is read-only and company-scoped.

## Browser Smoke

Passed against the rebuilt Docker app stack:

- Buyer Company Ledger rendered `Mudarabah projection`.
- The projection showed approved-for-activation state and the Shariah reference.
- UI text stated the projection does not guarantee profit/principal, execute payment, or claim formal external Shariah certification.

## Claim Boundary

This is restricted seedbed metadata. It is not production Islamic finance certification, payment execution, guaranteed return, guaranteed principal, or a formal fatwa issuance system.
