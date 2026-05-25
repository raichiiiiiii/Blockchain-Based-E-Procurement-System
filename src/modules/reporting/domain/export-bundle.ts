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
