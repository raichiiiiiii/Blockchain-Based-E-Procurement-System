# PBI-441 / PBI-442 Escrow Release, Dispute, and Arbitration Validation

Date: 2026-05-26

Branch: `feature/PBI-441-442-escrow-release-dispute`

Readiness wording: Supervisor-demo plus selected pilot-hardening features, not deployable pilot-ready, commercial-ready, or production-certified.

## Scope

This slice extends escrow from creation-only into an MVP release and dispute lifecycle:

- mark escrow funded without moving money
- request release only after accepted order, delivery evidence, eligibility, and dispute-free checks pass
- approve release into `settlementInstructionReady`
- place hold
- open dispute
- record an arbitration outcome that prepares release instruction, refund, or cancellation
- emit and anchor escrow lifecycle events when the proof gateway is available

This is not real payment settlement, ISO 20022 execution, bank integration, a full external arbitration module, or production escrow smart-contract settlement.

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/architecture/ESCROW_SMART_CONTRACT_BOUNDARY.md`
- `docs/contracts/ESCROW_WORKFLOW_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/evidence/qa/PBI-441_442_ESCROW_RELEASE_DISPUTE_VALIDATION.md`
- `migrations/006_escrow_release_dispute_statuses.sql`
- `src/app/server.ts`
- `src/frontend/lib/escrow-client.ts`
- `src/frontend/pages/BuyerDashboard.tsx`
- `src/frontend/pages/EscrowDetailPage.tsx`
- `src/frontend/pages/EscrowOverviewPage.tsx`
- `src/frontend/styles/components.css`
- `src/modules/escrow/api/escrow.routes.ts`
- `src/modules/escrow/api/escrow.routes.test.ts`
- `src/modules/escrow/application/transition-escrow.ts`
- `src/modules/escrow/domain/escrow.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.ts`

## API Routes Added

The routes are mounted under `/api/v1`:

- `POST /api/v1/escrow/:escrowId/fund`
- `POST /api/v1/escrow/:escrowId/request-release`
- `POST /api/v1/escrow/:escrowId/approve-release`
- `POST /api/v1/escrow/:escrowId/hold`
- `POST /api/v1/escrow/:escrowId/dispute`
- `POST /api/v1/escrow/:escrowId/arbitration-decision`

Existing escrow create/read routes remain available.

## Authorization Behavior

- Anonymous requests are denied by authenticated request middleware.
- Funding is limited to the buyer or financier organization.
- Release request is limited to the buyer or supplier organization.
- Release approval is limited to the buyer organization.
- Hold is limited to buyer, administrator, or security operator.
- Dispute open is limited to the buyer or supplier organization.
- Arbitration decision is limited to administrator or auditor roles.
- Read access remains scoped to buyer, supplier, financier, auditor, security operator, and administrator according to the route guard.

Backend authorization remains authoritative. Frontend buttons do not grant privileges.

## Release Conditions

Release request and release approval require:

- accepted order or accepted order reference
- delivery evidence for the order
- buyer and supplier eligibility
- no active hold/dispute/arbitration state

If any condition fails, the API returns a conflict response with a release-condition summary.

## Audit and Blockchain Proof Behavior

Each transition records a procure-to-pay lifecycle event:

- `escrowFunded`
- `escrowReleaseRequested`
- `escrowReleaseApproved`
- `escrowHeld`
- `escrowDisputeOpened`
- `escrowArbitrationDecisionRecorded`

The lifecycle event hash is sent to the blockchain anchor gateway when available. Anchor failure does not delete or corrupt the escrow transition. Raw escrow terms, payment credentials, private commercial documents, and raw delivery evidence are not placed on-chain.

## Frontend Behavior

The escrow detail surface now shows:

- expanded escrow statuses
- release-condition summary
- role-aware transition actions
- hold, dispute, and arbitration controls where allowed
- explicit wording that release approval prepares a settlement instruction only and does not execute payment

## Tests Added or Updated

- Valid release conditions are required before release request.
- Funded escrow moves through release request to `settlementInstructionReady`.
- Dispute blocks release.
- Arbitration outcome records an auditable result without payment execution.
- Unauthorized release approval attempts are rejected.
- Existing create/read/duplicate/eligibility/anchor-failure tests still pass.

## Browser Smoke

Browser smoke was run against local frontend `http://localhost:5173` and backend `http://localhost:3100` with PostgreSQL mode:

- `buyer.demo` signed in through the credential-only login form.
- Login page showed username, password, sign in, and no `Continue as` role shortcuts.
- Buyer dashboard and Escrow navigation loaded.
- A local smoke setup created temporary in-memory KYC approvals for buyer and supplier because KYC onboarding state is still held in the running backend memory repository.
- The seeded database already contained `demo-escrow-001`, so attempting to create from the overview returned the expected active-escrow conflict rather than opening lifecycle controls.

Browser finding: the live seeded demo should either load the existing escrow by order reference in the overview or avoid seeding an active escrow when the walkthrough expects creation. Backend transition behavior is validated by automated route tests.

## Validation Commands and Results

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/escrow/api/escrow.routes.test.ts` | Passed: 14 tests, 0 failures. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed; Vite production bundle built. |
| `npm test` | Passed: 734 tests, 0 failures. |
| `npm run db:migrate -- --dry-run` | Passed; 6 migration files validated. |
| `npm run db:seed -- --dry-run` | Passed; 9 demo accounts and demo procurement records validated. |
| `docker compose config` | Passed. |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed; no duplicate or malformed PBI IDs. |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed; no forbidden product-label matches. |
| `git diff --check` | Passed; only LF-to-CRLF working-copy notices were printed. |

Additional smoke setup:

- `docker compose up -d postgres` succeeded.
- `npm run db:migrate` applied `006_escrow_release_dispute_statuses.sql` after earlier migrations were already applied.
- `npm run db:seed` seeded demo accounts, procurement order, delivery evidence, proof metadata, and demo escrow.

## Backlog Status

- `PBI-441` marked `Completed` in `backlog/production-extension-roadmap.csv` for the no-payment release workflow ending at `settlementInstructionReady`.
- `PBI-442` marked `Completed` in `backlog/production-extension-roadmap.csv` for internal MVP dispute/hold/arbitration workflow controls.
- Canonical `backlog/backlog.csv` was not changed because these production-extension PBIs are tracked in the extension roadmap.

## Known Limitations

- No real payment settlement, payment instruction adapter, or bank rail execution.
- No ISO 20022 payment execution.
- No full external arbitration provider integration.
- No production escrow chaincode settlement.
- PostgreSQL escrow status persistence now supports the new statuses, but `statusReason` and `releaseConditionSummary` are primarily returned with the transition response and lifecycle metadata.
- Live browser walkthrough currently needs seed/demo alignment so the Escrow overview can open the already seeded escrow instead of only offering create.

## Recommended Next Slice

Proceed to PBI-439 Payment adapter framework after review. That slice should turn `settlementInstructionReady` into a sandbox/manual payment instruction without claiming real payment execution.
