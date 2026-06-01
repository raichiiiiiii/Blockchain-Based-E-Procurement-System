CREATE TABLE IF NOT EXISTS source_to_award_cases (
  case_id TEXT PRIMARY KEY,
  buyer_organization_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'requisitionPendingApproval',
    'requisitionApproved',
    'rfqIssued',
    'quotationReceived',
    'awarded',
    'purchaseOrderGenerated'
  )),
  requisition JSONB NOT NULL,
  rfq JSONB,
  quotations JSONB NOT NULL DEFAULT '[]'::jsonb,
  award JSONB,
  generated_order_id TEXT,
  lifecycle_event_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  latest_lifecycle_payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_to_award_cases_buyer
  ON source_to_award_cases (buyer_organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_to_award_cases_requisition_id
  ON source_to_award_cases ((requisition->>'requisitionId'));

CREATE INDEX IF NOT EXISTS idx_source_to_award_cases_rfq_id
  ON source_to_award_cases ((rfq->>'rfqId'));

CREATE INDEX IF NOT EXISTS idx_source_to_award_cases_supplier_lookup
  ON source_to_award_cases USING GIN (rfq jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_source_to_award_cases_status
  ON source_to_award_cases (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS procurement_invoices (
  invoice_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  delivery_evidence_id TEXT,
  supplier_organization_id TEXT NOT NULL,
  buyer_organization_id TEXT NOT NULL,
  submitted_by_user_id TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  tax NUMERIC(18, 2),
  currency TEXT NOT NULL,
  invoice_reference TEXT,
  invoice_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN (
    'submitted',
    'matchPassed',
    'matchFailed',
    'paymentApproved',
    'rejected'
  )),
  match_result JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  payment_approved_by_user_id TEXT,
  payment_approved_at TIMESTAMPTZ,
  lifecycle_event_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  latest_lifecycle_payload_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_procurement_invoices_order
  ON procurement_invoices (order_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_procurement_invoices_buyer
  ON procurement_invoices (buyer_organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_procurement_invoices_supplier
  ON procurement_invoices (supplier_organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_procurement_invoices_status
  ON procurement_invoices (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS procurement_case_closeouts (
  closeout_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  buyer_organization_id TEXT NOT NULL,
  supplier_organization_id TEXT NOT NULL,
  closed_by_user_id TEXT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  notes TEXT,
  metrics JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_procurement_case_closeouts_supplier
  ON procurement_case_closeouts (supplier_organization_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_procurement_case_closeouts_order
  ON procurement_case_closeouts (order_id);
