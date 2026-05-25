import type {
  AnchorEventInput,
  AnchorEventResult,
  BlockchainAnchorGateway,
  BlockchainNetwork,
  BlockchainVerificationResult,
  OnChainAnchorRecord,
} from '../application/blockchain-anchor-gateway.js';

export type FabricContractClient = {
  submitTransaction(name: string, ...args: string[]): Promise<Uint8Array | Buffer | string>;
  evaluateTransaction(name: string, ...args: string[]): Promise<Uint8Array | Buffer | string>;
};

export type FabricBlockchainAnchorGatewayOptions = {
  contract: FabricContractClient;
  blockchainNetwork?: BlockchainNetwork;
  channelName?: string;
  chaincodeName?: string;
};

function resultToString(result: Uint8Array | Buffer | string): string {
  if (typeof result === 'string') {
    return result;
  }

  return Buffer.from(result).toString('utf8');
}

function parseJsonResult<T>(result: Uint8Array | Buffer | string): T {
  return JSON.parse(resultToString(result)) as T;
}

export class FabricBlockchainAnchorGateway implements BlockchainAnchorGateway {
  private readonly blockchainNetwork: BlockchainNetwork;
  private readonly channelName?: string;
  private readonly chaincodeName?: string;

  constructor(private readonly options: FabricBlockchainAnchorGatewayOptions) {
    this.blockchainNetwork = options.blockchainNetwork ?? 'fabric-local';
    this.channelName = options.channelName;
    this.chaincodeName = options.chaincodeName;
  }

  async anchorEvent(input: AnchorEventInput): Promise<AnchorEventResult> {
    try {
      const result = parseJsonResult<Partial<AnchorEventResult>>(
        await this.options.contract.submitTransaction('anchorEvent', JSON.stringify(input)),
      );

      return {
        eventId: input.eventId,
        anchorStatus: 'anchored',
        payloadHash: input.payloadHash,
        blockchainNetwork: this.blockchainNetwork,
        channelName: this.channelName,
        chaincodeName: this.chaincodeName,
        transactionId: result.transactionId,
        blockNumber: result.blockNumber,
        anchoredAt: result.anchoredAt,
      };
    } catch {
      return {
        eventId: input.eventId,
        anchorStatus: 'failed',
        payloadHash: input.payloadHash,
        blockchainNetwork: this.blockchainNetwork,
        channelName: this.channelName,
        chaincodeName: this.chaincodeName,
        failureReason: 'fabric_anchor_failed',
      };
    }
  }

  async getAnchor(eventId: string): Promise<OnChainAnchorRecord | null> {
    const result = await this.options.contract.evaluateTransaction('getAnchor', eventId);
    const payload = resultToString(result).trim();

    if (payload.length === 0 || payload === 'null') {
      return null;
    }

    return JSON.parse(payload) as OnChainAnchorRecord;
  }

  async verifyEvent(eventId: string, payloadHash: string): Promise<BlockchainVerificationResult> {
    try {
      return parseJsonResult<BlockchainVerificationResult>(
        await this.options.contract.evaluateTransaction('verifyEvent', eventId, payloadHash),
      );
    } catch {
      return {
        eventId,
        verificationStatus: 'unavailable',
        submittedPayloadHash: payloadHash,
      };
    }
  }
}
