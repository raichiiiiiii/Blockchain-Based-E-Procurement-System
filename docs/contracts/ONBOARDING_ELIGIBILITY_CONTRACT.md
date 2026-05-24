# PBI-184 - Onboarding Eligibility Contract

Status: Approved contract baseline  
Parent Story: PBI-150 - Downstream onboarding eligibility  
Parent Feature: PBI-002 - KYC and AML onboarding workflow  
Branch: feature/PBI-002-kyc-aml-onboarding  
ReqID: R02

## Purpose

This contract defines the downstream onboarding eligibility seam for workflows that need a stable answer about whether a member organization may proceed after KYC/AML onboarding.

This is a documentation-only contract task. PBI-185 implements the retrieval service/API, PBI-186 hardens authorization and audit behavior, and PBI-187 validates and closes the story.

## Future endpoint

```text
GET /api/v1/kyc-aml-onboarding/eligibility/{memberOrganizationId}
```

The caller identity is server-derived from trusted actor context. The client must not provide reviewer identity, decision identity, or eligibility override fields.

## Eligibility states

| Eligibility state | Meaning | Default downstream behavior |
|---|---|---|
| `eligible` | A valid approved onboarding decision exists. | May proceed, subject to the workflow's own checks. |
| `flagged` | A flagged onboarding decision exists. | Must pause or escalate according to the workflow. |
| `blocked` | A blocked onboarding decision exists. | Must not proceed. |
| `notEligible` | A rejected onboarding decision exists. | Must not proceed. |
| `pendingReview` | An onboarding case exists but no decision has been recorded. | Must not proceed by default. |
| `unknown` | No onboarding case can be resolved. | Must not proceed by default. |

Downstream consumers must use the `eligibility` field instead of interpreting raw onboarding status labels independently.

## Mapping from onboarding status

| Onboarding status | Decision outcome | Eligibility state |
|---|---|---|
| `approved` | `pass` | `eligible` |
| `flagged` | `flag` | `flagged` |
| `blocked` | `block` | `blocked` |
| `rejected` | `fail` | `notEligible` |
| `submitted` | `null` | `pendingReview` |
| no case | `null` | `unknown` |

## Response shape

Approved organization:

```json
{
  "data": {
    "memberOrganizationId": "org_123",
    "eligibility": "eligible",
    "onboardingStatus": "approved",
    "decisionOutcome": "pass",
    "isFinal": true,
    "sourceCaseId": "kyc_aml_case_123",
    "checkedAt": "2026-03-15T02:00:00Z"
  }
}
```

Flagged organization:

```json
{
  "data": {
    "memberOrganizationId": "org_123",
    "eligibility": "flagged",
    "onboardingStatus": "flagged",
    "decisionOutcome": "flag",
    "isFinal": true,
    "sourceCaseId": "kyc_aml_case_123",
    "checkedAt": "2026-03-15T02:00:00Z",
    "reasonCodes": ["beneficial_ownership_unverified"],
    "rationale": "Requires compliance follow-up."
  }
}
```

Pending organization:

```json
{
  "data": {
    "memberOrganizationId": "org_123",
    "eligibility": "pendingReview",
    "onboardingStatus": "submitted",
    "decisionOutcome": null,
    "isFinal": false,
    "sourceCaseId": "kyc_aml_case_123",
    "checkedAt": "2026-03-15T02:00:00Z"
  }
}
```

Unknown organization:

```json
{
  "data": {
    "memberOrganizationId": "org_missing",
    "eligibility": "unknown",
    "onboardingStatus": null,
    "decisionOutcome": null,
    "isFinal": false,
    "sourceCaseId": null,
    "checkedAt": "2026-03-15T02:00:00Z"
  }
}
```

## Reason metadata

Reason metadata consists of:

```text
reasonCodes
rationale
```

Rules:

- `flagged`, `blocked`, and `notEligible` responses should preserve decision reason metadata for authorized readers.
- The response must not include raw KYC data, AML data, uploaded documents, or evidence payload content.
- If later privacy hardening masks rationale for some callers, the response must keep `eligibility`, `onboardingStatus`, `decisionOutcome`, and `reasonCodes` stable.

## Authorization semantics

Eligibility retrieval is protected.

Rules:

- Caller identity must come from trusted actor context.
- Authorized downstream workflow services, compliance users, banking users, and platform operators may retrieve eligibility according to implementation policy.
- Unauthorized callers receive `403 FORBIDDEN`.
- Missing actor context returns `400 VALIDATION_ERROR` unless a later shared authentication rule standardizes a different response.
- PBI-186 owns authorization and audit hardening.

## Negative-path behavior

| Scenario | Response behavior |
|---|---|
| Missing actor context | `400 VALIDATION_ERROR` |
| Unauthorized caller | `403 FORBIDDEN` |
| Malformed `memberOrganizationId` | `400 VALIDATION_ERROR` if route validation detects it |
| No onboarding case | `200 OK` with `eligibility = unknown` |
| Submitted case with no decision | `200 OK` with `eligibility = pendingReview` |
| Rejected case | `200 OK` with `eligibility = notEligible` |

`unknown` is intentionally returned as a successful eligibility answer because downstream workflows need deterministic check results even when onboarding has not started.

## Out of scope

- Implementing the eligibility API
- Embedding checks into every downstream workflow
- Dashboard UI behavior
- Reopen or remediation workflow
- Audit-event schema changes

## Acceptance criteria mapping

PBI-184 AC1 is covered because this contract defines eligible, flagged, blocked, pending, rejected/not-eligible, and unknown states with reason metadata rules.

PBI-184 AC2 is covered because this contract defines a stable downstream response field, `eligibility`, and maps onboarding statuses to downstream check semantics.

## Notes for PBI-185

PBI-185 should implement a service/API that resolves the latest relevant onboarding case for a member organization, maps it to this eligibility contract, preserves reason metadata where appropriate, and avoids returning raw KYC/AML/evidence content.
