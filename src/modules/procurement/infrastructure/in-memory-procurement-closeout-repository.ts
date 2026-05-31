import type { ProcurementCloseoutRepository } from '../application/procurement-closeout-repository.js';
import type { ProcurementCaseCloseout } from '../domain/procurement-closeout.js';

function cloneCloseout(closeout: ProcurementCaseCloseout): ProcurementCaseCloseout {
  return JSON.parse(JSON.stringify(closeout));
}

export class InMemoryProcurementCloseoutRepository implements ProcurementCloseoutRepository {
  private readonly closeouts = new Map<string, ProcurementCaseCloseout>();

  async save(closeout: ProcurementCaseCloseout): Promise<ProcurementCaseCloseout> {
    this.closeouts.set(closeout.caseId, cloneCloseout(closeout));
    return cloneCloseout(closeout);
  }

  async findByCaseId(caseId: string): Promise<ProcurementCaseCloseout | null> {
    const closeout = this.closeouts.get(caseId);
    return closeout ? cloneCloseout(closeout) : null;
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementCaseCloseout[]> {
    return [...this.closeouts.values()]
      .filter(closeout => closeout.supplierOrganizationId === supplierOrganizationId)
      .map(cloneCloseout);
  }

  async listAll(): Promise<ProcurementCaseCloseout[]> {
    return [...this.closeouts.values()].map(cloneCloseout);
  }
}
