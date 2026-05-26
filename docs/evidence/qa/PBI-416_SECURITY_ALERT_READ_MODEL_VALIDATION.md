# PBI-416 Security Alert Read Model Validation

Date: 2026-05-26
Branch: main
Scope: Backend-backed security alert read model for denied actions and blockchain proof failures

## Readiness Statement

Supervisor demo ready, not pilot-ready or commercial-ready.

This implementation does not add security mutation privileges, production monitoring infrastructure, SIEM integration, production Fabric operations, or payment/ERP integrations.

## Files Changed

- `backlog/backlog.csv`
- `docs/contracts/API_CONTRACTS.md`
- `docs/evidence/qa/PBI-416_SECURITY_ALERT_READ_MODEL_VALIDATION.md`
- `src/app/server.ts`
- `src/frontend/api/security-alerts.ts`
- `src/frontend/pages/SecurityDashboard.tsx`
- `src/modules/security/application/security-alert-read-model.ts`
- `src/modules/security/api/security-alert.routes.ts`
- `src/modules/security/api/security-alert.routes.test.ts`

## API Route Added

- `GET /api/v1/security/alerts`

Response uses the standard success envelope:

```json
{
  "data": {
    "generatedAt": "2026-05-26T00:00:00.000Z",
    "items": []
  }
}
```

## Authorization Behavior

- `securityOperator`: allowed, read-only.
- `administrator`: allowed, read-only.
- `buyer`, `supplier`, `complianceReviewer`, `financier`: denied with `403 FORBIDDEN`.
- Anonymous request: denied with `401 UNAUTHORIZED`.
- The route uses the authenticated request pre-handler and server-derived session actor context.

## Alert Sources

- Denied action alerts are projected from persisted shared access audit events where `outcome = forbidden`.
- Proof failure alerts are projected from blockchain anchor metadata where `anchorStatus = failed`.
- The read model does not fabricate proof transaction IDs, verified states, or private payloads.
- Pending, unavailable, missing, and mismatch proof semantics remain distinct from verified proof.

## Frontend Behavior

- Security Status, Access Alerts, Proof Failures, and Denied Actions consume the backend route for backend-authenticated sessions.
- Local demo sessions no longer receive fabricated local alert records.
- Security operator screens remain read-only and do not expose administrator, compliance, finance, KYC, payment, or raw commercial document data.

## Backlog Status

- `PBI-416`: Planned -> Completed

## Validation Commands and Results

```powershell
node --loader ts-node/esm --test src/modules/security/api/security-alert.routes.test.ts
npm run build
npm run frontend:build
npm test
python CSV validation script for backlog/backlog.csv
git diff --check
```

Results:

```text
Targeted security alert tests: passed, 6 tests.
npm run build: passed.
npm run frontend:build: passed.
npm test: passed, 683 tests, 0 failures.
CSV validation: passed, rows = 435, PBI-416 Completed, no duplicate IDs, no invalid IDs, status values allowed.
git diff --check: passed.
```

## Known Limitations

- This is an MVP read model, not a production SIEM or incident-management system.
- Access alerts depend on persisted shared access audit events being available.
- Proof failure alerts depend on stored blockchain anchor metadata.
- Verification mismatch and unavailable proof attempts are not persisted as separate security alert events unless a future proof-attempt log is added.
- No raw documents, KYC/AML payloads, payment credentials, or raw delivery evidence are exposed.
