# PBI-187 - Onboarding Eligibility Validation and Evidence Closure

Status: Completed validation evidence  
Parent Story: PBI-150 - Downstream onboarding eligibility  
Parent Feature: PBI-002 - KYC and AML onboarding workflow  
Branch: feature/PBI-002-kyc-aml-onboarding  
ReqID: R02

## 1. Purpose

This evidence note closes the downstream onboarding eligibility story validation for PBI-150 after completion of:

- PBI-184 - Onboarding eligibility contract, reason metadata, and downstream check semantics
- PBI-185 - Onboarding eligibility retrieval service and API
- PBI-186 - Authorization, audit capture, and hardened negative-path behavior for eligibility checks

The purpose is to show that downstream consumers now have a stable executable eligibility seam for KYC/AML onboarding outcomes, with deterministic responses for approved, flagged, blocked, rejected, pending, and unknown organization states.

## 2. Implemented scope

The implemented onboarding eligibility capability covers:

- `GET /api/v1/kyc-aml-onboarding/eligibility/{memberOrganizationId}`
- eligibility-state mapping from persisted onboarding cases
- latest-case selection for organizations with more than one onboarding case
- unknown-state response when no onboarding case exists
- pending-review response when a case exists without a decision
- reason metadata preservation for flagged, blocked, and rejected decisions
- actor-context requirement
- authorization seam for eligibility retrieval
- forbidden response for unauthorized eligibility checks
- audit capture for successful eligibility checks
- audit capture for forbidden eligibility checks
- audit capture for missing actor context
- privacy-safe response shape excluding raw KYC, AML, and evidence-reference payload data

## 3. Eligibility state coverage

| Onboarding condition | Eligibility response | Validation status |
|---|---|---|
| approved decision | `eligible` | Passed |
| flagged decision | `flagged` | Passed |
| blocked decision | `blocked` | Passed |
| rejected decision | `notEligible` | Passed |
| submitted case without decision | `pendingReview` | Passed |
| no onboarding case | `unknown` | Passed |

## 4. Negative-path and hardening coverage

| Scenario | Expected behavior | Validation status |
|---|---|---|
| missing actor context | `400 VALIDATION_ERROR` | Passed |
| unauthorized eligibility check | `403 FORBIDDEN` | Passed |
| unauthorized request tries to read repository | read is not performed | Passed |
| flagged response | reason metadata retained; raw KYC/AML/evidence omitted | Passed |
| blocked response | reason metadata retained; raw KYC/AML/evidence omitted | Passed |
| notEligible response | reason metadata retained | Passed |
| successful check | audit event recorded with eligibility-specific reason | Passed |
| forbidden check | audit event recorded with forbidden outcome | Passed |
| missing actor context | audit event recorded with validation outcome | Passed |

## 5. Validation commands executed

The following manual verification commands were executed after PBI-186 and reported as passing:

```bash
npm run build
```

```bash
node --loader ts-node/esm --test src/modules/kyc-aml-onboarding/api/eligibility.routes.test.ts
```

```bash
node --loader ts-node/esm --test src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts
```

```bash
node --loader ts-node/esm --test src/modules/kyc-aml-onboarding/api/routes.test.ts
```

Result summary:

```text
Build passed.
Eligibility route tests passed.
Status-history route tests passed.
KYC/AML intake and review-decision route regression tests passed.
```

## 6. Contract evidence

Primary contract artifact:

```text
docs/contracts/ONBOARDING_ELIGIBILITY_CONTRACT.md
```

The contract defines:

- future endpoint path
- controlled eligibility states
- onboarding-status-to-eligibility mapping
- reason metadata rules
- authorization semantics
- negative-path behavior
- downstream default behavior

Related contract and state-model artifacts:

```text
docs/contracts/API_CONTRACTS.md
docs/architecture/STATE_MODELS.md
```

## 7. Implementation references

Core implementation files:

```text
src/modules/kyc-aml-onboarding/application/get-onboarding-eligibility.ts
src/modules/kyc-aml-onboarding/api/routes.ts
src/modules/kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.ts
src/modules/kyc-aml-onboarding/application/create-onboarding-case.ts
```

Test files:

```text
src/modules/kyc-aml-onboarding/api/eligibility.routes.test.ts
src/modules/kyc-aml-onboarding/api/status-history.routes.test.ts
src/modules/kyc-aml-onboarding/api/routes.test.ts
```

Audit reference:

```text
src/modules/shared/application/access-audit-event.ts
```

## 8. Acceptance criteria mapping

### Acceptance criterion 1

Given the eligibility tasks are complete, when validation is executed, then eligible, blocked, flagged, and negative-path behavior match the approved contract.

Evidence:

- `eligible`, `flagged`, `blocked`, `notEligible`, `pendingReview`, and `unknown` states are covered.
- Reason metadata is preserved for flagged, blocked, and rejected/notEligible cases.
- Missing actor context returns validation feedback.
- Unauthorized retrieval returns forbidden feedback.
- Unknown onboarding state returns a deterministic `unknown` eligibility response.
- Manual build and route tests passed.

### Acceptance criterion 2

Given the story is prepared for review, when evidence is attached, then test results, representative responses, and documentation updates are available.

Evidence:

- Contract evidence is available in `docs/contracts/ONBOARDING_ELIGIBILITY_CONTRACT.md`.
- Implementation references are listed in this evidence file.
- Test references are listed in this evidence file.
- Manual verification commands and results are recorded.

## 9. Closure conclusion

PBI-150 is ready for story-level review after completion of PBI-184, PBI-185, PBI-186, and PBI-187.

PBI-002 is ready for feature-level review from the KYC/AML onboarding workflow perspective, subject to final branch reconciliation with `main`, full regression verification, and product-owner acceptance.
