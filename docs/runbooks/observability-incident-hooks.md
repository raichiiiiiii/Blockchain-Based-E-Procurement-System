# Observability And Incident Hooks Runbook

Date: 2026-05-26

Readiness statement: These hooks support internal pilot hardening. They are not a production SIEM, paging service, SLA platform, or managed observability stack.

## Purpose

This runbook documents the MVP observability baseline for operators and security reviewers. It covers liveness, readiness, operational incident hooks, and structured logging expectations.

## Health And Readiness

Public runtime checks:

```text
GET /health
GET /ready
```

Protected operational status:

```text
GET /api/v1/ops/status
```

`/api/v1/ops/status` requires a backend-authenticated session with the `securityOperator` or `administrator` role. It returns:

- generated timestamp
- runtime readiness result
- database mode and reachability
- Fabric adapter mode
- payment adapter mode
- demo seed mode
- open operational incidents

## Incident Model

Operational incidents use this minimum shape:

```json
{
  "incidentId": "ops-incident-database-postgres",
  "severity": "critical",
  "source": "database",
  "message": "Database readiness check failed for postgres mode.",
  "status": "open",
  "occurredAt": "2026-05-26T00:00:00.000Z",
  "resolvedAt": null
}
```

Supported MVP severities:

- `info`
- `warning`
- `critical`

Supported MVP statuses:

- `open`
- `resolved`

The current implementation records readiness-derived database and Fabric incidents. The incident repository is in-memory for this phase; durable incident persistence is a future hardening item unless a later phase adds a database-backed repository.

## Security Alert Integration

Open operational incidents appear in the backend security alert read model as `operationalIncident` alerts. They are visible to security operators and administrators alongside denied-action and proof-failure alerts.

## Structured Logging Policy

Runtime logs should be structured as single-event records with these fields whenever practical:

- `timestamp`
- `level`
- `source`
- `eventType`
- `requestId`
- `actorUserId` when available
- `actorOrganizationId` when available
- `route` when applicable
- `method` when applicable
- `outcome`
- `reason` when applicable
- `message`

Do not log raw KYC data, commercial documents, payment credentials, delivery document contents, private blockchain payloads, or raw secrets.

## Operator Checks

1. Check `/health` for process liveness.
2. Check `/ready` for dependency readiness.
3. Sign in as `security.demo` or `admin.demo`.
4. Open Security Status and confirm denied actions, proof failures, and operational alerts are visible when backend records exist.
5. Call `/api/v1/ops/status` with a bearer session to inspect readiness and open incidents.

## Known Limitations

- No production metrics backend is configured.
- No pager or notification integration is configured.
- Operational incidents are not yet PostgreSQL-backed.
- No SLO/SLA breach calculations are implemented.
- This does not replace an incident response process or postmortem workflow.
