export type ExternalApiScope =
  | 'evidence:write'
  | 'logistics:write'
  | 'payment:callback'
  | 'erp:sync'
  | 'proof:verify';

export type ExternalClientStatus = 'active' | 'revoked';

export type ExternalClientCredential = {
  clientId: string;
  clientName: string;
  scopes: ExternalApiScope[];
  status: ExternalClientStatus;
  secretHash: string;
  createdAt: string;
  revokedAt?: string;
};
