import type {
  AnchorEventInput,
  AnchorEventResult,
  BlockchainAnchorGateway,
  BlockchainNetwork,
  BlockchainVerificationResult,
  OnChainAnchorRecord,
} from '../application/blockchain-anchor-gateway.js';

export type UnavailableFabricAnchorGatewayOptions = {
  blockchainNetwork: BlockchainNetwork;
  channelName?: string;
  chaincodeName?: string;
  failureReason: string;
};

export class UnavailableFabricAnchorGateway implements BlockchainAnchorGateway {
  constructor(private readonly options: UnavailableFabricAnchorGatewayOptions) {}

  async anchorEvent(input: AnchorEventInput): Promise<AnchorEventResult> {
    return {
      eventId: input.eventId,
      anchorStatus: 'failed',
      payloadHash: input.payloadHash,
      blockchainNetwork: this.options.blockchainNetwork,
      channelName: this.options.channelName,
      chaincodeName: this.options.chaincodeName,
      failureReason: this.options.failureReason,
    };
  }

  async getAnchor(_eventId: string): Promise<OnChainAnchorRecord | null> {
    throw new Error(this.options.failureReason);
  }

  async verifyEvent(eventId: string, payloadHash: string): Promise<BlockchainVerificationResult> {
    return {
      eventId,
      verificationStatus: 'unavailable',
      submittedPayloadHash: payloadHash,
    };
  }
}
