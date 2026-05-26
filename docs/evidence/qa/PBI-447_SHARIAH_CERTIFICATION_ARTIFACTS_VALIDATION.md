# PBI-447 Shariah Certification Artifacts Validation

Date: 2026-05-26
Branch: feature/PBI-447-shariah-certification-artifacts
Commit inspected before change: 01b54ec
Readiness statement: supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## Scope

PBI-447 adds internal Shariah certificate artifact tracking for restricted PLS seedbed templates.

Implemented:

- Shariah certificate artifact domain model.
- Shariah certificate repository seam and in-memory adapter.
- certificate artifact registration, listing, retrieval, and revocation API routes.
- certificate hash generation.
- PLS activation gate requiring active certificate coverage when the certificate repository is wired.
- frontend Shariah Review certificate artifact registration/visibility.
- frontend Financing certificate coverage visibility and activation request wiring.
- contract documentation: `docs/contracts/SHARIAH_CERTIFICATION_ARTIFACT_CONTRACT.md`.

Not implemented:

- external Shariah board issuance automation.
- legal attestation or formal certification authority integration.
- production Islamic finance certification.
- KMS/HSM or legal signature validation for certificate documents.
- payment execution or guaranteed principal/profit behavior.

## API Routes Added

```text
GET /api/v1/shariah/certificates
POST /api/v1/shariah/certificates
GET /api/v1/shariah/certificates/:certificateId
POST /api/v1/shariah/certificates/:certificateId/revoke
```

Activation route extended:

```text
POST /api/v1/financing/pls-contracts/:contractId/activate
```

The activation body may include:

```json
{
  "shariahReviewId": "review-demo-approved",
  "shariahCertificateId": "shariah-certificate-mudarabah-v1"
}
```

## Authorization

- Shariah reviewers and administrators can register and revoke certificate artifacts.
- Shariah reviewers, financiers, auditors, regulators, and administrators can read certificate artifacts.
- Buyers and unrelated roles cannot register certificate artifacts.
- Financier PLS activation remains restricted to financier role.

## Certificate Coverage Behavior

PLS activation is blocked when certificate coverage is:

- missing.
- not found.
- revoked or otherwise inactive.
- expired.
- for another template version.

When activation succeeds, the PLS contract records the certificate id, status, hash, issued date, and expiry date.

## Frontend Behavior

Shariah Review:

- shows template version and certificate artifact coverage.
- can register a certificate artifact for the selected template.
- states that the artifact is internal governance evidence only.

Financing:

- shows the active certificate artifact reference.
- passes the matching certificate id during activation.
- blocks activation UI when no active certificate covers the template.

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/SHARIAH_CERTIFICATION_ARTIFACT_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/evidence/qa/PBI-447_SHARIAH_CERTIFICATION_ARTIFACTS_VALIDATION.md`
- `src/app/server.ts`
- `src/frontend/api/pls-financing.ts`
- `src/frontend/api/shariah-certificates.ts`
- `src/frontend/pages/FinancingDashboard.tsx`
- `src/frontend/pages/ShariahDashboard.tsx`
- `src/modules/financing/api/pls.routes.ts`
- `src/modules/financing/api/pls.routes.test.ts`
- `src/modules/financing/application/pls-contract-service.ts`
- `src/modules/financing/application/pls-contract-service.test.ts`
- `src/modules/financing/domain/pls-contract.ts`
- `src/modules/shariah-certification/api/shariah-certificate.routes.ts`
- `src/modules/shariah-certification/api/shariah-certificate.routes.test.ts`
- `src/modules/shariah-certification/application/shariah-certificate-repository.ts`
- `src/modules/shariah-certification/application/shariah-certificate-service.ts`
- `src/modules/shariah-certification/domain/shariah-certificate.ts`
- `src/modules/shariah-certification/infrastructure/in-memory-shariah-certificate-repository.ts`
- `src/modules/shariah-review/infrastructure/in-memory-shariah-review-repository.ts`

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/shariah-certification/api/shariah-certificate.routes.test.ts src/modules/financing/application/pls-contract-service.test.ts src/modules/financing/api/pls.routes.test.ts` | Passed, 16 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 755 tests |
| CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed, no duplicate PBI IDs |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed, no matches |
| `git diff --check` | Passed with existing LF/CRLF normalization warnings only |

Database migration/seed commands were not rerun for this phase because no database schema or seed data changed.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-447 `Completed` for internal certificate artifact tracking and activation gating.

Canonical `backlog/backlog.csv` was not changed because the production-extension PBI is tracked in `backlog/production-extension-roadmap.csv`.

## Known Limitations

- certificate artifacts are internal governance evidence, not external certification issuance.
- no legal attestation or formal Shariah board process is automated.
- no certificate document legal-signature validation.
- certificate persistence is in-memory unless a dedicated repository adapter is supplied.
- PLS remains a restricted seedbed and does not execute payment or guarantee return/principal.

## Recommended Next Slice

Proceed to PBI-449 ERP and accounting adapter framework only after review/merge, or continue to the next approved phase if this branch stack is being validated as a continuous run.
