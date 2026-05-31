# ERPNext/Frappe Procurement UX Study

Date: 2026-05-31
Related issue: GitHub Issue #14

## Purpose

This study uses ERPNext and Frappe as UI/process references for the Digital
Procurement and PLS Seedbed MVP. It does not propose replacing this application
with ERPNext or adding ERPNext/Frappe as a runtime dependency.

Safe readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening and production-like Fabric lab validation; not commercial-ready or production-certified.
```

## Sources Inspected

- ERPNext Buying module: https://docs.frappe.io/erpnext/buying
- ERPNext Material Request: https://docs.frappe.io/erpnext/material-request
- ERPNext Request for Quotation: https://docs.frappe.io/erpnext/request-for-quotation
- ERPNext Supplier Quotation: https://docs.frappe.io/erpnext/supplier-quotation
- ERPNext Purchase Order: https://docs.frappe.io/erpnext/purchase-order
- ERPNext Purchase Invoice: https://docs.frappe.io/erpnext/purchase-invoice
- ERPNext Supplier: https://docs.frappe.io/erpnext/supplier
- ERPNext Supplier Scorecard: https://docs.frappe.io/erpnext/supplier-scorecard
- Frappe Notifications: https://docs.frappe.io/framework/notifications

## What To Borrow

- Use procurement nouns that match how operators think: supplier, quotation,
  purchase order, invoice, delivery, scorecard, tracker, and reports.
- Keep workspace navigation dense but predictable, with master data and
  transaction activity visible from the same operational surface.
- Treat notifications as event-driven workflow records with clear recipient,
  template, condition, and delivery status metadata.
- Use supplier/organization records as reusable master data rather than
  duplicating relationship details inside every transaction screen.
- Make procurement status visible as a pipeline so the user can scan where a
  deal is currently blocked.

## What Not To Copy

- Do not copy ERPNext's document model as the internal domain model. This
  system keeps its own procurement, escrow, proof, compliance, and PLS domain
  boundaries.
- Do not add ERPNext/Frappe as a framework dependency.
- Do not introduce accounting, stock, invoice, or payment execution claims that
  are outside the validated product scope.
- Do not expose ERP-style raw document attachments in proof surfaces where this
  platform only needs safe metadata and hashes.

## Mapping To Current Workflows

| ERPNext/Frappe concept | Platform mapping |
| --- | --- |
| Buying workspace | Role dashboard plus Organization Network workspace |
| Supplier master | Member organization profile with unique identifier |
| Material request | Future demand/intake step before purchase order |
| Request for quotation | Future pre-order sourcing workflow |
| Supplier quotation | Future supplier offer/contract negotiation artifact |
| Purchase order | Existing procurement order |
| Purchase invoice | Future invoice/payment adapter scope |
| Supplier scorecard | Future supplier readiness/risk score |
| Procurement tracker/report | Audit trail, proof timeline, export bundle, graph workspace |
| Notification | Local email outbox with safe workflow summaries |
| Role permissions | Existing authenticated session and organization-scoped role checks |

## Graph/Proof Differentiation

ERPNext is optimized around operational documents and ERP workflows. This
platform differentiates by showing cross-organization procurement relationships
as a proof-aware network: nodes represent organizations, directional vectors
represent relationship/deal roles, and each edge can show proof scope, latest
payload hash, anchor state, and verification state.

## Future Backlog Ideas

- Supplier readiness score using compliance status, delivery evidence, and
  proof reliability.
- RFQ/quotation pre-order workspace.
- Invoice exception queue connected to escrow/payment adapter status.
- Procurement tracker report that combines relationship, order, delivery,
  escrow, proof, and export evidence.
- Notification preference management for organization admins.

## Decision

ERPNext/Frappe should remain a product reference for procurement clarity,
navigation, and notification patterns. The implementation keeps this platform's
own compliance-first, blockchain-proof, and Shariah/PLS boundaries intact.
