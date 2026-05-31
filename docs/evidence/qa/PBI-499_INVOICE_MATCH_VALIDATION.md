# PBI-499 Invoice Match Validation

Date: 2026-06-01
Branch: codex/issue-26-executable-actor-workflows

## Scope

Implemented invoice metadata submission, three-way match against order and delivery evidence records, payment-readiness approval, and invoice lifecycle events.

No bank payment is executed. Payment readiness is a workflow state only.

## Files

- `src/modules/procurement/domain/invoice.ts`
- `src/modules/procurement/application/invoice-service.ts`
- `src/modules/procurement/api/invoice.routes.ts`
- `src/modules/procurement/infrastructure/in-memory-invoice-repository.ts`
- `src/frontend/pages/InvoiceWorkspacePage.tsx`
- `src/frontend/api/invoices.ts`
- `docs/contracts/openapi/openapi.yaml`

## API Routes

- `POST /api/v1/invoices`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `POST /api/v1/invoices/:id/verify-match`
- `POST /api/v1/invoices/:id/approve-payment`

## Validation

- Targeted test: `node --test --loader ts-node/esm src/modules/procurement/api/issue26-workflow.routes.test.ts` passed, including match pass and mismatch cases.
- Full suite: `npm test` passed, 842 tests.
- Build: `npm run build` passed.
- Frontend build: `npm run frontend:build` passed.

## Known Limitations

Invoice records are metadata and hash records only. Raw invoice documents, production payment execution, external bank confirmation, and production ERP posting remain out of scope.
