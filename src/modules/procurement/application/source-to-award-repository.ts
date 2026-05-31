import type { SourceToAwardCase } from '../domain/source-to-award.js';

export interface SourceToAwardRepository {
  save(sourceCase: SourceToAwardCase): Promise<SourceToAwardCase>;
  findByCaseId(caseId: string): Promise<SourceToAwardCase | null>;
  findByRequisitionId(requisitionId: string): Promise<SourceToAwardCase | null>;
  findByRfqId(rfqId: string): Promise<SourceToAwardCase | null>;
  listByBuyerOrganization(buyerOrganizationId: string): Promise<SourceToAwardCase[]>;
  listBySupplierOrganization(supplierOrganizationId: string): Promise<SourceToAwardCase[]>;
  listAll(): Promise<SourceToAwardCase[]>;
}
