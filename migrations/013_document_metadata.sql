CREATE TABLE IF NOT EXISTS document_metadata (
  document_id TEXT PRIMARY KEY,
  owner_organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  uploaded_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'contract',
      'purchaseOrder',
      'deliveryProof',
      'invoice',
      'exportBundle',
      'shariahCertificate',
      'other'
    )
  ),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  storage_ref TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  malware_scan_status TEXT NOT NULL CHECK (malware_scan_status IN ('notScanned', 'passed', 'failed', 'unsupported')),
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('pending', 'extracted', 'failed', 'unsupported')),
  signature_status TEXT NOT NULL CHECK (signature_status IN ('notProvided', 'pending', 'verified', 'invalid', 'unsupported')),
  signature_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_metadata_owner_org
  ON document_metadata(owner_organization_id);

CREATE INDEX IF NOT EXISTS idx_document_metadata_type
  ON document_metadata(document_type);

CREATE INDEX IF NOT EXISTS idx_document_metadata_created_at
  ON document_metadata(created_at DESC);

CREATE TABLE IF NOT EXISTS document_extractions (
  document_id TEXT PRIMARY KEY REFERENCES document_metadata(document_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'extracted', 'failed', 'unsupported')),
  language TEXT,
  extraction_confidence DOUBLE PRECISION,
  extracted_text TEXT,
  extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  unmapped_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_extractions_status
  ON document_extractions(status);
