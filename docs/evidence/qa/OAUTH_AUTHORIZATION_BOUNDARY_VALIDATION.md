# OAuth Authorization Boundary Validation

Date: 2026-06-01
Branch: `feature/PBI-485-496-productivity-api-auth-hardening`

## Scope

Validates PBI-493 and PBI-494 from GitHub Issue #24.

## Implementation

Added:

- `AuthProvider` abstraction
- `LocalPasswordAuthProvider`
- `ExternalOidcAuthProvider`
- `GET /api/v1/auth/providers`
- `POST /api/v1/auth/oidc/callback`
- role-to-scope readiness map
- `docs/contracts/AUTH_SESSION_CONTRACT.md` OAuth/OIDC readiness section

## Results

- `localPassword` is available.
- `externalOidc` is explicit `notConfigured`.
- `/api/v1/auth/oidc/callback` returns an honest `EXTERNAL_SERVICE_ERROR` envelope.
- Local password login still derives actor role codes from repository membership/role assignment lookup.
- Client-authored role payloads do not override server-derived actor roles.

## Validation

- `node --test --loader ts-node/esm src/modules/auth/api/auth.routes.test.ts` passed.
- `npm run build` passed.

## Known Limitations

- No external IdP, JWKS, JWT validation, SSO callback, MFA, SCIM, or production OAuth deployment exists in this slice.
- Runtime sessions remain opaque bearer sessions.
