export type AuthSessionStatus = 'active' | 'revoked' | 'expired';

export type AuthSession = {
  sessionId: string;
  tokenHash: string;
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  status: AuthSessionStatus;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  authenticationMethod: 'localPassword';
};
