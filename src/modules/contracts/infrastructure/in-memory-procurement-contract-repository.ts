import type { ProcurementContractRepository } from '../application/contract-repository.js';
import type { ProcurementContract } from '../domain/procurement-contract.js';

function cloneContract(contract: ProcurementContract): ProcurementContract {
  return structuredClone(contract);
}

export class InMemoryProcurementContractRepository implements ProcurementContractRepository {
  private readonly contracts = new Map<string, ProcurementContract>();

  async save(contract: ProcurementContract): Promise<ProcurementContract> {
    const saved = cloneContract(contract);
    this.contracts.set(saved.contractId, saved);
    return cloneContract(saved);
  }

  async findById(contractId: string): Promise<ProcurementContract | null> {
    const contract = this.contracts.get(contractId);
    return contract ? cloneContract(contract) : null;
  }

  async list(): Promise<ProcurementContract[]> {
    return Array.from(this.contracts.values()).map(cloneContract);
  }
}
