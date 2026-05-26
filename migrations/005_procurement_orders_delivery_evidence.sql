CREATE TABLE IF NOT EXISTS procurement_orders (
  order_id TEXT PRIMARY KEY,
  buyer_organization_id TEXT NOT NULL,
  supplier_organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'accepted', 'rejected')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  accepted_by TEXT,
  accepted_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  lifecycle_event_ids TEXT[] NOT NULL DEFAULT '{}',
  latest_lifecycle_payload_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_procurement_orders_buyer
  ON procurement_orders(buyer_organization_id, updated_at DESC, order_id);

CREATE INDEX IF NOT EXISTS idx_procurement_orders_supplier
  ON procurement_orders(supplier_organization_id, updated_at DESC, order_id);

CREATE INDEX IF NOT EXISTS idx_procurement_orders_status
  ON procurement_orders(status);

CREATE TABLE IF NOT EXISTS delivery_evidence (
  evidence_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES procurement_orders(order_id),
  buyer_organization_id TEXT NOT NULL,
  supplier_organization_id TEXT NOT NULL,
  submitted_by_user_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN ('deliveryNote', 'courierReceipt', 'warehouseReceipt', 'inspectionRecord', 'other')
  ),
  evidence_reference TEXT,
  evidence_hash TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('metadataRecorded')),
  lifecycle_event_id TEXT REFERENCES procure_to_pay_lifecycle_events(event_id),
  lifecycle_event_hash TEXT,
  blockchain_event_id TEXT,
  blockchain_payload_hash TEXT,
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

CREATE INDEX IF NOT EXISTS idx_delivery_evidence_order
  ON delivery_evidence(order_id, submitted_at, evidence_id);

CREATE INDEX IF NOT EXISTS idx_delivery_evidence_supplier
  ON delivery_evidence(supplier_organization_id, submitted_at DESC, evidence_id);

CREATE INDEX IF NOT EXISTS idx_delivery_evidence_lifecycle_event
  ON delivery_evidence(lifecycle_event_id);
