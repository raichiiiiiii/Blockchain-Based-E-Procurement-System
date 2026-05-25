CREATE TABLE IF NOT EXISTS access_audit_events (
  event_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL CHECK (schema_version = 'access-audit-event.v1'),
  occurred_at TIMESTAMPTZ NOT NULL,
  request_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_source TEXT NOT NULL CHECK (actor_source = 'actorContext'),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'forbidden', 'validationError', 'notFound', 'conflict', 'error')),
  reason TEXT,
  route TEXT,
  method TEXT,
  module TEXT NOT NULL CHECK (module IN ('membership', 'access-control', 'shariah-review', 'kyc-aml-onboarding')),
  evidence_payload_hash TEXT NOT NULL,
  evidence_canonicalization TEXT NOT NULL CHECK (evidence_canonicalization = 'json-stable-v1'),
  evidence_previous_event_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_events_occurred_at_event_id
  ON access_audit_events(occurred_at, event_id);

CREATE INDEX IF NOT EXISTS idx_access_audit_events_actor_user_id
  ON access_audit_events(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_access_audit_events_target
  ON access_audit_events(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_access_audit_events_payload_hash
  ON access_audit_events(evidence_payload_hash);

CREATE TABLE IF NOT EXISTS procure_to_pay_lifecycle_events (
  event_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL CHECK (schema_version = 'procure-to-pay-lifecycle-event.v1'),
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  request_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN ('purchaseOrder', 'delivery', 'invoice', 'settlement')),
  event_type TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_source TEXT NOT NULL CHECK (actor_source = 'actorContext'),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'rejected', 'voided', 'failed')),
  reason TEXT,
  payload_hash TEXT NOT NULL UNIQUE,
  canonicalization TEXT NOT NULL CHECK (canonicalization = 'json-stable-v1'),
  previous_event_hash TEXT,
  source_payload_ref TEXT,
  source_record_ref TEXT,
  anchor_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ptp_lifecycle_case_order
  ON procure_to_pay_lifecycle_events(case_id, occurred_at, event_id);

CREATE INDEX IF NOT EXISTS idx_ptp_lifecycle_correlation_id
  ON procure_to_pay_lifecycle_events(correlation_id);

CREATE INDEX IF NOT EXISTS idx_ptp_lifecycle_previous_event_hash
  ON procure_to_pay_lifecycle_events(previous_event_hash);
