CREATE TABLE IF NOT EXISTS erp_integration_jobs (
  job_id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('import', 'export')),
  profile_type TEXT NOT NULL CHECK (profile_type IN (
    'ublOrder',
    'ublInvoice',
    'ublDespatchAdvice',
    'paymentStatus',
    'journalEvent',
    'ocdsReleasePackage'
  )),
  source_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'rejected')),
  payload JSONB,
  mapping_errors JSONB NOT NULL CHECK (jsonb_typeof(mapping_errors) = 'array'),
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  claim_boundary TEXT NOT NULL CHECK (claim_boundary = 'localJsonAdapterOnlyNoProductionErpSync'),
  job_json JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_erp_integration_jobs_idempotency
  ON erp_integration_jobs(profile_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_erp_integration_jobs_profile_type
  ON erp_integration_jobs(profile_type);

CREATE INDEX IF NOT EXISTS idx_erp_integration_jobs_created_at
  ON erp_integration_jobs(created_at DESC);
