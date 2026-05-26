export type ErpProfileType =
  | 'ublOrder'
  | 'ublInvoice'
  | 'ublDespatchAdvice'
  | 'paymentStatus'
  | 'journalEvent'
  | 'ocdsReleasePackage';

export type ErpIntegrationDirection = 'import' | 'export';

export type ErpIntegrationJobStatus = 'completed' | 'rejected';

export type ErpMappingProfile = {
  profileId: string;
  profileType: ErpProfileType;
  format: 'json';
  version: string;
  mappingRules: string[];
  status: 'active' | 'inactive';
};

export type ErpIntegrationJob = {
  jobId: string;
  direction: ErpIntegrationDirection;
  profileType: ErpProfileType;
  sourceId?: string;
  status: ErpIntegrationJobStatus;
  payload?: Record<string, unknown>;
  mappingErrors: string[];
  idempotencyKey?: string;
  createdAt: string;
  claimBoundary: 'localJsonAdapterOnlyNoProductionErpSync';
};
