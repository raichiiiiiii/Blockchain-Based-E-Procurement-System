import type { ProcurementCaseCloseout } from '../domain/procurement-closeout.js';

export interface ProcurementCloseoutRepository {
  save(closeout: ProcurementCaseCloseout): Promise<ProcurementCaseCloseout>;
  findByCaseId(caseId: string): Promise<ProcurementCaseCloseout | null>;
  listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementCaseCloseout[]>;
  listAll(): Promise<ProcurementCaseCloseout[]>;
}
