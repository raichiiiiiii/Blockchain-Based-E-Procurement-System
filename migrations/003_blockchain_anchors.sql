CREATE TABLE IF NOT EXISTS blockchain_anchor_metadata (
  event_id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  case_id_hash TEXT,
  anchor_status TEXT NOT NULL CHECK (anchor_status IN ('notAnchored', 'pending', 'anchored', 'failed')),
  blockchain_network TEXT CHECK (blockchain_network IN ('fabric-local', 'fabric')),
  channel_name TEXT,
  chaincode_name TEXT,
  transaction_id TEXT,
  block_number TEXT,
  anchored_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_payload_hash
  ON blockchain_anchor_metadata(payload_hash);

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_case_id_hash
  ON blockchain_anchor_metadata(case_id_hash);

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_status
  ON blockchain_anchor_metadata(anchor_status);
