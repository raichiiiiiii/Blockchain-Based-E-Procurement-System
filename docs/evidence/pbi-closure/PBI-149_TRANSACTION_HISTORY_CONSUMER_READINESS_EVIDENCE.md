# PBI-149 Transaction History Consumer Readiness Evidence

## Scope

PBI-149 validates downstream consumer readiness for the procure-to-pay transaction-history contract.

Feature: PBI-005  
Task: PBI-149  
ReqID: R05

## Purpose

The transaction-history contract is now implemented through the lifecycle write path and ordered retrieval API.

This note documents how downstream consumers must use the approved contract without redefining lifecycle fields, ordering semantics, completeness signaling, or error behavior.

## Completed Upstream Work

- PBI-145 — Defined the transaction-history contract and lifecycle event field semantics.
- PBI-143 — Closed immutable lifecycle event recording through PBI-164, PBI-165, PBI-166, and PBI-167.
- PBI-144 — Closed ordered transaction-history retrieval through PBI-168, PBI-169, PBI-170, and PBI-171.

## Implemented Consumer-Facing API

```text
GET /api/v1/procurement/transactions/:caseId/history
```

Supported query parameters:

```text
correlationId
```

The route is intended for authorized audit-style consumers and requires auditor access under the current implementation.

## Approved Response Shape

Consumers must treat the response as the canonical transaction-history shape:

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "correlationId": "corr-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "completeness_not_proven",
      "message": "Available events are returned, but the repository cannot prove the sequence is complete."
    },
    "items": []
  }
}
```

## Lifecycle Event Fields Consumers May Display

Consumers may display these lifecycle event fields:

- `eventId`
- `schemaVersion`
- `occurredAt`
- `recordedAt`
- `requestId`
- `correlationId`
- `caseId`
- `lifecycleStage`
- `eventType`
- `actorUserId`
- `actorSource`
- `targetType`
- `targetId`
- `outcome`
- `reason`
- `immutableReference`
- `metadata`

Consumers must not rename these fields in API-level interpretation, even if the UI chooses friendlier labels.

## Ordering Rules Consumers Must Preserve

Consumers must preserve the backend ordering semantics:

1. Primary order: `occurredAt` ascending
2. Secondary tie-breaker: `eventId` ascending
3. Direction: ascending

Consumers must not reorder the audit trail by display convenience, stage labels, insertion time, dashboard grouping, or local sorting unless the alternate order is clearly marked as a secondary display view.

Audit-facing views must default to the canonical ordering returned by the API.

## Completeness Signaling Rules

Consumers must preserve and display the `completeness` object in audit-facing views.

Approved status values:

- `complete`
- `partial`
- `unknown`
- `gapDetected`

Current implementation primarily returns:

- `unknown` with `reason = "no_events_recorded"` for empty histories
- `unknown` with `reason = "completeness_not_proven"` when events exist but completeness cannot be proven

Consumers must not treat `unknown`, `partial`, or `gapDetected` as complete.

Consumers must not hide completeness metadata in audit-facing, regulator-facing, or investigation-facing workflows.

## Empty Result Handling

An empty result is not an error.

Consumers must treat this as a successful retrieval with no currently recorded events:

```json
{
  "data": {
    "caseId": "ptp-case-123",
    "ordering": {
      "primary": "occurredAt",
      "secondary": "eventId",
      "direction": "ascending"
    },
    "completeness": {
      "status": "unknown",
      "reason": "no_events_recorded",
      "message": "No events have been recorded for this case"
    },
    "items": []
  }
}
```

Consumers may show an empty-state message, but must not convert this response into `NOT_FOUND`.

## Validation Error Handling

Validation failures use the standard API error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "issues": []
    }
  }
}
```

Consumers should display the error message and may surface `details.issues` when useful.

Consumers must not infer lifecycle state from validation errors.

## Forbidden Access Handling

Forbidden access uses:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User must have auditor role to query transaction history"
  }
}
```

Consumers must not show transaction-history data when a forbidden response is returned.

Consumers must not infer whether the requested case exists from a forbidden response.

## Downstream Consumer Guidance

### PBI-017 Dashboard Consumers

Dashboard consumers may link to transaction-history views or widgets, but must not redefine:

- lifecycle stages
- event types
- ordering semantics
- completeness semantics
- validation error envelope
- forbidden response behavior

Dashboard widgets must display `unknown`, `partial`, and `gapDetected` states distinctly from `complete`.

### Auditor / Security Investigation Consumers

Auditor-facing consumers must preserve:

- canonical ordering
- immutable reference data
- completeness metadata
- forbidden response behavior

Audit views should expose `payloadHash`, `canonicalization`, and `previousEventHash` where relevant for evidence review.

### Future Regulator Export Consumers

Future regulator/export tasks may package the data differently, but must preserve:

- original lifecycle event fields
- immutable reference evidence
- ordering metadata
- completeness metadata
- authorization result semantics

PBI-149 does not implement export packaging.

### Future Reporting Consumers

Reporting consumers may aggregate counts or stages, but must not use reporting summaries as a replacement for the canonical transaction-history response.

Reports must not imply lifecycle completeness when the source response reports `unknown`, `partial`, or `gapDetected`.

## Anti-Drift Rules

Downstream consumers must not:

- invent alternate lifecycle stage names
- invent alternate event ordering rules
- hide completeness metadata in audit-facing views
- treat empty history as an error
- treat `unknown` completeness as `complete`
- expose transaction-history data after `FORBIDDEN`
- replace the standard validation error envelope with route-specific errors
- reinterpret `eventId`, `requestId`, `correlationId`, or `caseId`

## Validation Evidence Reviewed

Reviewed upstream evidence:

- `docs/evidence/pbi-closure/PBI-167_PBI143_IMMUTABLE_LIFECYCLE_EVENT_CAPTURE_CLOSURE_EVIDENCE.md`
- `docs/evidence/pbi-closure/PBI-171_PBI144_TRANSACTION_HISTORY_RETRIEVAL_CLOSURE_EVIDENCE.md`
- `docs/evidence/audit/PBI-168_TRANSACTION_HISTORY_READ_MODEL_EVIDENCE.md`
- `docs/evidence/audit/PBI-169_TRANSACTION_HISTORY_API_EVIDENCE.md`
- `docs/evidence/audit/PBI-170_TRANSACTION_HISTORY_AUTHORIZATION_HARDENING_EVIDENCE.md`

## Validation Status

This task is documentation-only.

No runtime implementation was changed.

No runtime tests are required for this evidence-only task. Existing runtime validation is recorded in the upstream task evidence listed above.

## Closure Decision

PBI-149 is ready to close because:

- the transaction-history contract has been implemented through write-side and read-side tasks
- the API response shape is stable and documented
- ordering semantics are explicit
- completeness signaling expectations are explicit
- validation and forbidden response behavior are explicit
- downstream consumers have clear anti-drift guidance
