CREATE TABLE pls_contracts (
    id BIGSERIAL PRIMARY KEY,

    contract_id VARCHAR(100) NOT NULL UNIQUE,
    contract_type VARCHAR(100) NOT NULL,
    procurement_reference_id VARCHAR(100) NOT NULL,

    venture_description TEXT NOT NULL,
    permitted_use_of_funds TEXT NOT NULL,

    rabb_al_mal_party_id VARCHAR(100) NOT NULL,
    mudarib_party_id VARCHAR(100) NOT NULL,

    capital_amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,

    profit_sharing_ratio_rabb_al_mal NUMERIC(5,4) NOT NULL,
    profit_sharing_ratio_mudarib NUMERIC(5,4) NOT NULL,

    approved_profit_definition TEXT NOT NULL,
    deductible_cost_policy_version VARCHAR(50) NOT NULL,

    restrictions JSONB NOT NULL,
    commingling_flag BOOLEAN NOT NULL DEFAULT FALSE,

    profit_calculation_basis VARCHAR(100) NOT NULL,
    loss_allocation_rule VARCHAR(150) NOT NULL,

    distribution_period_start DATE NOT NULL,
    distribution_period_end DATE NOT NULL,

    evidence_bundle_id VARCHAR(100) NULL,
    distribution_approval_status VARCHAR(50) NOT NULL,
    exception_flag BOOLEAN NOT NULL DEFAULT FALSE,

    security_or_collateral_details TEXT NULL,

    reviewer VARCHAR(150) NULL,
    review_status VARCHAR(50) NOT NULL,
    review_date DATE NULL,
    shariah_pronouncement_reference VARCHAR(100) NULL,

    template_version VARCHAR(50) NOT NULL,
    template_hash VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pls_contract_type
        CHECK (contract_type IN ('RESTRICTED_SINGLE_VENTURE_MUDARABAH')),

    CONSTRAINT chk_pls_capital_amount_positive
        CHECK (capital_amount > 0),

    CONSTRAINT chk_pls_profit_ratio_rabb_range
        CHECK (profit_sharing_ratio_rabb_al_mal >= 0 AND profit_sharing_ratio_rabb_al_mal <= 1),

    CONSTRAINT chk_pls_profit_ratio_mudarib_range
        CHECK (profit_sharing_ratio_mudarib >= 0 AND profit_sharing_ratio_mudarib <= 1),

    CONSTRAINT chk_pls_profit_ratio_total
        CHECK ((profit_sharing_ratio_rabb_al_mal + profit_sharing_ratio_mudarib) = 1.0000),

    CONSTRAINT chk_pls_distribution_period
        CHECK (distribution_period_end >= distribution_period_start),

    CONSTRAINT chk_pls_review_status
        CHECK (review_status IN (
            'DRAFT',
            'PENDING_REVIEW',
            'APPROVED_WITH_CONDITIONS',
            'APPROVED',
            'REJECTED'
        )),

    CONSTRAINT chk_pls_distribution_approval_status
        CHECK (distribution_approval_status IN (
            'NOT_REQUIRED',
            'PENDING',
            'APPROVED',
            'REJECTED'
        )),

    CONSTRAINT chk_pls_loss_allocation_rule
        CHECK (loss_allocation_rule IN (
            'RABB_AL_MAL_BEARS_LOSS_UNLESS_MUDARIB_FAULT'
        )),

    CONSTRAINT chk_pls_profit_calculation_basis
        CHECK (profit_calculation_basis IN (
            'REALIZED_PROFIT_LESS_APPROVED_DEDUCTIBLE_COSTS'
        ))
);

CREATE INDEX idx_pls_contracts_procurement_reference_id
    ON pls_contracts (procurement_reference_id);

CREATE INDEX idx_pls_contracts_rabb_al_mal_party_id
    ON pls_contracts (rabb_al_mal_party_id);

CREATE INDEX idx_pls_contracts_mudarib_party_id
    ON pls_contracts (mudarib_party_id);

CREATE INDEX idx_pls_contracts_review_status
    ON pls_contracts (review_status);