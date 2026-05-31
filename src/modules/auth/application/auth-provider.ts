import type { LoginInput, LoginResult } from './login-user.js';

export type AuthProviderName = 'localPassword' | 'externalOidc';

export type AuthScope =
  | 'org:read'
  | 'org:write'
  | 'org:users:manage'
  | 'network:read'
  | 'network:write'
  | 'deals:read'
  | 'deals:write'
  | 'productivity:read'
  | 'productivity:write'
  | 'proof:read'
  | 'proof:verify'
  | 'email:read'
  | 'admin:platform';

export type AuthProviderStatus = {
  provider: AuthProviderName;
  status: 'available' | 'notConfigured';
  authenticationMethod: 'localPassword' | 'externalOidc';
  scopes: AuthScope[];
  message: string;
};

export type AuthProvider = {
  status(): AuthProviderStatus;
  login?(input: LoginInput): Promise<LoginResult>;
};

export const roleScopeMap: Record<string, AuthScope[]> = {
  administrator: [
    'admin:platform',
    'org:read',
    'org:write',
    'org:users:manage',
    'network:read',
    'network:write',
    'deals:read',
    'deals:write',
    'productivity:read',
    'productivity:write',
    'proof:read',
    'proof:verify',
    'email:read',
  ],
  organizationAdmin: [
    'org:read',
    'org:write',
    'org:users:manage',
    'network:read',
    'network:write',
    'deals:read',
    'productivity:read',
    'productivity:write',
    'proof:read',
    'email:read',
  ],
  buyer: ['org:read', 'network:read', 'network:write', 'deals:read', 'deals:write', 'productivity:read', 'productivity:write', 'proof:read'],
  supplier: ['org:read', 'network:read', 'network:write', 'deals:read', 'productivity:read', 'productivity:write', 'proof:read'],
  financier: ['org:read', 'network:read', 'deals:read', 'productivity:read', 'proof:read'],
  complianceReviewer: ['org:read', 'network:read', 'deals:read', 'productivity:read', 'proof:read'],
  shariahReviewer: ['org:read', 'network:read', 'deals:read', 'productivity:read', 'proof:read'],
  auditor: ['org:read', 'network:read', 'deals:read', 'productivity:read', 'proof:read', 'proof:verify', 'email:read'],
  regulator: ['org:read', 'network:read', 'deals:read', 'productivity:read', 'proof:read', 'proof:verify', 'email:read'],
  securityOperator: ['org:read', 'network:read', 'deals:read', 'productivity:read', 'proof:read', 'email:read'],
};

export function scopesForRoleCodes(roleCodes: readonly string[]): AuthScope[] {
  return [...new Set(roleCodes.flatMap(role => roleScopeMap[role] ?? []))].sort();
}
