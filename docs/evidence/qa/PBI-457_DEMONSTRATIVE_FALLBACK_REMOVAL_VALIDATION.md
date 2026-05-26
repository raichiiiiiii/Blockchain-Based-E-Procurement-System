# PBI-457 Demonstrative Fallback Removal Validation

Date: 2026-05-26
Branch: feature/PBI-456-457-453-ui-runtime-hardening
Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

Removed silent local/demo fallback behavior from the deployable frontend path where backend data or APIs exist. Local fallback remains available only when explicitly enabled by an operator for an offline walkthrough.

## Configuration

- `VITE_ENABLE_LOCAL_DEMO_FALLBACK=false` by default.
- `VITE_ENABLE_GUIDED_DEMO=false` by default.
- `?demo=guided` does not activate guided mode unless `VITE_ENABLE_GUIDED_DEMO=true`.

## Behavior Validated

- Demo account sign-in tries backend seeded credentials first.
- Backend login failure no longer silently creates a local demo session unless `VITE_ENABLE_LOCAL_DEMO_FALLBACK=true`.
- Stored `localDemo` sessions are rejected when fallback is disabled.
- Procurement orders, delivery evidence, escrow, export bundles, and PLS local data paths are gated behind the explicit fallback flag.
- Blockchain proof verification sends backend session headers and returns an honest unavailable result instead of local-only verified/mismatch data when fallback is disabled.
- No fake Fabric transaction ID is generated in unavailable, pending, not found, or mismatch states.

## Files Updated

- `.env.example`
- `src/frontend/lib/runtime-config.ts`
- `src/frontend/lib/auth-client.ts`
- `src/frontend/lib/session-state.ts`
- `src/frontend/lib/blockchain-proof-client.ts`
- `src/frontend/lib/escrow-client.ts`
- `src/frontend/api/procurement-orders.ts`
- `src/frontend/api/delivery-evidence.ts`
- `src/frontend/api/export-bundles.ts`
- `src/frontend/api/pls-financing.ts`
- `src/frontend/App.tsx`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`

## Validation Results

| Command | Result |
|---|---|
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed. |
| `npm test` | Passed, 691 tests. |
| Browser smoke with fallback disabled | Passed. Backend-seeded account login worked for Administrator, Buyer, Supplier, Auditor, and Security Operator. |
| `git diff --check` | Passed. |

## Known Limitations

- Compliance case, Shariah, export, and PLS runtime persistence still include MVP in-memory limitations documented in the local runbook.
- This slice gates local fallback behavior; it does not implement production identity federation or external account provisioning.
