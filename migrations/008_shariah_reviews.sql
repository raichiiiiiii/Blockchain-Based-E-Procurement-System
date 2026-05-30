CREATE TABLE IF NOT EXISTS shariah_reviews (
  review_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES member_organizations(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'submitted',
      'checklistInProgress',
      'checklistComplete',
      'approved',
      'rejected',
      'conditionalApproved'
    )
  ),
  submitted_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  references_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB,
  rationale TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shariah_reviews_organization
  ON shariah_reviews(organization_id);

CREATE INDEX IF NOT EXISTS idx_shariah_reviews_status
  ON shariah_reviews(status);

CREATE INDEX IF NOT EXISTS idx_shariah_reviews_created_at
  ON shariah_reviews(created_at DESC);
