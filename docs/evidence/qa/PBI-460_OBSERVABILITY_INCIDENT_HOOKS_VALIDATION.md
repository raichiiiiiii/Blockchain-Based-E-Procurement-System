# PBI-460 Observability And Incident Hooks Validation

Date: 2026-05-26

Branch: `feature/PBI-460-observability-incident-hooks`

Commit inspected before change: `3fed8c14a1164028a1b37d73f80f380ef27e4235`

## Scope

This phase adds internal pilot observability hooks for liveness, readiness, operational status, and incident visibility. It keeps the product readiness claim bounded: selected pilot-hardening features only, not production-ready or commercially certified.

## Files Changed

- `src/app/server.ts`
- `src/app/server.validation.test.ts`
- `src/modules/ops/application/runtime-readiness.ts`
- `src/modules/ops/application/operational-incident.ts`
- `src/modules/ops/application/operational-incident-repository.ts`
- `src/modules/ops/application/record-readiness-incidents.ts`
- `src/modules/ops/application/record-readiness-incidents.test.ts`
- `src/modules/ops/infrastructure/in-memory-operational-incident-repository.ts`
- `src/modules/ops/api/ops-status.routes.ts`
- `src/modules/ops/api/ops-status.routes.test.ts`
- `src/modules/security/application/security-alert-read-model.ts`
- `src/modules/security/api/security-alert.routes.ts`
- `src/modules/security/api/security-alert.routes.test.ts`
- `src/frontend/api/security-alerts.ts`
- `src/frontend/pages/SecurityDashboard.tsx`
- `docs/runbooks/observability-incident-hooks.md`
- `docs/runbooks/deployable-mvp.md`
- `backlog/production-extension-roadmap.csv`
- `docs/evidence/qa/PBI-460_OBSERVABILITY_INCIDENT_HOOKS_VALIDATION.md`

## Implementation Summary

- Hardened runtime readiness to include database mode, database reachability, Fabric adapter mode, payment adapter mode, and demo seed mode.
- Added an operational incident model with `incidentId`, `severity`, `source`, `message`, `status`, `occurredAt`, and `resolvedAt`.
- Added an in-memory operational incident repository as the Phase 3 storage foundation.
- Added readiness-derived incident recording for database and Fabric dependency degradation.
- Added protected `GET /api/v1/ops/status` for `securityOperator` and `administrator` sessions.
- Extended security alerts to include open `operationalIncident` alerts alongside denied actions and proof failures.
- Updated the Security Status dashboard to count and display operational alerts.
- Added a structured logging policy runbook with claim-safe logging guidance.

## Authorization Behavior

`GET /api/v1/ops/status` requires a valid backend bearer session.

Allowed:

- `securityOperator`
- `administrator`
- legacy `admin`

Denied:

- unauthenticated requests
- non-operator/non-administrator roles

The route is read-only and does not grant mutation capabilities.

## Incident Behavior

When readiness is degraded:

- database unreachable records a critical `database` incident
- Fabric unavailable records a warning `fabric` incident
- open incidents are returned by `/api/v1/ops/status`
- open incidents appear in `/api/v1/security/alerts` as `operationalIncident`

When dependencies recover, the in-memory incident repository can mark matching open incidents as resolved.

## Validation Results

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `node --loader ts-node/esm --test src/modules/ops/application/record-readiness-incidents.test.ts` | Passed: 2 tests |
| `node --loader ts-node/esm --test src/modules/ops/api/ops-status.routes.test.ts` | Passed: 4 tests |
| `node --loader ts-node/esm --test src/modules/security/api/security-alert.routes.test.ts` | Passed: 7 tests |
| `npm test` | Passed: 705 tests, 0 failures |
| `npm run db:migrate -- --dry-run` | Passed: validated 5 migration files |
| `npm run db:seed -- --dry-run` | Passed: validated 9 demo accounts and current MVP seed records |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed: no duplicate PBI IDs |
| `git diff --check` | Passed |

## Browser Smoke

Flow tested: `/login` -> credential sign-in as `security.demo` -> `/dashboard` Security Status.

Result: passed.

- `security.demo` / `demo-password` reached `/dashboard`.
- Security Status rendered.
- Operational Alerts rendered in the Security Status metrics.
- No product UI labels matching `PBI`, `Sprint`, `Backlog`, `Roadmap`, `User stories`, `implementation slice`, or `feature lane` were found in the sampled DOM.
- Browser console error/warning log was empty.

Screenshot capture was attempted through the in-app browser, but the browser screenshot command timed out. The DOM, URL, and console checks passed.

## Known Limitations

- Operational incidents use an in-memory repository in this phase; durable incident persistence remains future hardening.
- No production metrics backend, tracing backend, pager, SIEM, or notification integration is configured.
- No SLO/SLA calculation or escalation workflow is implemented.
- The payment adapter mode is reported, but no payment adapter is implemented in this phase.
- This phase does not claim production deployment readiness.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-460 as `Completed` with this evidence file referenced in the Notes field.
