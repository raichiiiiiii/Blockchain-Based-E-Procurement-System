# PBI-463 to PBI-472 Organization Network Validation

Date: 2026-05-31
Branch: `codex/issue-14-organization-network-workspace`
Related issue: GitHub Issue #14

## Scope

This evidence covers the organization profile, registration, network request,
relationship graph, blockchain trail panel, establish-network panel, local
email outbox, and ERPNext/Frappe procurement UX study slice.

Safe readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening and production-like Fabric lab validation; not commercial-ready or production-certified.
```

## PBIs Addressed

- PBI-463 Organization profile and unique identifier
- PBI-464 Organization registration and admin bootstrap
- PBI-465 Organization-scoped role and credential management
- PBI-466 Organization network relationship requests
- PBI-467 Network graph workspace with node and edge visualization
- PBI-468 Channel and visibility indicators on graph vectors
- PBI-469 Blockchain trail floating panel
- PBI-470 Establish-network and start-trade floating panel
- PBI-471 Email notification outbox and local adapter
- PBI-472 ERPNext and Frappe procurement UX study and mapping

## Files Changed

- `backlog/backlog.csv`
- `docs/analysis/ERPNext_FRAPPE_PROCUREMENT_UX_STUDY.md`
- `docs/contracts/ORGANIZATION_NETWORK_CONTRACT.md`
- `docs/contracts/EMAIL_NOTIFICATION_OUTBOX_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `migrations/018_organization_network_email_outbox.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/organization-network/**`
- `src/frontend/App.tsx`
- `src/frontend/api/organization-network.ts`
- `src/frontend/components/layout/AppLayout.tsx`
- `src/frontend/types/organization-network.ts`
- `src/frontend/pages/OrganizationNetworkPage.tsx`
- `src/frontend/lib/dashboard-state-resolver.ts`
- `src/frontend/lib/role-navigation.ts`
- `src/frontend/pages/RoleDashboard.tsx`
- `src/frontend/styles/components.css`
- `src/frontend/styles/responsive.css`

## Implementation Summary

- Added safe organization profile metadata: alias, unique identifier, logo
  reference, business category, public summary, status, and eligibility state.
- Added public organization registration that creates an organization record,
  primary admin user, credential, organization membership, organization admin
  role assignment, and pending KYC/AML case.
- Added network relationship request APIs with accept/reject transitions.
- Added PostgreSQL and in-memory repositories for organization network records.
- Added graph projection and selected-edge proof trail endpoint.
- Added local email outbox records for network request sent/accepted/rejected
  events.
- Added Organization Network workspace with left Blockchain Trail panel, central
  graph, and right Establish Network/Email Outbox panel.
- Added seeded Amanah, Barakah, and Mabrur relationship graph records.

## Graph Library Decision

No external graph dependency was added. The Issue #14 graph needs are a compact
relationship visualization with deterministic local layout, proof-scope edge
indicators, and selected-node/edge panels. A custom SVG graph keeps dependency
risk low and avoids introducing a heavy canvas/graph package before the graph
interaction model stabilizes. A future richer graph editor can still adopt
`@xyflow/react` behind the same API contract.

## Security and Data Boundary

- Protected network routes use bearer session context.
- Organization registration returns no raw password.
- Search and graph responses expose safe organization metadata only.
- Network graph proof trail contains hashes, statuses, and relationship metadata
  only.
- No raw KYC data, payment credentials, private documents, commercial terms, or
  raw evidence payloads are returned or put on-chain.
- Email notification bodies are safe summaries only and are local outbox records,
  not production SMTP delivery.

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/organization-network/api/organization-network.routes.test.ts` | Passed; 3 tests. |
| `npm run build` | Passed. |
| `npm run frontend:build` | Passed; Vite built 88 modules. |
| `npm test` | Passed; 829 tests, 72 suites, 0 failures. |
| `npm run db:migrate -- --dry-run` | Passed; 18 migration files validated, including `018_organization_network_email_outbox.sql`. |
| `npm run db:seed -- --dry-run` | Passed; validated 9 demo accounts and organization network graph records. |
| `DB_MIGRATIONS_ENABLED=true DATABASE_URL=postgres://... npm run db:migrate` | Passed against local Docker PostgreSQL; applied `018_organization_network_email_outbox.sql` after skipping previously applied migrations. |
| `DEMO_SEED_ENABLED=true DATABASE_URL=postgres://... npm run db:seed` | Passed against local Docker PostgreSQL; seeded 9 demo accounts and demo procurement records. |
| `docker compose config` | Passed. |
| `docker compose -f docker-compose.app.yml config` | Passed. |
| Backlog CSV validation | Passed; 472 rows, no duplicate IDs, PBI-463 through PBI-472 present and `Completed`. |
| `rg -n "PBI-\|Sprint\|Backlog\|Roadmap\|implementation slice\|feature lane" src/frontend` | Passed; no product-source matches. |
| Browser smoke on temporary local stack (`backend :3114`, `frontend :5176`) | Passed; `buyer.demo` credential login reached dashboard, Organization Network navigation rendered, and the workspace showed relationship graph, Blockchain Trail, Email Outbox, and no forbidden product labels. |
| `git diff --check` | Passed; line-ending warnings only. |

## Known Limitations

- Organization Network uses safe proof-scope aliases and does not claim
  production Fabric channel membership.
- Organization registration creates a pending KYC/AML case; it does not make the
  organization transaction-eligible.
- Local email outbox does not send SMTP.
- The graph is intentionally a compact SVG projection, not a full graph editor.
- ERPNext/Frappe remain references only and are not runtime dependencies.
