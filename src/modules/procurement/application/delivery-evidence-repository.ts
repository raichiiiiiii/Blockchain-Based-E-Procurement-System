import type { DeliveryEvidenceRecord } from '../domain/delivery-evidence.js';

export interface DeliveryEvidenceRepository {
  save(record: DeliveryEvidenceRecord): Promise<DeliveryEvidenceRecord>;
  findById(evidenceId: string): Promise<DeliveryEvidenceRecord | null>;
  listByOrderId(orderId: string): Promise<DeliveryEvidenceRecord[]>;
}
