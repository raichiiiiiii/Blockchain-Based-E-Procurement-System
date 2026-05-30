CREATE TABLE IF NOT EXISTS pls_contracts (
  contract_id TEXT PRIMARY KEY,
  procurement_reference TEXT NOT NULL,
  contract_template_version TEXT NOT NULL,
  buyer_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  supplier_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  financier_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  capital_amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  profit_share JSONB NOT NULL,
  loss_allocation TEXT NOT NULL CHECK (loss_allocation = 'capitalProviderBearsFinancialLossExceptMisconduct'),
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'pendingShariahReview',
      'approvedForActivation',
      'active',
      'activationBlocked'
    )
  ),
  shariah_approval JSONB,
  shariah_certificate JSONB,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pls_contracts_buyer_org
  ON pls_contracts(buyer_organization_id);

CREATE INDEX IF NOT EXISTS idx_pls_contracts_supplier_org
  ON pls_contracts(supplier_organization_id);

CREATE INDEX IF NOT EXISTS idx_pls_contracts_financier_org
  ON pls_contracts(financier_organization_id);

CREATE INDEX IF NOT EXISTS idx_pls_contracts_status
  ON pls_contracts(status);

CREATE INDEX IF NOT EXISTS idx_pls_contracts_updated_at
  ON pls_contracts(updated_at DESC);

CREATE TABLE IF NOT EXISTS pls_distribution_records (
  distribution_id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES pls_contracts(contract_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('profit', 'loss')),
  gross_result_amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  calculation_basis TEXT NOT NULL,
  allocations JSONB NOT NULL,
  created_by TEXT NOT NULL REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pls_distribution_records_contract
  ON pls_distribution_records(contract_id);

CREATE INDEX IF NOT EXISTS idx_pls_distribution_records_created_at
  ON pls_distribution_records(created_at DESC);
