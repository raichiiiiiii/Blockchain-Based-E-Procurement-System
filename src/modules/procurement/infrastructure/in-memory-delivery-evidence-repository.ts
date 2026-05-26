import type { DeliveryEvidenceRepository } from '../application/delivery-evidence-repository.js';
import type { DeliveryEvidenceRecord } from '../domain/delivery-evidence.js';

function cloneRecord(record: DeliveryEvidenceRecord): DeliveryEvidenceRecord {
  return JSON.parse(JSON.stringify(record)) as DeliveryEvidenceRecord;
}

export class InMemoryDeliveryEvidenceRepository implements DeliveryEvidenceRepository {
  private readonly records = new Map<string, DeliveryEvidenceRecord>();

  async save(record: DeliveryEvidenceRecord): Promise<DeliveryEvidenceRecord> {
    this.records.set(record.evidenceId, cloneRecord(record));
    return cloneRecord(record);
  }

  async findById(evidenceId: string): Promise<DeliveryEvidenceRecord | null> {
    const record = this.records.get(evidenceId);
    return record ? cloneRecord(record) : null;
  }

  async listByOrderId(orderId: string): Promise<DeliveryEvidenceRecord[]> {
    return Array.from(this.records.values())
      .filter(record => record.orderId === orderId)
      .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
      .map(cloneRecord);
  }
}
