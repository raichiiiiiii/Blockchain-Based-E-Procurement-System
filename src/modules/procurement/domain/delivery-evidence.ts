export type DeliveryEvidenceType =
  | 'deliveryNote'
  | 'courierReceipt'
  | 'warehouseReceipt'
  | 'inspectionRecord'
  | 'other';

export const deliveryEvidenceTypes: readonly DeliveryEvidenceType[] = [
  'deliveryNote',
  'courierReceipt',
  'warehouseReceipt',
  'inspectionRecord',
  'other',
];

export type DeliveryEvidenceVerificationStatus = 'metadataRecorded';

export type DeliveryEvidenceAnchorStatus = 'notAnchored' | 'pending' | 'anchored' | 'failed';
export type DeliveryEvidenceBlockchainNetwork = 'fabric-local' | 'fabric';

export type DeliveryEvidenceBlockchainAnchor = {
  eventId?: string;
  payloadHash?: string;
  anchorStatus: DeliveryEvidenceAnchorStatus;
  blockchainNetwork?: DeliveryEvidenceBlockchainNetwork;
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

export function isDeliveryEvidenceType(value: string): value is DeliveryEvidenceType {
  return deliveryEvidenceTypes.includes(value as DeliveryEvidenceType);
}
