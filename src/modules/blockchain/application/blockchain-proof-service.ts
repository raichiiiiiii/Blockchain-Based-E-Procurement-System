import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from './blockchain-anchor-metadata-repository.js';
import type {
  BlockchainAnchorGateway,
  BlockchainVerificationResult,
} from './blockchain-anchor-gateway.js';

export type BlockchainAnchorProof = {
  eventId: string;
  anchorStatus: BlockchainAnchorMetadata['anchorStatus'];
  payloadHash?: string;
  blockchainNetwork?: BlockchainAnchorMetadata['blockchainNetwork'];
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export async function getBlockchainAnchorProof(
  repository: BlockchainAnchorMetadataRepository | undefined,
  eventId: string,
): Promise<BlockchainAnchorProof> {
  if (!repository) {
    return {
      eventId,
      anchorStatus: 'notAnchored',
    };
  }

  const metadata = await repository.findByEventId(eventId);
  if (!metadata) {
    return {
      eventId,
      anchorStatus: 'notAnchored',
    };
  }

  return {
    eventId: metadata.eventId,
    anchorStatus: metadata.anchorStatus,
    payloadHash: metadata.payloadHash,
    blockchainNetwork: metadata.blockchainNetwork,
    channelName: metadata.channelName,
    chaincodeName: metadata.chaincodeName,
    transactionId: metadata.transactionId,
    blockNumber: metadata.blockNumber,
    anchoredAt: metadata.anchoredAt,
    failureReason: metadata.failureReason,
  };
}

export async function verifyBlockchainProof(
  gateway: BlockchainAnchorGateway | undefined,
  eventId: string,
  payloadHash: string,
): Promise<BlockchainVerificationResult> {
  if (!gateway) {
    return {
      eventId,
      verificationStatus: 'unavailable',
      submittedPayloadHash: payloadHash,
    };
  }

  try {
    return await gateway.verifyEvent(eventId, payloadHash);
  } catch {
    return {
      eventId,
      verificationStatus: 'unavailable',
      submittedPayloadHash: payloadHash,
    };
  }
}
