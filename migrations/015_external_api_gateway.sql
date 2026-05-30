CREATE TABLE IF NOT EXISTS external_client_credentials (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  scopes JSONB NOT NULL CHECK (jsonb_typeof(scopes) = 'array'),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_external_client_credentials_status
  ON external_client_credentials(status);

CREATE TABLE IF NOT EXISTS external_idempotency_records (
  client_id TEXT NOT NULL REFERENCES external_client_credentials(client_id),
  route TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (client_id, route, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_external_idempotency_records_created_at
  ON external_idempotency_records(created_at DESC);

CREATE TABLE IF NOT EXISTS external_api_audit_events (
  event_id TEXT PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  client_id TEXT,
  action TEXT NOT NULL,
  route TEXT NOT NULL,
  method TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'rejected')),
  reason TEXT,
  idempotency_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_external_api_audit_events_occurred_at
  ON external_api_audit_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_api_audit_events_client
  ON external_api_audit_events(client_id);

CREATE INDEX IF NOT EXISTS idx_external_api_audit_events_outcome
  ON external_api_audit_events(outcome);
