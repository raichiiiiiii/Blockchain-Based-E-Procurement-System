# OpenAPI Contract

Status: MVP/pilot-hardening API contract baseline for Issue #24.

The canonical machine-readable API contract for current product APIs is:

- `docs/contracts/openapi/openapi.yaml`

Validation:

```bash
npm run openapi:validate
```

The validator is intentionally lightweight. It parses the OpenAPI 3.1 document with the repository's existing `yaml` dependency, confirms required security schemes, and checks that every operation has an `operationId`.

## Boundary

The OAuth2/OIDC scheme in this contract is a readiness boundary. Current runtime sessions remain opaque bearer sessions issued by local credential login. The contract must not be read as a certified external identity provider, JWKS, production SSO, payment, ERP, or Fabric consortium claim.
