import type { ProcurementContract } from '../domain/procurement-contract.js';

export interface ProcurementContractRepository {
  save(contract: ProcurementContract): Promise<ProcurementContract>;
  findById(contractId: string): Promise<ProcurementContract | null>;
  list(): Promise<ProcurementContract[]>;
}
