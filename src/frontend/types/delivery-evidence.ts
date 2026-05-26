export type DeliveryEvidenceType =
  | 'deliveryNote'
  | 'courierReceipt'
  | 'warehouseReceipt'
  | 'inspectionRecord'
  | 'other';

export type DeliveryEvidenceVerificationStatus = 'metadataRecorded';
export type DeliveryEvidenceAnchorStatus = 'notAnchored' | 'pending' | 'anchored' | 'failed';

export type DeliveryEvidenceBlockchainAnchor = {
  eventId?: string;
  payloadHash?: string;
  anchorStatus: DeliveryEvidenceAnchorStatus;
  blockchainNetwork?: 'fabric-local' | 'fabric';
  transactionId?: string;
  blockNumber?: string;
  channelName?: string;
  chaincodeName?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export type DeliveryEvidenceRecord = {
  evidenceId: string;
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  submittedByUserId: string;
  evidenceType: DeliveryEvidenceType;
  evidenceReference?: string;
  evidenceHash: string;
  notes?: string;
  submittedAt: string;
  verificationStatus: DeliveryEvidenceVerificationStatus;
  lifecycleEventId?: string;
  lifecycleEventHash?: string;
  blockchainAnchor?: DeliveryEvidenceBlockchainAnchor;
};

export type SubmitDeliveryEvidenceRequest = {
  evidenceType: DeliveryEvidenceType;
  evidenceReference?: string;
  evidenceHash?: string;
  notes?: string;
};
