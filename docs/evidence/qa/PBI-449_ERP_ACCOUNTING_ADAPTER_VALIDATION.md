# PBI-449 ERP and Accounting Adapter Validation

Date: 2026-05-26
Branch: feature/PBI-449-erp-accounting-adapter
Commit inspected before change: deaafdc
Readiness statement: supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## Scope

PBI-449 adds a swappable ERP/accounting adapter boundary with local JSON mappings.

Implemented:

- `ErpAccountingPort`.
- local JSON ERP/accounting adapter.
- import/export/job API routes.
- idempotency-key replay for import/export requests.
- UBL/Peppol-like order and invoice export.
- UBL-like despatch advice export for local fulfillment handoff evidence.
- local payment status and journal event export.
- OCDS-like contract release package export.
- UBL-like order and invoice import validation with clear mapping errors.
- contract documentation: `docs/contracts/ERP_ACCOUNTING_ADAPTER_CONTRACT.md`.

Not implemented:

- production ERP/accounting platform connection.
- Peppol access point delivery.
- UBL XML generation or schema certification.
- tax authority reporting.
- payment settlement or accounting posting outside the platform.

## Official References Reviewed

- OCDS getting started and building blocks: https://standard.open-contracting.org/latest/en/getting_started/building_blocks/
- OCDS release schema reference: https://standard.open-contracting.org/latest/en/schema/reference/
- OASIS UBL 2.1: https://docs.oasis-open.org/ubl/UBL-2.1.html
- Peppol BIS Billing 3.0: https://test-docs.peppol.eu/poacc/billing/3.0/bis/
- Peppol Invoice Response profile: https://docs.peppol.eu/poacc/upgrade-3/profiles/63-invoiceresponse/

Applied findings:

- OCDS represents contracting processes across tender, award, contract, and implementation stages and uses JSON Schema/JSON as the default publication model.
- UBL 2.1 includes common procurement documents such as Order, Order Response, Despatch Advice, Receipt Advice, and Invoice.
- Peppol BIS Billing covers invoice processes based on purchase orders, contracts, and despatch advice references.

The implementation uses these references as mapping discipline only and does not claim network conformance.

## API Routes Added

```text
POST /api/v1/integrations/erp/export
POST /api/v1/integrations/erp/import
GET /api/v1/integrations/erp/jobs/:jobId
```

Supported export profile types:

- `ublOrder`
- `ublInvoice`
- `ublDespatchAdvice`
- `paymentStatus`
- `journalEvent`
- `ocdsReleasePackage`

Supported import profile types:

- `ublOrder`
- `ublInvoice`

## Authorization

- Administrators can request import/export mapping jobs.
- Administrators, auditors, regulators, and security operators can inspect jobs.
- Buyers and unrelated roles are denied.

## Mapping Behavior

Order export:

- maps internal procurement order to UBL/Peppol-like Order JSON.
- includes buyer, supplier, order line, amount, currency, issue date, and source status.

Invoice export:

- maps internal procurement order to UBL/Peppol-like Invoice JSON.
- includes supplier, customer, order reference, legal monetary total, and invoice line.

Despatch advice export:

- maps internal accepted order metadata into a UBL-like Despatch Advice JSON shape.
- includes supplier, customer, order reference, source status, and safe line metadata.

Payment status export:

- maps sandbox/manual payment instruction status to local accounting status JSON.

OCDS-like contract release:

- maps machine-readable contract parties, value, period, and implementation milestones into a JSON release-package shape.

Import validation:

- rejects incomplete UBL-like order/invoice payloads with `mappingErrors`.
- preserves the job and claim boundary even when rejected.

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/ERP_ACCOUNTING_ADAPTER_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/evidence/qa/PBI-449_ERP_ACCOUNTING_ADAPTER_VALIDATION.md`
- `src/app/server.ts`
- `src/modules/integration/api/erp-accounting.routes.ts`
- `src/modules/integration/api/erp-accounting.routes.test.ts`
- `src/modules/integration/application/erp-accounting-port.ts`
- `src/modules/integration/application/erp-accounting-service.ts`
- `src/modules/integration/domain/erp-accounting.ts`
- `src/modules/integration/infrastructure/local-json-erp-accounting-adapter.ts`

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/integration/api/erp-accounting.routes.test.ts` | Passed, 4 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 759 tests |
| CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed; 435 canonical rows, 27 production-extension rows, no duplicate or malformed PBI IDs |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed; no product source matches |
| `git diff --check` | Passed; line-ending warnings only |

Database migration/seed commands were not rerun for this phase because no database schema or seed data changed.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-449 `Completed` for a local JSON ERP/accounting adapter boundary.

Canonical `backlog/backlog.csv` was not changed because the production-extension PBI is tracked in `backlog/production-extension-roadmap.csv`.

## Known Limitations

- local JSON adapter only.
- no production ERP/accounting system connection.
- no Peppol access point delivery.
- no UBL XML or schema certification.
- no tax reporting.
- no external accounting posting.

## Recommended Next Slice

Proceed to PBI-437/PBI-438 production Fabric consortium plan/foundation only after review/merge, or continue to the next approved phase if this branch stack is being validated as a continuous run.
