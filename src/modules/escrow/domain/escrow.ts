export type EscrowAnchorStatus = 'notAnchored' | 'pending' | 'anchored' | 'failed';
export type EscrowBlockchainNetwork = 'fabric-local' | 'fabric';

export type EscrowStatus =
  | 'accepted'
  | 'escrowCreated'
  | 'funded'
  | 'awaitingProof'
  | 'releasePending'
  | 'releaseReady'
  | 'releaseRequested'
  | 'releaseApproved'
  | 'releaseRejected'
  | 'onHold'
  | 'disputeOpen'
  | 'arbitration'
  | 'released'
  | 'refunded'
  | 'cancelled'
  | 'expired'
  | 'settlementInstructionReady'
  | 'disputed';

export type EscrowBlockchainAnchor = {
  eventId?: string;
  payloadHash?: string;
  anchorStatus: EscrowAnchorStatus;
  blockchainNetwork?: EscrowBlockchainNetwork;
  transactionId?: string;
  blockNumber?: string;
  channelName?: string;
  chaincodeName?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export type EscrowRecord = {
  escrowId: string;
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId?: string;
  termsHash: string;
  status: EscrowStatus;
  acceptedOrderReference?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lifecycleEventId?: string;
  lifecycleEventHash?: string;
  blockchainAnchor?: EscrowBlockchainAnchor;
  statusReason?: string;
  releaseConditionSummary?: {
    acceptedOrder: boolean;
    deliveryEvidenceRecorded: boolean;
    eligibilitySatisfied: boolean;
    disputeFree: boolean;
  };
};

export const activeEscrowStatuses: readonly EscrowStatus[] = [
  'accepted',
  'escrowCreated',
  'funded',
  'awaitingProof',
  'releasePending',
  'releaseReady',
  'releaseRequested',
  'releaseApproved',
  'releaseRejected',
  'onHold',
  'disputeOpen',
  'arbitration',
  'disputed',
  'settlementInstructionReady',
];

export function isActiveEscrowStatus(status: EscrowStatus): boolean {
  return activeEscrowStatuses.includes(status);
}
