import type {
  AnchorEventInput,
  AnchorEventResult,
  BlockchainAnchorGateway,
  BlockchainVerificationResult,
  OnChainAnchorRecord,
} from '../application/blockchain-anchor-gateway.js';

function cloneRecord(record: OnChainAnchorRecord): OnChainAnchorRecord {
  return {
    ...record,
  };
}

export type InMemoryBlockchainAnchorGatewayOptions = {
  unavailable?: boolean;
  now?: () => string;
  seedRecords?: OnChainAnchorRecord[];
};

export class InMemoryBlockchainAnchorGateway implements BlockchainAnchorGateway {
  private readonly records = new Map<string, OnChainAnchorRecord>();
  private unavailable: boolean;

  constructor(private readonly options: InMemoryBlockchainAnchorGatewayOptions = {}) {
    this.unavailable = options.unavailable ?? false;

    for (const record of options.seedRecords ?? []) {
      this.records.set(record.eventId, cloneRecord(record));
    }
  }

  setUnavailable(unavailable: boolean): void {
    this.unavailable = unavailable;
  }

  async anchorEvent(input: AnchorEventInput): Promise<AnchorEventResult> {
    if (this.unavailable) {
      return {
        eventId: input.eventId,
        anchorStatus: 'failed',
        payloadHash: input.payloadHash,
        blockchainNetwork: 'fabric-local',
        failureReason: 'blockchain_unavailable',
      };
    }

    if (this.records.has(input.eventId)) {
      return {
        eventId: input.eventId,
        anchorStatus: 'failed',
        payloadHash: input.payloadHash,
        blockchainNetwork: 'fabric-local',
        failureReason: 'duplicate_anchor',
      };
    }

    const anchoredAt = this.options.now?.() ?? new Date().toISOString();
    const record: OnChainAnchorRecord = {
      ...input,
      anchoredAt,
    };

    this.records.set(input.eventId, record);

    return {
      eventId: input.eventId,
      anchorStatus: 'anchored',
      payloadHash: input.payloadHash,
      blockchainNetwork: 'fabric-local',
      anchoredAt,
    };
  }

  async getAnchor(eventId: string): Promise<OnChainAnchorRecord | null> {
    if (this.unavailable) {
      throw new Error('blockchain_unavailable');
    }

    const record = this.records.get(eventId);
    return record ? cloneRecord(record) : null;
  }

  async verifyEvent(eventId: string, payloadHash: string): Promise<BlockchainVerificationResult> {
    if (this.unavailable) {
      return {
        eventId,
        verificationStatus: 'unavailable',
        submittedPayloadHash: payloadHash,
      };
    }

    const record = this.records.get(eventId);
    if (!record) {
      return {
        eventId,
        verificationStatus: 'notFound',
        submittedPayloadHash: payloadHash,
      };
    }

    return {
      eventId,
      verificationStatus: record.payloadHash === payloadHash ? 'verified' : 'mismatch',
      submittedPayloadHash: payloadHash,
      anchoredPayloadHash: record.payloadHash,
      anchoredAt: record.anchoredAt,
    };
  }
}
