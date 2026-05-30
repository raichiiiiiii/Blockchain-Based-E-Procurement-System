CREATE TABLE IF NOT EXISTS payment_instructions (
  payment_instruction_id TEXT PRIMARY KEY,
  escrow_id TEXT NOT NULL REFERENCES escrows(escrow_id),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  debtor_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  creditor_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'failed', 'settled', 'cancelled')),
  payment_reference TEXT NOT NULL,
  adapter_name TEXT NOT NULL CHECK (adapter_name IN ('manualSettlement', 'localSandbox')),
  adapter_reference TEXT,
  failure_reason TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  lifecycle_event_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_instructions_active_escrow
  ON payment_instructions(escrow_id)
  WHERE status IN ('pending', 'accepted', 'settled');

CREATE INDEX IF NOT EXISTS idx_payment_instructions_escrow
  ON payment_instructions(escrow_id);

CREATE INDEX IF NOT EXISTS idx_payment_instructions_status
  ON payment_instructions(status);

CREATE INDEX IF NOT EXISTS idx_payment_instructions_updated_at
  ON payment_instructions(updated_at DESC);
