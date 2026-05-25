# PBI-372 Procurement Workflow Validation

Date: 2026-05-25  
Status: Completed for mandatory buyer/supplier order path

## Scope

Wave 3 procurement coverage for:

- PBI-372 Complete buyer and supplier order workflow
- PBI-373 Buyer order workspace
- PBI-374 Procurement order domain model
- PBI-375 Order create/get/list API
- PBI-376 Supplier received orders
- PBI-377 Supplier order acknowledgement
- PBI-378 Link accepted order to escrow
- PBI-381 Procurement UAT
- PBI-382 Procurement runbook update

## Implementation Summary

- Added a procurement order domain model, repository seam, in-memory adapter, and protected order API routes.
- Buyer order creation uses authenticated actor context and checks onboarding eligibility before creating an order.
- Supplier order acknowledgement is restricted to the assigned supplier organization and emits lifecycle evidence.
- Buyer dashboard now includes an Orders workspace with order create, list, detail, lifecycle hash, and delivery metadata readiness.
- Supplier dashboard now includes Received Orders, acknowledgement controls, delivery evidence metadata view, and escrow readiness view.
- Escrow overview now consumes an accepted order reference from the buyer order workspace instead of floating from an unrelated page state.

## Validation

| Command / check | Result |
|---|---|
| `npm run build` | Pass |
| `node --loader ts-node/esm --test src/modules/procurement/api/procurement-order.routes.test.ts` | Pass, 5 tests |
| `npm run frontend:build` | Pass |
| `npm test` | Pass, 646 tests |
| `git diff --check` | Pass, LF-to-CRLF normalization warnings only |
| `Import-Csv backlog/backlog.csv`, `Import-Csv backlog/deployment-ready-roadmap.csv` | Pass, 360 backlog rows and 68 roadmap rows, no duplicate IDs |
| Browser smoke, `http://127.0.0.1:5173/` | Pass |

Browser smoke path:

```text
Landing
-> Sign in
-> Continue as Buyer
-> Orders
-> Create order
-> Escrow
-> Logout
-> Continue as Supplier
-> Received Orders
-> Accept order
```

Observed result:

```text
Buyer order creation message appeared.
Supplier received the created order.
Supplier acceptance message appeared.
Buyer escrow surface showed an accepted order reference.
No product UI backlog/PBI/sprint labels were visible.
Browser console errors/warnings: 0.
Screenshot captured successfully.
```

## Authorization Coverage

- Anonymous order listing is rejected by backend tests.
- Buyer-only create is enforced by backend service and route tests.
- Supplier acknowledgement is restricted to the assigned supplier organization.
- Supplier from another organization cannot acknowledge the order.
- Buyer order creation is blocked when eligibility is `unknown`.

## Known Limitations

- Delivery evidence is metadata-only in this wave. No upload, IoT, QR, or document rendering is implemented.
- Runtime persistence for new orders remains in-memory/backend or local demo storage unless a future Postgres composition switch is enabled.
- The escrow backend still allows the first-slice explicit demo order reference; the frontend now passes accepted order references where available.
