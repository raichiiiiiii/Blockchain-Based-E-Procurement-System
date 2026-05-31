ALTER TABLE member_organizations
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS unique_identifier TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS public_profile_summary TEXT;

UPDATE member_organizations
SET
  alias = COALESCE(alias, display_name),
  unique_identifier = COALESCE(unique_identifier, registration_number),
  business_category = COALESCE(business_category, business_type)
WHERE unique_identifier IS NULL
   OR alias IS NULL
   OR business_category IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_organizations_unique_identifier
  ON member_organizations (lower(unique_identifier))
  WHERE unique_identifier IS NOT NULL;

CREATE TABLE IF NOT EXISTS organization_network_requests (
  request_id TEXT PRIMARY KEY,
  requester_organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  target_organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  target_unique_identifier TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('buyer', 'supplier', 'financier', 'logistics', 'auditorRegulator', 'mixed')),
  message TEXT,
  purpose TEXT,
  state TEXT NOT NULL CHECK (state IN ('draft', 'sent', 'received', 'accepted', 'rejected', 'cancelled', 'blocked', 'expired')),
  created_by_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  decided_by_user_id TEXT REFERENCES platform_users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_network_requests_requester
  ON organization_network_requests(requester_organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_network_requests_target
  ON organization_network_requests(target_organization_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_network_requests_active_unique
  ON organization_network_requests(requester_organization_id, target_organization_id)
  WHERE state IN ('sent', 'received');

CREATE TABLE IF NOT EXISTS organization_network_relationships (
  relationship_id TEXT PRIMARY KEY,
  source_organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  target_organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('buyer', 'supplier', 'financier', 'logistics', 'auditorRegulator', 'mixed')),
  channel_scope TEXT NOT NULL CHECK (channel_scope IN ('sharedChannelA', 'sharedChannelB', 'privateChannelC', 'localProofOnly', 'unavailable')),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'ended')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (source_organization_id, target_organization_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_org_network_relationships_source
  ON organization_network_relationships(source_organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_network_relationships_target
  ON organization_network_relationships(target_organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS outgoing_email_notifications (
  notification_id TEXT PRIMARY KEY,
  recipient_organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  recipient_user_id TEXT REFERENCES platform_users(user_id),
  recipient_email TEXT,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  safe_body TEXT NOT NULL,
  related_entity_type TEXT NOT NULL,
  related_entity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_outgoing_email_notifications_recipient
  ON outgoing_email_notifications(recipient_organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outgoing_email_notifications_related
  ON outgoing_email_notifications(related_entity_type, related_entity_id);
