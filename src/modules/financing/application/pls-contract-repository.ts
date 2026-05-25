import type { PlsContract, PlsDistributionRecord } from '../domain/pls-contract.js';

export interface PlsContractRepository {
  saveContract(contract: PlsContract): Promise<PlsContract>;
  findContractById(contractId: string): Promise<PlsContract | null>;
  listContracts(): Promise<PlsContract[]>;
  saveDistribution(distribution: PlsDistributionRecord): Promise<PlsDistributionRecord>;
  findDistributionById(distributionId: string): Promise<PlsDistributionRecord | null>;
  listDistributionsByContract(contractId: string): Promise<PlsDistributionRecord[]>;
}
