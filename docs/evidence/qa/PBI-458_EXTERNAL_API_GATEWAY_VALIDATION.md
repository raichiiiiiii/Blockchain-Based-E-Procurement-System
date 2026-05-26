# PBI-458 External API Gateway Validation

Date: 2026-05-26

Branch: `feature/PBI-458-external-api-gateway`

Commit inspected before change: `04d84c1aa1c9a933d1e6ec246425c42db689a27f`

## Scope

This phase adds the MVP integration boundary for signed external clients. It is a foundation for later IoT, logistics, ERP, payment callback, and external proof verification work. It does not implement production IoT/EPCIS intake, ERP sync, payment execution, or production bank certification.

## Files Changed

- `.env.example`
- `backlog/production-extension-roadmap.csv`
- `docs/contracts/EXTERNAL_API_GATEWAY_CONTRACT.md`
- `docs/evidence/qa/PBI-458_EXTERNAL_API_GATEWAY_VALIDATION.md`
- `src/app/server.ts`
- `src/modules/integration/api/external-api.routes.ts`
- `src/modules/integration/api/external-api.routes.test.ts`
- `src/modules/integration/application/authenticate-external-request.ts`
- `src/modules/integration/application/external-api-audit-repository.ts`
- `src/modules/integration/application/external-client-credential-repository.ts`
- `src/modules/integration/application/external-client-credential.ts`
- `src/modules/integration/application/external-idempotency-repository.ts`
- `src/modules/integration/application/external-request-signing.ts`
- `src/modules/integration/infrastructure/in-memory-external-api-audit-repository.ts`
- `src/modules/integration/infrastructure/in-memory-external-client-credential-repository.ts`
- `src/modules/integration/infrastructure/in-memory-external-idempotency-repository.ts`

## Implementation Summary

- Added external client credential model with client identity, scopes, status, and secret hash.
- Added HMAC SHA-256 request signing helper.
- Added timestamp freshness validation.
- Added idempotency repository and replay behavior.
- Added external API audit repository for accepted and rejected requests.
- Added `POST /api/v1/external/proof/verify` as the first scoped external gateway endpoint.
- Added route wiring through `createTestableServer`.
- Added `.env.example` placeholder for `EXTERNAL_API_SHARED_SECRET`.
- Added `docs/contracts/EXTERNAL_API_GATEWAY_CONTRACT.md`.

## Route Added

`POST /api/v1/external/proof/verify`

Required scope:

```text
proof:verify
```

Required headers:

- `x-client-id`
- `x-request-timestamp`
- `x-signature`
- `idempotency-key`

## Validation Results

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `node --loader ts-node/esm --test src/modules/integration/api/external-api.routes.test.ts` | Passed: 6 tests |
| `npm run frontend:build` | Passed |
| `npm test` | Passed: 711 tests |
| `npm run db:migrate -- --dry-run` | Passed: validated 5 migration files |
| `npm run db:seed -- --dry-run` | Passed: validated 9 demo accounts and seeded MVP records |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed: no duplicate PBI IDs |
| `git diff --check` | Passed with CRLF conversion warnings only |

## Security Behavior

- Missing authentication headers return `UNAUTHORIZED`.
- Unknown, revoked, or invalidly signed clients return `UNAUTHORIZED`.
- Valid clients without the required scope return `FORBIDDEN`.
- Missing gateway signing secret returns `UNAVAILABLE`.
- Invalid request bodies return `VALIDATION_ERROR`.
- Raw shared secrets are not returned in responses.
- Accepted and rejected requests are audited.
- Idempotency key replay returns the original request ID.

## Known Limitations

- Only the proof verification intake route is implemented in this phase.
- Rate limiting is documented as a placeholder, not enforced.
- Client credential and idempotency repositories are in-memory for this foundation.
- No IoT, QR, EPCIS, ERP, or payment callback endpoint is implemented yet.
- No production secret manager, KMS, or public-key client registry is implemented.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-458 as `Completed` with this evidence file referenced in the Notes field.
