CREATE TABLE IF NOT EXISTS export_bundles (
  bundle_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('generated', 'partial', 'failed')),
  scope TEXT NOT NULL CHECK (scope IN ('accessHistory', 'procureToPay', 'combinedAudit')),
  purpose TEXT NOT NULL,
  requested_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  requested_at TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  failure_reason TEXT,
  manifest JSONB NOT NULL,
  integrity JSONB NOT NULL,
  signature JSONB,
  download JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_export_bundles_requested_by
  ON export_bundles(requested_by_user_id);

CREATE INDEX IF NOT EXISTS idx_export_bundles_scope
  ON export_bundles(scope);

CREATE INDEX IF NOT EXISTS idx_export_bundles_requested_at
  ON export_bundles(requested_at ASC);
