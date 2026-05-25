export type BlockchainAnchorCanonicalization = 'json-canonical-v1';
export type BlockchainAnchorStatus = 'anchored' | 'pending' | 'failed';
export type BlockchainVerificationStatus =
  | 'verified'
  | 'mismatch'
  | 'notFound'
  | 'unavailable';
export type BlockchainNetwork = 'fabric-local' | 'fabric';

export type AnchorEventInput = {
  eventId: string;
  caseIdHash: string;
  eventType: string;
  payloadHash: string;
  schemaVersion: string;
  canonicalization: BlockchainAnchorCanonicalization;
  occurredAt: string;
  previousEventHash?: string;
};

export type OnChainAnchorRecord = AnchorEventInput & {
  anchoredAt: string;
};

export type AnchorEventResult = {
  eventId: string;
  anchorStatus: BlockchainAnchorStatus;
  payloadHash: string;
  blockchainNetwork: BlockchainNetwork;
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export type BlockchainVerificationResult = {
  eventId: string;
  verificationStatus: BlockchainVerificationStatus;
  submittedPayloadHash: string;
  anchoredPayloadHash?: string;
  anchoredAt?: string;
};

export interface BlockchainAnchorGateway {
  anchorEvent(input: AnchorEventInput): Promise<AnchorEventResult>;
  getAnchor(eventId: string): Promise<OnChainAnchorRecord | null>;
  verifyEvent(eventId: string, payloadHash: string): Promise<BlockchainVerificationResult>;
}
