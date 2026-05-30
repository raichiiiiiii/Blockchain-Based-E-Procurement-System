CREATE TABLE IF NOT EXISTS kyc_aml_onboarding_cases (
  case_id TEXT PRIMARY KEY,
  member_organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  kyc JSONB NOT NULL,
  aml JSONB NOT NULL,
  evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected', 'flagged', 'blocked')),
  submitted_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  decision JSONB,
  decided_by_user_id TEXT REFERENCES platform_users(user_id),
  decided_at TIMESTAMPTZ,
  decision_outcome TEXT CHECK (decision_outcome IS NULL OR decision_outcome IN ('pass', 'fail', 'flag', 'block'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_aml_onboarding_cases_member_org
  ON kyc_aml_onboarding_cases(member_organization_id);

CREATE INDEX IF NOT EXISTS idx_kyc_aml_onboarding_cases_status
  ON kyc_aml_onboarding_cases(status);

CREATE INDEX IF NOT EXISTS idx_kyc_aml_onboarding_cases_member_updated
  ON kyc_aml_onboarding_cases(member_organization_id, updated_at DESC, case_id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_aml_onboarding_cases_open_case
  ON kyc_aml_onboarding_cases(member_organization_id)
  WHERE status = 'submitted';
