ALTER TABLE procure_to_pay_lifecycle_events
  DROP CONSTRAINT IF EXISTS procure_to_pay_lifecycle_events_lifecycle_stage_check;

ALTER TABLE procure_to_pay_lifecycle_events
  ADD CONSTRAINT procure_to_pay_lifecycle_events_lifecycle_stage_check
  CHECK (lifecycle_stage IN ('purchaseOrder', 'delivery', 'invoice', 'settlement', 'escrow'));

CREATE TABLE IF NOT EXISTS escrows (
  escrow_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  buyer_organization_id TEXT NOT NULL,
  supplier_organization_id TEXT NOT NULL,
  financier_organization_id TEXT,
  terms_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'accepted',
    'escrowCreated',
    'releasePending',
    'releaseReady',
    'released',
    'cancelled',
    'disputed'
  )),
  accepted_order_reference TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  lifecycle_event_id TEXT REFERENCES procure_to_pay_lifecycle_events(event_id),
  lifecycle_event_hash TEXT,
  blockchain_anchor_status TEXT CHECK (
    blockchain_anchor_status IN ('notAnchored', 'pending', 'anchored', 'failed')
  ),
  blockchain_network TEXT CHECK (blockchain_network IN ('fabric-local', 'fabric')),
  blockchain_transaction_id TEXT,
  blockchain_block_number TEXT,
  blockchain_channel_name TEXT,
  blockchain_chaincode_name TEXT,
  blockchain_anchored_at TIMESTAMPTZ,
  blockchain_failure_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrows_active_order
  ON escrows(order_id)
  WHERE status IN ('accepted', 'escrowCreated', 'releasePending', 'releaseReady', 'disputed');

CREATE INDEX IF NOT EXISTS idx_escrows_buyer_organization
  ON escrows(buyer_organization_id);

CREATE INDEX IF NOT EXISTS idx_escrows_lifecycle_event_id
  ON escrows(lifecycle_event_id);
