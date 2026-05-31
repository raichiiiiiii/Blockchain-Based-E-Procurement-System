# PBI-482 Company-Centric UAT Validation

Date: 2026-05-31
Branch: `codex/issue-15-company-centric-ux`

## Scope

Validated the company-centric seed data and UAT path for Amanah Retail, Barakah Supplies, and Mabrur Finance Partner.

## Seed Data

`npm run db:seed -- --dry-run` passed and reported 10 demo accounts:

- `admin.demo`
- `auditor.demo`
- `regulator.demo`
- `compliance.demo`
- `shariah.demo`
- `buyer.demo`
- `amanah.admin`
- `supplier.demo`
- `financier.demo`
- `security.demo`

The dry-run also reported demo KYC/AML eligibility, Shariah review, Shariah certificate artifact, PLS contract, procurement order, delivery evidence, lifecycle events, anchor metadata, escrow records, and organization network graph records.

## UAT Path Covered

- Credential-only login.
- Company dashboard context.
- Organization-scoped user management.
- Company settings/profile maintenance.
- Company Ledger private deal projection.
- Restricted Mudarabah projection.
- Honest proof state visualization.

## Browser Smoke

Passed against the rebuilt Docker app stack:

- `buyer.demo / demo-password` reached company dashboard and Company Ledger.
- `amanah.admin / demo-password` reached company dashboard and Company Users.

## Known Limitations

- Browser smoke used the Docker app stack because host-side PostgreSQL port access refused local Node connections in this environment while the app-stack backend and database were healthy internally.
- This is still supervisor-demo plus selected pilot-hardening scope, not commercial-ready or production-certified.
