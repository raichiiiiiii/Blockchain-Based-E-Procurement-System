# PBI-163 - Onboarding Status-History Validation and Evidence Closure

Status: Completed validation evidence  
Parent Story: PBI-142 - Onboarding status/history retrieval  
Parent Feature: PBI-002 - KYC and AML onboarding workflow  
Branch: feature/PBI-002-kyc-aml-onboarding  

## 1. Purpose

This evidence note closes the onboarding status/history retrieval story validation for PBI-142 after completion of:

- PBI-160 - Onboarding status-history read contract and authorized retrieval semantics
- PBI-161 - Onboarding status-history read model and API
- PBI-162 - Authorization checks, history ordering, and privacy hardening for onboarding status retrieval

The purpose is to show that the status/history retrieval flow returns the approved read model, handles intermediate and final onboarding states, protects retrieval through actor-context and authorization checks, preserves chronological ordering, avoids raw KYC/AML evidence exposure, and returns the expected negative-path responses.

## 2. Implemented scope

The implemented onboarding status/history retrieval capability covers:

- `GET /api/v1/kyc-aml-onboarding-cases/{caseId}/status-history`
- submitted/intermediate case retrieval
- approved, rejected, flagged, and blocked final-state retrieval
- current status derivation from the persisted onboarding case
- finality derivation through `isFinal`
- chronological history ordering
- `caseSubmitted` history entry generation
- `decisionRecorded` history entry generation when a review decision exists
- missing actor-context validation
- unauthorized retrieval blocking
- missing-case not-found behavior
- privacy-safe response shape that excludes raw `kyc`, `aml`, and `evidenceReferences`

## 3. Out-of-scope behavior preserved

The following behavior remains intentionally out of scope for PBI-142/PBI-163:

- Dashboard or widget implementation
- Downstream onboarding eligibility enforcement
- Reopen, remediation, expiry, or appeal workflow
- Sanctions engine integration
- Feature-level PBI-002 closure

## 4. Validation commands executed

```bash
npm run build
```

Result:

```text
Passed
```

```bash
node --loader ts-node/esm --test src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts
```

Result:

```text
tests 10
suites 1
pass 10
fail 0
cancelled 0
skipped 0
todo 0
```

```bash
node --loader ts-node/esm --test src/modules/kyc-aml-onboarding/api/routes.test.ts
```

Result:

```text
tests 30
suites 2
pass 30
fail 0
cancelled 0
skipped 0
todo 0
```

## 5. Test evidence summary

Targeted status-history test suite:

```text
src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts
```

Validated cases:

| Test case | Expected result | Evidence |
|---|---:|---|
| Submitted case returns status/history | `200 OK` | Passed |
| Flagged case returns final history with decision metadata | `200 OK` | Passed |
| Approved case returns final history with pass outcome | `200 OK` | Passed |
| Rejected case returns final history with fail outcome | `200 OK` | Passed |
| Blocked case returns final history with block outcome | `200 OK` | Passed |
| Missing case | `404 NOT_FOUND` | Passed |
| Missing actor context | `400 VALIDATION_ERROR` | Passed |
| Unauthorized retrieval | `403 FORBIDDEN` | Passed |
| Unauthorized retrieval does not call repository | `403 FORBIDDEN` and no read | Passed |
| History entries are chronologically ordered | oldest to newest | Passed |

Regression suite:

```text
src/modules/kyc-aml-onboarding/api/routes.test.ts
```

Regression result:

```text
30 tests passed, 0 failed
```

## 6. Contract evidence

The status/history read contract is documented in:

```text
docs/contracts/API_CONTRACTS.md
```

The documented endpoint is:

```text
GET /api/v1/kyc-aml-onboarding-cases/{caseId}/status-history
```

The status/history state model is documented in:

```text
docs/architecture/STATE_MODELS.md
```

Expected current status values:

```text
submitted
approved
rejected
flagged
blocked
```

Expected history event types:

```text
caseSubmitted
decisionRecorded
```

## 7. Files changed for implementation

Implementation files:

```text
src/modules/kyc-aml-onboarding/application/get-onboarding-status-history.ts
src/modules/kyc-aml-onboarding/api/routes.ts
src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts
```

Related existing KYC/AML module files:

```text
src/modules/kyc-aml-onboarding/domain/onboarding-case.ts
src/modules/kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.ts
```

Documentation files from PBI-160:

```text
docs/contracts/API_CONTRACTS.md
docs/architecture/STATE_MODELS.md
```

Evidence file:

```text
docs/evidence/qa/PBI-163_ONBOARDING_STATUS_HISTORY_VALIDATION.md
```

## 8. Acceptance criteria mapping

### Acceptance criterion 1

Given the status/history tasks are complete, when validation is executed, then authorized retrieval, intermediate-state behavior, and negative paths match the approved contract.

Evidence:

- Submitted cases return `200 OK` with `currentStatus = submitted`, `isFinal = false`, and a single `caseSubmitted` event.
- Final-state cases return `200 OK` with `isFinal = true` and `caseSubmitted` followed by `decisionRecorded`.
- Missing cases return `404 NOT_FOUND`.
- Missing actor context returns `400 VALIDATION_ERROR`.
- Unauthorized retrieval returns `403 FORBIDDEN` and does not read the repository.
- History ordering is oldest to newest.
- Build and targeted tests passed.

### Acceptance criterion 2

Given the story is prepared for review, when evidence is attached, then representative responses, test results, and documentation updates are available.

Evidence:

- API contract exists in `docs/contracts/API_CONTRACTS.md`.
- State/history semantics exist in `docs/architecture/STATE_MODELS.md`.
- Validation evidence is recorded in this file.
- Targeted status-history suite passed with 10/10 tests.
- KYC/AML route regression suite passed with 30/30 tests.

## 9. Closure conclusion

PBI-142 is ready for story-level review after completion of PBI-160, PBI-161, PBI-162, and PBI-163.

PBI-002 remains in progress because the downstream onboarding eligibility story is still pending:

- PBI-150 - downstream onboarding eligibility
