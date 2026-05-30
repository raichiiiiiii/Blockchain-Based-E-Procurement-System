CREATE TABLE IF NOT EXISTS shariah_certificates (
  certificate_id TEXT PRIMARY KEY,
  issued_by TEXT NOT NULL,
  reviewer_board TEXT NOT NULL,
  fatwa_reference TEXT NOT NULL,
  scope TEXT NOT NULL,
  contract_template_version TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
  certificate_document_id TEXT,
  certificate_hash TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_shariah_certificates_status
  ON shariah_certificates(status);

CREATE INDEX IF NOT EXISTS idx_shariah_certificates_template
  ON shariah_certificates(contract_template_version);

CREATE INDEX IF NOT EXISTS idx_shariah_certificates_issued_at
  ON shariah_certificates(issued_at DESC);
