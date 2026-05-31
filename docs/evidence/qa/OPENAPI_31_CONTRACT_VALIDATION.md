# OpenAPI 3.1 Contract Validation

Date: 2026-06-01
Branch: `feature/PBI-485-496-productivity-api-auth-hardening`

## Scope

Validates PBI-491 and PBI-492 from GitHub Issue #24.

## Files Added

- `docs/contracts/openapi/openapi.yaml`
- `docs/contracts/openapi/README.md`
- `docs/contracts/openapi/postman_collection.json`
- `scripts/validate-openapi.mjs`

## Coverage

The OpenAPI 3.1 contract includes core:

- auth and provider readiness endpoints
- organization profile/dashboard/user endpoints
- organization graph and channel matrix endpoints
- company ledger and Mudarabah projection endpoints
- productivity, saved views, notifications, and company ledger export endpoints
- blockchain anchor lookup and verification endpoints

The contract declares:

- standard error envelope
- opaque bearer session security scheme
- OAuth2 authorization-code readiness scheme
- operation IDs for every route

## Validation

- `npm run openapi:validate` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/contracts/openapi/postman_collection.json','utf8')); console.log('Postman collection JSON parse passed')"` passed.

## Known Limitations

- OpenAPI validation is structural and intentionally lightweight.
- OAuth2/OIDC in the contract is a readiness boundary only; no production external identity provider is configured.
