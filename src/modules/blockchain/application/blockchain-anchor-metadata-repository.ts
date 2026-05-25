export type BlockchainAnchorStatus = 'notAnchored' | 'pending' | 'anchored' | 'failed';
export type BlockchainNetwork = 'fabric-local' | 'fabric';

export type BlockchainAnchorMetadata = {
  eventId: string;
  payloadHash: string;
  caseIdHash?: string;
  anchorStatus: BlockchainAnchorStatus;
  blockchainNetwork?: BlockchainNetwork;
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

export interface BlockchainAnchorMetadataRepository {
  save(metadata: BlockchainAnchorMetadata): Promise<BlockchainAnchorMetadata>;
  findByEventId(eventId: string): Promise<BlockchainAnchorMetadata | null>;
  listByCaseIdHash(caseIdHash: string): Promise<BlockchainAnchorMetadata[]>;
}
