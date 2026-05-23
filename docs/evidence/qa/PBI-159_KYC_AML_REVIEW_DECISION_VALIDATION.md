# PBI-159 - KYC/AML Review Decision Validation and Evidence Closure

Status: Completed validation evidence  
Parent Story: PBI-141 - KYC/AML review decision  
Parent Feature: PBI-002 - KYC and AML onboarding workflow  
Branch: feature/PBI-002-kyc-aml-onboarding  

## 1. Purpose

This evidence note closes the KYC/AML review decision story validation for PBI-141 after completion of:

- PBI-156 - KYC/AML review outcome codes, reason fields, and status-transition rules
- PBI-157 - KYC/AML review decision API and outcome persistence
- PBI-158 - Reviewer authorization, decision audit capture, and block/flag hardening

The purpose is to show that the review decision flow accepts valid outcomes (pass, fail, flag, block), rejects invalid decisions with the canonical validation envelope, records audit evidence, blocks unauthorized reviewers, and prevents invalid state transitions.

## 2. Implemented scope

The implemented KYC/AML review decision capability covers:

- `POST /api/v1/kyc-aml-onboarding-cases/{caseId}/decision`
- outcome validation (pass, fail, flag, block)
- rationale requirement for all outcomes
- reason code requirement for fail, flag, and block outcomes
- reason code validation against allowed values
- state transition from `submitted` to outcome-specific status
- actor attribution from trusted actor context
- success audit event capture
- forbidden audit event capture
- conflict audit event capture for invalid transitions
- not found audit event capture for missing cases

## 3. Out-of-scope behavior preserved

The following behavior remains intentionally out of scope for PBI-141/PBI-159:

- Onboarding status/history retrieval
- Downstream onboarding eligibility checks
- Dashboard UI
- Sanctions engine integration
- Full role-catalog authorization lookup

## 4. Validation commands executed

```bash
npm run build
```

Result:

```text
Passed
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

Targeted test suite:

```text
src/modules/kyc-aml-onboarding/api/routes.test.ts
```

Validated cases:

| Test case | Expected result | Evidence |
|---|---:|---|
| Record pass decision and update status to approved | `200 OK` | Passed |
| Record fail decision with reason codes and update status to rejected | `200 OK` | Passed |
| Record flag decision with reason codes and update status to flagged | `200 OK` | Passed |
| Record block decision with reason codes and update status to blocked | `200 OK` | Passed |
| Case does not exist | `404 NOT_FOUND` | Passed |
| Outcome is missing | `400 VALIDATION_ERROR` | Passed |
| Outcome is invalid | `400 VALIDATION_ERROR` | Passed |
| Rationale is missing | `400 VALIDATION_ERROR` | Passed |
| Rationale is blank | `400 VALIDATION_ERROR` | Passed |
| Fail outcome has no reason codes | `400 VALIDATION_ERROR` | Passed |
| Flag outcome has no reason codes | `400 VALIDATION_ERROR` | Passed |
| Block outcome has no reason codes | `400 VALIDATION_ERROR` | Passed |
| Reason code is invalid | `400 VALIDATION_ERROR` | Passed |
| Decision already recorded for case | `400 VALIDATION_ERROR` | Passed |
| Decision on non-submitted case | `400 VALIDATION_ERROR` | Passed |
| Client authored decidedByUserId ignored | `200 OK` | Passed |
| Missing actor context for decision | `400 VALIDATION_ERROR` | Passed |
| Unauthorized reviewer | `403 FORBIDDEN` | Passed |
| Case not mutated when reviewer unauthorized | `403 FORBIDDEN` + no mutation | Passed |
| Pass outcome without reason codes | `200 OK` | Passed |

## 6. Contract evidence

The decision contract is documented in:

```text
docs/contracts/API_CONTRACTS.md
```

The documented endpoint is:

```text
POST /api/v1/kyc-aml-onboarding-cases/{caseId}/decision
```

The outcome-to-status mapping is documented in:

```text
docs/architecture/STATE_MODELS.md
```

Mappings:

```text
pass -> approved
fail -> rejected
flag -> flagged
block -> blocked
```

## 7. Files changed for implementation

Implementation files:

```text
src/modules/kyc-aml-onboarding/domain/onboarding-case.ts
src/modules/kyc-aml-onboarding/application/record-onboarding-review-decision.ts
src/modules/kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.ts
src/modules/kyc-aml-onboarding/api/routes.ts
src/modules/kyc-aml-onboarding/api/routes.test.ts
src/modules/shared/application/access-audit-event.ts
```

Documentation files from PBI-156:

```text
docs/contracts/API_CONTRACTS.md
docs/architecture/STATE_MODELS.md
```

Evidence file:

```text
docs/evidence/qa/PBI-159_KYC_AML_REVIEW_DECISION_VALIDATION.md
```

## 8. Acceptance criteria mapping

### Acceptance criterion 1

Given the review decision tasks are complete, when validation is executed, then valid outcome, invalid transition, and blocked-path behavior match the approved rules.

Evidence:

- Valid outcomes (pass, fail, flag, block) return `200 OK` with correct status transitions.
- Invalid payloads return `400 VALIDATION_ERROR`.
- Unauthorized submission returns `403 FORBIDDEN`.
- Invalid state transitions return `400 VALIDATION_ERROR`.
- Missing cases return `404 NOT_FOUND`.
- Build and targeted tests passed.

### Acceptance criterion 2

Given the story is prepared for review, when evidence is attached, then test results, representative decision payloads, and documentation updates are available.

Evidence:

- API contract exists in `docs/contracts/API_CONTRACTS.md`.
- State transition semantics exist in `docs/architecture/STATE_MODELS.md`.
- Validation evidence is recorded in this file.
- Targeted route test suite passed with 30/30 tests.

## 9. Closure conclusion

PBI-141 is ready for story-level review after completion of PBI-156, PBI-157, PBI-158, and PBI-159.

PBI-002 remains in progress because later story slices are still pending:

- PBI-142 - onboarding status/history
- PBI-150 - downstream onboarding eligibility
