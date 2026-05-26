export type ShariahCertificateStatus = 'active' | 'expired' | 'revoked';

export interface ShariahCertificate {
  certificateId: string;
  issuedBy: string;
  reviewerBoard: string;
  fatwaReference: string;
  scope: string;
  contractTemplateVersion: string;
  conditions: string[];
  issuedAt: string;
  expiresAt?: string;
  status: ShariahCertificateStatus;
  certificateDocumentId?: string;
  certificateHash: string;
  createdByUserId: string;
  createdAt: string;
  revokedAt?: string;
  revocationReason?: string;
}

export interface ShariahCertificateReference {
  certificateId: string;
  status: ShariahCertificateStatus;
  certificateHash: string;
  issuedAt: string;
  expiresAt?: string;
}
