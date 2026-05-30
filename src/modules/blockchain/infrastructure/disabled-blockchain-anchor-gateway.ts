import type {
  AnchorEventInput,
  AnchorEventResult,
  BlockchainAnchorGateway,
  BlockchainVerificationResult,
  OnChainAnchorRecord,
} from '../application/blockchain-anchor-gateway.js';

export class DisabledBlockchainAnchorGateway implements BlockchainAnchorGateway {
  constructor(private readonly failureReason = 'blockchain_anchor_disabled') {}

  async anchorEvent(input: AnchorEventInput): Promise<AnchorEventResult> {
    return {
      eventId: input.eventId,
      anchorStatus: 'failed',
      payloadHash: input.payloadHash,
      blockchainNetwork: 'fabric-local',
      failureReason: this.failureReason,
    };
  }

  async getAnchor(_eventId: string): Promise<OnChainAnchorRecord | null> {
    return null;
  }

  async verifyEvent(eventId: string, payloadHash: string): Promise<BlockchainVerificationResult> {
    return {
      eventId,
      verificationStatus: 'unavailable',
      submittedPayloadHash: payloadHash,
    };
  }
}
