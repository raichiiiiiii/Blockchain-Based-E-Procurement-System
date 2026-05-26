# ERP and Accounting Adapter Contract

Status: production-extension integration boundary
Owner: Integration Engineer / Backend Engineer
Related PBIs: PBI-449, PBI-458, PBI-450, PBI-451
Related requirements: R05, R11, R15, R18, R23, R25

## 1. Purpose

This contract defines the first ERP/accounting integration boundary for the Digital Procurement and PLS Seedbed MVP.

The implementation produces deterministic local JSON artifacts that map internal orders, contracts, and payment statuses into UBL/Peppol-like and OCDS-like payloads. It does not connect to a production ERP, accounting platform, Peppol access point, tax authority, or payment network.

## 2. Official References Reviewed

- OCDS getting started and building blocks: https://standard.open-contracting.org/latest/en/getting_started/building_blocks/
- OCDS release schema reference: https://standard.open-contracting.org/latest/en/schema/reference/
- OASIS UBL 2.1: https://docs.oasis-open.org/ubl/UBL-2.1.html
- Peppol BIS Billing 3.0: https://test-docs.peppol.eu/poacc/billing/3.0/bis/
- Peppol Invoice Response profile: https://docs.peppol.eu/poacc/upgrade-3/profiles/63-invoiceresponse/

Findings applied:

- OCDS models contracting processes across tender, award, contract, and implementation stages, and uses JSON Schema with JSON as the default data format.
- UBL 2.1 includes procurement and fulfillment documents such as Order, Order Response, Despatch Advice, Receipt Advice, and Invoice.
- Peppol BIS Billing covers invoice and credit note processes, including invoices based on purchase orders, contracts, and despatch advice references.

These references guide adapter payload shape only. The system does not claim standard certification or network connectivity.

## 3. In Scope

- `ErpAccountingPort`.
- local JSON adapter.
- import/export API routes.
- idempotency-key replay for import/export requests.
- UBL/Peppol-like order and invoice JSON export.
- local payment status and journal event export.
- OCDS-like contract release package export.
- import validation for UBL-like order and invoice payloads.
- clear mapping errors.

## 4. Out of Scope

- production ERP/accounting system connection.
- Peppol network delivery.
- UBL XML generation and schema validation.
- tax authority reporting.
- automated invoice approval.
- payment execution or bank settlement.
- storage of ERP credentials or accounting secrets.

## 5. Port

```ts
export interface ErpAccountingPort {
  exportPurchaseOrder(order, context): Promise<ErpIntegrationJob>;
  importPurchaseOrder(payload, context): Promise<ErpIntegrationJob>;
  exportInvoice(order, context): Promise<ErpIntegrationJob>;
  importInvoice(payload, context): Promise<ErpIntegrationJob>;
  exportPaymentStatus(instruction, context): Promise<ErpIntegrationJob>;
  exportJournalEvent(instruction, context): Promise<ErpIntegrationJob>;
  exportContractReleasePackage(contract, context): Promise<ErpIntegrationJob>;
  getJob(jobId): Promise<ErpIntegrationJob | null>;
  getJobByIdempotencyKey(profileType, idempotencyKey): Promise<ErpIntegrationJob | null>;
}
```

## 6. API Routes

```text
POST /api/v1/integrations/erp/export
POST /api/v1/integrations/erp/import
GET /api/v1/integrations/erp/jobs/:jobId
```

The write routes are restricted to administrators. Job inspection is read-only for administrators, auditors, regulators, and security operators.

`Idempotency-Key` may be supplied on import/export requests. Replayed keys return the original job for the same profile.

## 7. Profile Types

Supported export profiles:

- `ublOrder`
- `ublInvoice`
- `ublDespatchAdvice`
- `paymentStatus`
- `journalEvent`
- `ocdsReleasePackage`

Supported import profiles:

- `ublOrder`
- `ublInvoice`

## 8. Job Model

```json
{
  "jobId": "erp_job_...",
  "direction": "export",
  "profileType": "ublOrder",
  "sourceId": "order-001",
  "status": "completed",
  "payload": {},
  "mappingErrors": [],
  "idempotencyKey": "optional",
  "createdAt": "2026-05-26T00:00:00.000Z",
  "claimBoundary": "localJsonAdapterOnlyNoProductionErpSync"
}
```

Import jobs can return `rejected` with `mappingErrors` when required fields are missing.

## 9. Claim Boundary

Product and evidence wording may say:

- ERP/accounting adapter boundary.
- UBL/Peppol-like JSON mapping.
- OCDS-like release package.
- local JSON adapter.
- mapping-only export/import validation.

Product and evidence wording must not say:

- production ERP integration is complete.
- Peppol network delivery is active.
- UBL XML certification is complete.
- tax reporting is automated.
- payment or accounting posting has occurred externally.
