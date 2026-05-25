CREATE TABLE IF NOT EXISTS platform_users (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES platform_users(user_id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  actor_user_id TEXT NOT NULL REFERENCES platform_users(user_id),
  actor_organization_id TEXT,
  actor_role_codes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  authentication_method TEXT NOT NULL CHECK (authentication_method = 'localPassword')
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash
  ON auth_sessions(token_hash);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_actor_user_id
  ON auth_sessions(actor_user_id);

CREATE TABLE IF NOT EXISTS member_organizations (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  display_name TEXT,
  organization_type TEXT NOT NULL,
  business_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  country_code TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendingReview', 'active', 'inactive', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_organizations_status
  ON member_organizations(status);

CREATE TABLE IF NOT EXISTS organization_memberships (
  user_id TEXT NOT NULL REFERENCES platform_users(user_id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_memberships_organization_id
  ON organization_memberships(organization_id);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  role_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope = 'organization'),
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  is_system_reserved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_code, scope)
);

CREATE INDEX IF NOT EXISTS idx_roles_status
  ON roles(status);

CREATE TABLE IF NOT EXISTS role_assignments (
  user_id TEXT NOT NULL REFERENCES platform_users(user_id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES member_organizations(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_active_user_org
  ON role_assignments(user_id, organization_id)
  WHERE status = 'active';
