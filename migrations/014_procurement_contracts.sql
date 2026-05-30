CREATE TABLE IF NOT EXISTS procurement_contracts (
  contract_id TEXT PRIMARY KEY,
  contract_number TEXT NOT NULL,
  buyer_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  supplier_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  financier_organization_id TEXT REFERENCES member_organizations(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'negotiating', 'accepted', 'active')),
  version INTEGER NOT NULL CHECK (version >= 1),
  human_readable_document_id TEXT,
  terms_hash TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  contract_json JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_procurement_contracts_contract_number
  ON procurement_contracts(contract_number);

CREATE INDEX IF NOT EXISTS idx_procurement_contracts_buyer_org
  ON procurement_contracts(buyer_organization_id);

CREATE INDEX IF NOT EXISTS idx_procurement_contracts_supplier_org
  ON procurement_contracts(supplier_organization_id);

CREATE INDEX IF NOT EXISTS idx_procurement_contracts_financier_org
  ON procurement_contracts(financier_organization_id);

CREATE INDEX IF NOT EXISTS idx_procurement_contracts_status
  ON procurement_contracts(status);

CREATE INDEX IF NOT EXISTS idx_procurement_contracts_updated_at
  ON procurement_contracts(updated_at DESC);
