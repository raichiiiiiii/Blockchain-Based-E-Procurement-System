import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from '../application/blockchain-anchor-metadata-repository.js';

function cloneMetadata(metadata: BlockchainAnchorMetadata): BlockchainAnchorMetadata {
  return {
    ...metadata,
  };
}

export class InMemoryBlockchainAnchorMetadataRepository
  implements BlockchainAnchorMetadataRepository
{
  private readonly records = new Map<string, BlockchainAnchorMetadata>();

  constructor(seedRecords: BlockchainAnchorMetadata[] = []) {
    for (const record of seedRecords) {
      this.records.set(record.eventId, cloneMetadata(record));
    }
  }

  async save(metadata: BlockchainAnchorMetadata): Promise<BlockchainAnchorMetadata> {
    const stored = cloneMetadata(metadata);
    this.records.set(stored.eventId, stored);
    return cloneMetadata(stored);
  }

  async findByEventId(eventId: string): Promise<BlockchainAnchorMetadata | null> {
    const record = this.records.get(eventId);
    return record ? cloneMetadata(record) : null;
  }

  async list(): Promise<BlockchainAnchorMetadata[]> {
    return [...this.records.values()]
      .sort((left, right) => (
        left.createdAt.localeCompare(right.createdAt) ||
        left.eventId.localeCompare(right.eventId)
      ))
      .map(record => cloneMetadata(record));
  }

  async listByCaseIdHash(caseIdHash: string): Promise<BlockchainAnchorMetadata[]> {
    return [...this.records.values()]
      .filter(record => record.caseIdHash === caseIdHash)
      .sort((left, right) => (
        left.createdAt.localeCompare(right.createdAt) ||
        left.eventId.localeCompare(right.eventId)
      ))
      .map(record => cloneMetadata(record));
  }
}
