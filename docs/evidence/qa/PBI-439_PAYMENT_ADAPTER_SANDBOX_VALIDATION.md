# PBI-439 Payment Adapter Sandbox Validation

Date: 2026-05-26
Branch: feature/PBI-439-payment-adapter-sandbox
Commit inspected before change: 004a0cb
Readiness statement: supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## Scope

PBI-439 adds a payment instruction boundary after escrow reaches `settlementInstructionReady`.

Implemented:

- `PaymentPort` application seam.
- `LocalSandboxPaymentAdapter`.
- `ManualSettlementAdapter`.
- In-memory payment instruction repository for fast tests and demo runtime.
- Backend create/read/reconcile routes.
- Settlement lifecycle audit events.
- Escrow detail payment instruction surface.
- Payment adapter contract documentation.

Not implemented:

- real bank payment execution.
- ISO 20022 message generation or bank certification.
- production payment credentials.
- production reconciliation files.
- PostgreSQL payment instruction repository.
- automatic final escrow settlement from bank confirmation.

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/PAYMENT_ADAPTER_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `src/app/server.ts`
- `src/frontend/lib/payment-client.ts`
- `src/frontend/pages/EscrowDetailPage.tsx`
- `src/modules/payments/api/payment.routes.ts`
- `src/modules/payments/api/payment.routes.test.ts`
- `src/modules/payments/application/payment-instruction-repository.ts`
- `src/modules/payments/application/payment-instruction-service.ts`
- `src/modules/payments/application/payment-port.ts`
- `src/modules/payments/domain/payment-instruction.ts`
- `src/modules/payments/infrastructure/in-memory-payment-instruction-repository.ts`
- `src/modules/payments/infrastructure/local-sandbox-payment-adapter.ts`
- `src/modules/payments/infrastructure/manual-settlement-adapter.ts`

## API Routes Added

- `POST /api/v1/payments/instructions`
- `GET /api/v1/payments/instructions/:paymentInstructionId`
- `POST /api/v1/payments/instructions/:paymentInstructionId/reconcile`

## Authorization Behavior

- Anonymous payment instruction requests return `401`.
- Payment instruction creation requires authenticated buyer, financier, or administrator context for the linked escrow.
- Escrow must already be `settlementInstructionReady`.
- Duplicate active payment instructions for the same escrow are rejected with `409`.
- Supplier mutation is denied.
- Auditor/regulator/security/administrator and related buyer/supplier/financier parties can read payment instructions according to the read policy.

## Audit Event Behavior

Payment instruction creation and reconciliation emit settlement lifecycle events through the existing transaction history seam:

- `settlementInitiated`
- `settlementCompleted`
- `settlementFailed`

Lifecycle metadata explicitly records `paymentExecution: sandboxOrManualOnly`.

## Frontend Behavior

The escrow detail page shows a `Payment Instruction` panel only after escrow reaches `settlementInstructionReady`.

The panel can:

- create a sandbox instruction.
- show status, amount, payment reference, and adapter reference.
- reconcile to settled or failed.
- state that no bank rail or external payment is executed.

The frontend client uses backend session credentials in the normal path. Local fallback remains gated by explicit runtime configuration and is not silent.

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/payments/api/payment.routes.test.ts` | Passed, 7 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 741 tests |
| `npm run db:migrate -- --dry-run` | Passed, 6 migrations validated |
| `npm run db:seed -- --dry-run` | Passed, 9 demo accounts and demo procurement/escrow data validated |
| `docker compose config` | Passed |
| CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed, no duplicate PBI IDs |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed, no matches |
| `git diff --check` | Passed with existing LF/CRLF normalization warnings only |

Note: a first CSV validation attempt used bash-style heredoc syntax in PowerShell and failed before Python executed. The same validation was rerun using PowerShell stdin syntax and passed.

## Browser Smoke

Environment:

- Backend: `http://localhost:3100`, PostgreSQL mode.
- Frontend: `http://127.0.0.1:5173`.
- Local fallback disabled.
- Guided demo disabled.

Observed:

- `/login` renders credential-only sign-in.
- No `Continue as` role-card login is visible.
- `buyer.demo / demo-password` signs in successfully.
- Buyer dashboard renders buyer navigation including Orders, Escrow, and Blockchain Proof.
- Buyer Escrow overview renders accepted-order escrow content.

Limitation observed:

- The seeded database already contains `demo-escrow-001`, but the Escrow overview still starts from the create path instead of loading that existing escrow record into frontend state. This prevents reaching the `Payment Instruction` panel through a pure browser path in this run. Payment behavior is covered by backend route tests and frontend build validation. A future UI polish slice should load existing escrow by order reference or expose a direct escrow detail route.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-439 `Completed` for sandbox/manual payment adapter scope.

Canonical `backlog/backlog.csv` was not changed because the production-extension PBI is tracked in `backlog/production-extension-roadmap.csv`.

## Known Limitations

- No real payment execution.
- No bank adapter.
- No ISO 20022 generation or certification.
- No production payment credentials.
- No PostgreSQL payment instruction repository in this slice.
- No automatic escrow settled state from payment status.
- Browser payment-panel access is blocked by the existing seeded-escrow frontend loading gap described above.

## Recommended Next Slice

Proceed to PBI-440 ISO 20022 payment mapping. Keep the mapper adapter-based, deterministic, and claim-safe: ISO 20022-like artifacts only until real bank certification and rail integration are implemented.
