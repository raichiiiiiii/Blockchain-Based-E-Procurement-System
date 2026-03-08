# PBI-013 Schema Design
## Restricted single-venture mudarabah persistence model

## 1. Purpose

This document defines the MVP persistence model for PLS contracts required by R07 and governed by ADR-2026-001.

The design supports:
- one `rabb_al_mal`
- one `mudarib`
- one procurement reference
- one restricted single-venture mudarabah contract

## 2. MVP persistence strategy

The MVP uses a single primary table: `pls_contracts`.

This is chosen because:
- the contract structure is fixed by ADR-2026-001
- the project is timeboxed
- later normalization can be added after MVP if musharakah or multi-party variants are introduced

## 3. Field mapping from ADR-2026-001

### Required persisted fields
- `contract_id`
- `contract_type`
- `procurement_reference_id`
- `venture_description`
- `permitted_use_of_funds`
- `rabb_al_mal_party_id`
- `mudarib_party_id`
- `capital_amount`
- `currency`
- `profit_sharing_ratio_rabb_al_mal`
- `profit_sharing_ratio_mudarib`
- `approved_profit_definition`
- `deductible_cost_policy_version`
- `restrictions`
- `commingling_flag`
- `profit_calculation_basis`
- `loss_allocation_rule`
- `distribution_period_start`
- `distribution_period_end`
- `distribution_approval_status`
- `exception_flag`
- `review_status`
- `template_version`
- `template_hash`
- `created_at`
- `updated_at`

### Optional / nullable fields
- `evidence_bundle_id`
- `security_or_collateral_details`
- `reviewer`
- `review_date`
- `shariah_pronouncement_reference`

## 4. Important interpretation decisions

### No generic `profit_sharing_ratio` column
ADR-2026-001 mentions:
- `profit_sharing_ratio`
- `profit_sharing_ratio_rabb_al_mal`
- `profit_sharing_ratio_mudarib`

For MVP persistence, only the two explicit party ratios are stored.

Reason:
- avoids redundancy
- avoids consistency drift
- fully captures the actual ratio split

## 5. Enum strategy

### contract_type
- `RESTRICTED_SINGLE_VENTURE_MUDARABAH`

### review_status
- `DRAFT`
- `PENDING_REVIEW`
- `APPROVED_WITH_CONDITIONS`
- `APPROVED`
- `REJECTED`

### distribution_approval_status
- `NOT_REQUIRED`
- `PENDING`
- `APPROVED`
- `REJECTED`

### loss_allocation_rule
- `RABB_AL_MAL_BEARS_LOSS_UNLESS_MUDARIB_FAULT`

### profit_calculation_basis
- `REALIZED_PROFIT_LESS_APPROVED_DEDUCTIBLE_COSTS`

## 6. Core persistence rules

The persistence layer must reject records when:
1. `contract_id` is missing
2. `procurement_reference_id` is missing
3. `rabb_al_mal_party_id` is missing
4. `mudarib_party_id` is missing
5. `capital_amount` is missing or non-positive
6. `currency` is missing
7. either party ratio is missing
8. ratio total is not equal to `1.0000`
9. `distribution_period_start` is missing
10. `distribution_period_end` is missing
11. `distribution_period_end < distribution_period_start`
12. `review_status` is missing
13. `template_version` is missing
14. `template_hash` is missing

## 7. Notes on restrictions field

`restrictions` should be stored as JSON.

Suggested content:
- single procurement scope flag
- allowed use of funds
- duration restriction
- commingling allowance
- policy notes

This keeps MVP flexible without adding multiple child tables.

## 8. Non-goals for PBI-013

Deferred to later PBIs:
- prohibited guarantee workflow enforcement beyond basic persistence validation
- API/controller behavior
- profit/loss computation
- settlement-triggered actions
- audit trail emission