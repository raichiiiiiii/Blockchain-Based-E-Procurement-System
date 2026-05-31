# PBI-478 Private Ledger Deal Projection Validation

Date: 2026-05-31
Branch: `codex/issue-15-company-centric-ux`

## Scope

Validated the company-scoped private deal projection workspace from GitHub Issue #15.

## API And UI Added

- `GET /api/v1/company-ledger/deals`
- `src/frontend/pages/CompanyLedgerPage.tsx`
- Navigation target: `Company Ledger`
- Organization Network start-trade action can open Company Ledger.

## Validation Result

The projection links backend records for:

- procurement order
- delivery evidence metadata/hash
- escrow status
- lifecycle event reference
- proof payload hash/status
- restricted financing status
- organization relationship metadata

The projection returns safe metadata only. It does not return raw KYC documents, raw delivery files, raw contract terms, payment credentials, or fabricated chain data.

## Browser Smoke

Passed against the rebuilt Docker app stack with `buyer.demo / demo-password`.

- Company Ledger navigation was visible.
- Company Ledger showed `Private deal view`.
- Amanah-Barakah deal projection rendered order, delivery evidence, escrow, proof event, proof hash, and financing status.
- Mudarabah projection rendered in the same workspace.

## Claim Boundary

The product label is `Company Ledger` / `Private deal view`. This is a backend read-model projection, not a production private ledger, production Fabric channel, ERP system, or payment rail.

## Known Limitations

- Projection visibility depends on currently implemented procurement, delivery, escrow, proof, relationship, and PLS records.
- Production Fabric private data collections remain out of scope for this slice.
