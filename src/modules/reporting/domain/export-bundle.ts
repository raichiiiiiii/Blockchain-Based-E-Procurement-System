export type ExportBundleScope =
  | 'accessHistory'
  | 'procureToPay'
  | 'combinedAudit';

export type ExportBundleStatus = 'generated' | 'partial' | 'failed';

export type ExportBundleVerificationStatus =
  | 'verified'
  | 'mismatch'
  | 'notFound'
  | 'unavailable';

export type ExportSigningProfileStatus =
  | 'active'
  | 'rotated'
  | 'revoked';

export type ExportSigningProfile = {
  signingProfileId: string;
  algorithm: 'Ed25519';
  keyId: string;
  status: ExportSigningProfileStatus;
  createdAt: string;
  rotatedAt?: string;
};

export type ExportBundleSignatureStatus =
  | 'signed'
  | 'invalid'
  | 'rejected';

export type ExportBundleSignature = {
  signatureId: string;
  bundleId: string;
  signingProfileId: string;
  algorithm: 'Ed25519';
  keyId: string;
  keyStatus: ExportSigningProfileStatus;
  status: ExportBundleSignatureStatus;
  manifestHash: string;
  bundleHash: string;
  signedPayloadHash: string;
  signature: string;
  signedAt: string;
  publicKeyPem: string;
  verificationInstructions: string;
  offlineVerificationPackage: {
    manifestFileName: 'manifest.json';
    signatureFileName: string;
    publicKeyFileName: string;
    instructionsFileName: 'VERIFY_SIGNATURE.txt';
  };
  claimBoundary: 'localSoftwareKeyOnly';
};

export type ExportBundleSignatureVerificationStatus =
  | 'verified'
  | 'invalid'
  | 'notFound'
  | 'unavailable'
  | 'keyInactive';

export type ExportBundleRecordType =
  | 'accessAuditEvent'
  | 'procureToPayLifecycleEvent'
  | 'blockchainAnchorMetadata';

export type ExportBundleRecordReference = {
  recordType: ExportBundleRecordType;
  recordId: string;
  occurredAt?: string;
  payloadHash?: string;
  anchorStatus?: string;
  source: 'access-history' | 'transaction-history' | 'blockchain-proof';
};

export type ExportBundleManifest = {
  manifestId: string;
  scope: ExportBundleScope;
  generatedAt: string;
  requestedByUserId: string;
  dateRange: {
    occurredFrom?: string;
    occurredTo?: string;
  };
  recordCount: number;
  accessEventCount: number;
  lifecycleEventCount: number;
  anchorMetadataCount: number;
  records: ExportBundleRecordReference[];
};

export type ExportBundleIntegrity = {
  canonicalization: 'json-stable-v1';
  proofType: 'mvp-manifest-hash';
  manifestHash: string;
  bundleHash: string;
  exportProof?: ExportBundleBlockchainAnchor;
};

export type ExportBundleBlockchainAnchor = {
  eventId: string;
  payloadHash: string;
  anchorStatus: 'notAnchored' | 'pending' | 'anchored' | 'failed';
  blockchainNetwork?: 'fabric-local' | 'fabric';
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export type ExportBundleRecord = {
  bundleId: string;
  status: ExportBundleStatus;
  scope: ExportBundleScope;
  purpose: string;
  requestedByUserId: string;
  requestedAt: string;
  generatedAt: string;
  failureReason?: string;
  manifest: ExportBundleManifest;
  integrity: ExportBundleIntegrity;
  signature?: ExportBundleSignature;
  download: {
    available: boolean;
    reference: string;
    contentType: 'application/json';
  };
};

export type ExportBundleVerificationResult = {
  bundleId: string;
  verificationStatus: ExportBundleVerificationStatus;
  submittedBundleHash?: string;
  bundleHash?: string;
  manifestHash?: string;
  verifiedAt?: string;
};

export type ExportBundleSignatureVerificationResult = {
  bundleId: string;
  signatureId?: string;
  verificationStatus: ExportBundleSignatureVerificationStatus;
  manifestHash?: string;
  submittedManifestHash?: string;
  keyId?: string;
  algorithm?: 'Ed25519';
  verifiedAt?: string;
  reason?: string;
};
