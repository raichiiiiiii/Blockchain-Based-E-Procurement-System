# PBI-443 / PBI-444 IoT, QR, and EPCIS Delivery Proof Validation

Date: 2026-05-26

Branch: `feature/PBI-443-444-iot-epcis-logistics-proof`

Commit inspected before change: `d7a6260`

Readiness wording: Supervisor-demo plus selected pilot-hardening features, not deployable pilot-ready, commercial-ready, or production-certified.

## Scope

This slice implements signed external delivery proof intake for:

- IoT delivery proof events
- QR proof metadata
- EPCIS-compatible logistics visibility events

It builds on the existing external API gateway and delivery evidence workflow. It does not implement production device PKI, full QR public-key verification, a full EPCIS capture/query repository, carrier integration, IoT hardware integration, or EPCIS certification.

## Standards Reference

- GS1 positions EPCIS as a supply-chain visibility data-sharing standard used with the Core Business Vocabulary.
- EPCIS 2.0.1 includes visibility-event families used by this adapter boundary: ObjectEvent, AggregationEvent, TransactionEvent, TransformationEvent, and AssociationEvent.
- This implementation uses EPCIS as an adapter input mapping. It does not replace the internal procurement lifecycle model.

References:

- `https://www.gs1.org/standards/epcis`
- `https://ref.gs1.org/standards/epcis/2.0.1/`
- `https://ref.gs1.org/standards/cbv/2.0.0/`

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/IOT_QR_EPCIS_DELIVERY_PROOF_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/evidence/qa/PBI-443_444_IOT_EPCIS_DELIVERY_PROOF_VALIDATION.md`
- `src/app/server.ts`
- `src/modules/integration/api/external-api.routes.ts`
- `src/modules/integration/api/external-api.routes.test.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-event-builder.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.ts`
- `src/modules/procurement/application/submit-delivery-evidence.ts`

## API Routes Added

- `POST /api/v1/external/iot/events`
- `POST /api/v1/external/qr/proofs`
- `POST /api/v1/external/epcis/events`

All routes require signed external API headers:

- `x-client-id`
- `x-request-timestamp`
- `x-signature`
- `idempotency-key`

## Authorization Behavior

- IoT and QR routes require `evidence:write`.
- EPCIS route requires `logistics:write`.
- The external client cannot claim platform roles directly.
- The route maps the signed external client to a supplier-scoped submission context and reuses the existing delivery evidence service.
- The existing delivery evidence service verifies that the order exists, is accepted, and belongs to the submitted supplier organization.
- Replay with the same idempotency key returns the original request id and does not create duplicate delivery evidence.

## Audit and Lifecycle Behavior

- IoT and QR proof intake emits `deliveryProofSubmitted`.
- EPCIS-compatible logistics intake emits `logisticsEventRecorded`.
- Delivery evidence records include safe references, notes, evidence hashes, lifecycle event ids, and blockchain anchor status metadata.
- Existing `deliveryEvidenceSubmitted` behavior remains unchanged for product UI supplier-submitted evidence.

## Blockchain Proof Behavior

- Raw IoT, QR, and EPCIS payloads are not written on-chain.
- Supplied `payloadHash` values must use `sha256:<64 hex>`.
- If `payloadHash` is omitted, the platform computes a SHA-256 hash from the received request body but stores only safe metadata in the delivery evidence record.
- Anchor failures remain explicit and do not delete delivery evidence.
- No transaction IDs or verified proof states are fabricated.

## Tests Added

- Valid signed IoT event creates delivery evidence and `deliveryProofSubmitted`.
- External QR proof replay does not create duplicate evidence.
- Invalid QR signature metadata is rejected.
- Valid EPCIS event creates warehouse receipt evidence and `logisticsEventRecorded`.
- External client without required scope is rejected.
- Unrelated supplier organization is rejected.

## Validation Commands and Results

An initial diagnostic run surfaced a TypeScript error in the shared external API route file; the route body cast was corrected before final validation. Final validation results:

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/integration/api/external-api.routes.test.ts` | Passed: 12 tests, 0 failures. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed; Vite production bundle built. |
| `npm test` | Passed: 729 tests, 0 failures. |
| `npm run db:migrate -- --dry-run` | Passed; 5 migration files validated. |
| `npm run db:seed -- --dry-run` | Passed; 9 demo accounts and demo procurement records validated. |
| `docker compose config` | Passed. |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed; no duplicate PBI IDs. |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed; no forbidden product-label matches. |
| `git diff --check` | Passed; only LF-to-CRLF working-copy notices were printed. |

## Known Limitations

- No production IoT hardware/device registry.
- No full QR public-key signature verification.
- No EPCIS capture/query repository.
- No carrier/logistics network integration.
- No document upload/rendering in this delivery proof route.
- No production Fabric consortium claim.
- No automatic escrow release based on external delivery proof.

## Backlog Status

- `PBI-443` marked `Completed` in `backlog/production-extension-roadmap.csv`.
- `PBI-444` marked `Completed` in `backlog/production-extension-roadmap.csv`.
- Canonical `backlog/backlog.csv` was not changed because these production-extension PBIs are tracked in the extension roadmap.
