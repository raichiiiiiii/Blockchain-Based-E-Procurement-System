# PBI-006 Escrow First Slice Validation

Date: 2026-05-25

## Scope

Implemented the first executable escrow slice for:

- accepted/demo order reference to `escrowCreated`
- escrow domain model and repository seam
- in-memory and PostgreSQL escrow adapters
- create/get escrow API routes
- `escrowCreated` procure-to-pay lifecycle event emission
- blockchain anchor gateway integration for the lifecycle event hash
- buyer dashboard escrow overview/detail UI with blockchain proof panel
- Wave 5 hardening for accepted-order linkage and eligibility gating

## Files Changed

- `src/modules/escrow/domain/escrow.ts`
- `src/modules/escrow/application/escrow-repository.ts`
- `src/modules/escrow/application/create-escrow.ts`
- `src/modules/escrow/application/get-escrow.ts`
- `src/modules/escrow/infrastructure/in-memory-escrow-repository.ts`
- `src/modules/escrow/infrastructure/postgres-escrow-repository.ts`
- `src/modules/escrow/api/escrow.routes.ts`
- `src/modules/escrow/application/create-escrow.test.ts`
- `src/modules/escrow/api/escrow.routes.test.ts`
- `src/modules/procurement/application/procurement-order-repository.ts`
- `src/modules/procurement/application/procurement-eligibility-gateway.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.ts`
- `src/app/server.ts`
- `migrations/004_escrows.sql`
- `scripts/db/seed-demo-data.ts`
- `src/frontend/lib/escrow-client.ts`
- `src/frontend/pages/EscrowOverviewPage.tsx`
- `src/frontend/pages/EscrowDetailPage.tsx`
- `src/frontend/pages/BuyerDashboard.tsx`
- `src/frontend/App.tsx`
- `src/frontend/styles.css`

## Behavior Validated

- Buyer can create escrow from a demo accepted order reference.
- Buyer can create escrow from a persisted accepted procurement order.
- Escrow creation rejects persisted orders that are not accepted.
- Escrow creation rejects buyer/supplier organization mismatches against the accepted order.
- Escrow creation rejects signed-in buyer organization mismatch when server session context is available.
- Escrow creation rejects non-eligible buyer or supplier organizations through the eligibility gateway.
- Created escrow enters `escrowCreated`.
- Duplicate active escrow for the same order is rejected.
- Invalid create input is rejected with the standard validation envelope.
- Unauthenticated create requests are rejected.
- Non-buyer create requests are rejected.
- Auditor and security operator read access is read-only, while unrelated roles cannot read escrow records.
- Creating escrow emits a procure-to-pay lifecycle event with `lifecycleStage = escrow`, `eventType = escrowCreated`, `targetType = escrow`, and `outcome = success`.
- The escrow lifecycle event hash is anchored through the blockchain gateway when available.
- Blockchain anchoring failure returns an escrow success response with `blockchainAnchor.anchorStatus = failed`.
- The buyer UI shows escrow status, safe organization identifiers, terms hash, lifecycle event id/hash, and proof metadata.
- Frontend escrow creation no longer converts backend `FORBIDDEN`, `CONFLICT`, or `VALIDATION_ERROR` responses into local demo success.
- Raw payment credentials, full commercial terms, private documents, and KYC data are not exposed.

## Validation Commands

```text
pass - npm run build
pass - npm run frontend:build
fail then pass - node --test --loader ts-node/esm src/modules/escrow/application/create-escrow.test.ts src/modules/escrow/api/escrow.routes.test.ts src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.test.ts src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.test.ts
fail then pass - node --loader ts-node/esm --test src/modules/escrow/application/create-escrow.test.ts src/modules/escrow/api/escrow.routes.test.ts
pass - npm test
pass - npm run db:migrate -- --dry-run
pass - npm run db:seed -- --dry-run
pass - rg -n "pg|fabric-network|fabric-contract-api|fabric-shim" src/modules src/app -g "*/domain/*.ts" -g "*/application/*.ts"
pass - frontend forbidden-label scan; `rg` returned no product-facing backlog/PBI/sprint labels in `src/frontend`
pass - git diff --check
pass - browser smoke test
```

Earlier Sprint 6 targeted test failure was caused by comparing the unprefixed lifecycle payload hash with normalized blockchain metadata. The assertion was corrected to compare against the proof-facing anchor hash. During Wave 5 recheck, the first updated targeted escrow route run failed because the route `forbidden` helper did not yet accept error details for eligibility denial; the helper was corrected and the targeted suite passed.

Full test result:

```text
npm test: 658 tests passed, 0 failed
```

Migration dry-run result:

```text
Validated 4 migration file(s): 001_auth_membership.sql, 002_audit_procurement.sql, 003_blockchain_anchors.sql, 004_escrows.sql
```

Browser smoke result:

```text
http://localhost:5174/login -> Continue as Buyer -> Dashboard -> Escrow -> Create escrow
Observed: Escrow created, Blockchain Proof, Pending anchoring
Console warnings/errors: 0
Raw terms marker: not present
```

`git diff --check` completed successfully. PowerShell output included existing LF-to-CRLF normalization warnings for modified files, but the command exited with status 0.

## Known Limitations

- Settlement release, dispute handling, funding, payment execution, and PLS distribution remain out of scope.
- The frontend keeps a local demo escrow adapter so the buyer page remains demonstrable when the backend is not running.
- Proof verification from the buyer escrow page is intentionally not presented as verified unless an anchored proof and verification result are actually available.
- The escrow backend allows an explicit `accepted-order-demo-*` reference as an MVP demo fallback when a persisted order is not present; persisted orders must be accepted.
