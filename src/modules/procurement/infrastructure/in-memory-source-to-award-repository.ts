import type { SourceToAwardRepository } from '../application/source-to-award-repository.js';
import type { SourceToAwardCase } from '../domain/source-to-award.js';

function cloneSourceCase(sourceCase: SourceToAwardCase): SourceToAwardCase {
  return JSON.parse(JSON.stringify(sourceCase));
}

export class InMemorySourceToAwardRepository implements SourceToAwardRepository {
  private readonly cases = new Map<string, SourceToAwardCase>();

  async save(sourceCase: SourceToAwardCase): Promise<SourceToAwardCase> {
    this.cases.set(sourceCase.caseId, cloneSourceCase(sourceCase));
    return cloneSourceCase(sourceCase);
  }

  async findByCaseId(caseId: string): Promise<SourceToAwardCase | null> {
    const sourceCase = this.cases.get(caseId);
    return sourceCase ? cloneSourceCase(sourceCase) : null;
  }

  async findByRequisitionId(requisitionId: string): Promise<SourceToAwardCase | null> {
    const sourceCase = [...this.cases.values()]
      .find(candidate => candidate.requisition.requisitionId === requisitionId);
    return sourceCase ? cloneSourceCase(sourceCase) : null;
  }

  async findByRfqId(rfqId: string): Promise<SourceToAwardCase | null> {
    const sourceCase = [...this.cases.values()]
      .find(candidate => candidate.rfq?.rfqId === rfqId);
    return sourceCase ? cloneSourceCase(sourceCase) : null;
  }

  async listByBuyerOrganization(buyerOrganizationId: string): Promise<SourceToAwardCase[]> {
    return [...this.cases.values()]
      .filter(sourceCase => sourceCase.buyerOrganizationId === buyerOrganizationId)
      .map(cloneSourceCase);
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<SourceToAwardCase[]> {
    return [...this.cases.values()]
      .filter(sourceCase => sourceCase.rfq?.supplierOrganizationIds.includes(supplierOrganizationId))
      .map(cloneSourceCase);
  }

  async listAll(): Promise<SourceToAwardCase[]> {
    return [...this.cases.values()].map(cloneSourceCase);
  }
}
