# PBI-323 Backend Blockchain Gateway And Proof API Validation

Date: 2026-05-25

## Scope

Implemented the backend blockchain anchoring gateway seam, in-memory proof adapter,
Fabric contract adapter boundary, anchor metadata repository adapter, proof API routes,
and optional procure-to-pay lifecycle anchoring.

## Files Added Or Updated

- `src/modules/blockchain/application/blockchain-anchor-gateway.ts`
- `src/modules/blockchain/application/blockchain-proof-service.ts`
- `src/modules/blockchain/application/anchor-procure-to-pay-lifecycle-event.ts`
- `src/modules/blockchain/infrastructure/in-memory-blockchain-anchor-gateway.ts`
- `src/modules/blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.ts`
- `src/modules/blockchain/infrastructure/fabric-blockchain-anchor-gateway.ts`
- `src/modules/blockchain/api/blockchain-anchor.routes.ts`
- `src/modules/blockchain/api/blockchain-anchor.routes.test.ts`
- `src/modules/blockchain/application/anchor-procure-to-pay-lifecycle-event.test.ts`
- `src/modules/blockchain/infrastructure/in-memory-blockchain-anchor-gateway.test.ts`
- `src/modules/procurement/application/record-procure-to-pay-lifecycle-event.ts`
- `src/modules/procurement/application/procure-to-pay-lifecycle-source-integration.ts`
- `src/app/server.ts`
- `docs/evidence/qa/PBI-323_BLOCKCHAIN_GATEWAY_VALIDATION.md`

## Implemented Behavior

- Added `BlockchainAnchorGateway` application port:
  - `anchorEvent`
  - `getAnchor`
  - `verifyEvent`
- Added in-memory gateway and metadata repository for fast tests.
- Added Fabric gateway adapter in infrastructure using an injected Fabric contract client seam.
- Added proof routes:
  - `GET /api/v1/blockchain/anchors/:eventId`
  - `POST /api/v1/blockchain/anchors/:eventId/verify`
- Restricted proof routes to authenticated actor context with `auditor` or `securityOperator`
  role.
- Added optional lifecycle anchoring after procure-to-pay event persistence.
- Hashes business case ids before anchoring as `caseIdHash`.
- Normalizes lifecycle payload hashes to `sha256:<64 hex>` for blockchain input.
- Keeps the business event persisted when anchoring fails and records failed proof metadata
  when possible.
- Verification uses the gateway, not PostgreSQL metadata alone; unavailable gateway state
  returns `verificationStatus: "unavailable"`.

## Boundary Checks

- Domain/application layers do not import PostgreSQL libraries.
- Domain/application/backend runtime layers do not import Fabric SDK packages.
- The Fabric adapter is in infrastructure and depends on an injected contract client seam.
- No raw KYC data, invoice payloads, escrow terms, payment credentials, personal data,
  or commercial document payloads are rendered or anchored by the backend proof API.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Passed. |
| `node --loader ts-node/esm --test src/modules/blockchain/**/*.test.ts` | Passed: 15 tests, 15 pass, 0 fail. |
| `npm test` | Passed: 619 tests, 619 pass, 0 fail. |
| `rg -n 'fabric-contract-api\|fabric-shim\|fabric-network\|fabric-gateway\|@hyperledger' src/modules src/app -g '*/domain/*.ts' -g '*/application/*.ts' -g 'src/app/*.ts'` | Passed: no matches. |
| `rg -n 'from [''\"'']pg[''\"'']\|require\\([''\"'']pg[''\"'']\\)' src/modules src/app -g '*/domain/*.ts' -g '*/application/*.ts' -g 'src/app/*.ts'` | Passed: no matches. |
| `rg -n 'rawInvoicePayload\|kyc\|paymentCredential\|escrowTerms\|commercialDocument' src/modules/blockchain` | Passed: no matches. |
| `git diff --check` | Passed. |

Note: An initial boundary scan command used a PowerShell-incompatible wildcard path and
failed before scanning; it was rerun with `rg` globs and passed.

## Known Limitations

- The Fabric adapter is wired through an injected contract client seam; creating a live
  Fabric Gateway client from certificates and connection profiles remains an environment
  composition task.
- No retry worker is implemented yet for failed or pending anchors.
- Transaction history read responses do not yet enrich events with child proof metadata;
  the dedicated proof API is available for proof lookup and verification.
