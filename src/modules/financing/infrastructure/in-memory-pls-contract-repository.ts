import type { PlsContract, PlsDistributionRecord } from '../domain/pls-contract.js';
import type { PlsContractRepository } from '../application/pls-contract-repository.js';

function cloneContract(contract: PlsContract): PlsContract {
  return JSON.parse(JSON.stringify(contract)) as PlsContract;
}

function cloneDistribution(distribution: PlsDistributionRecord): PlsDistributionRecord {
  return JSON.parse(JSON.stringify(distribution)) as PlsDistributionRecord;
}

export class InMemoryPlsContractRepository implements PlsContractRepository {
  private readonly contracts = new Map<string, PlsContract>();
  private readonly distributions = new Map<string, PlsDistributionRecord>();

  constructor(seedContracts: PlsContract[] = [], seedDistributions: PlsDistributionRecord[] = []) {
    for (const contract of seedContracts) {
      this.contracts.set(contract.contractId, cloneContract(contract));
    }

    for (const distribution of seedDistributions) {
      this.distributions.set(distribution.distributionId, cloneDistribution(distribution));
    }
  }

  async saveContract(contract: PlsContract): Promise<PlsContract> {
    const stored = cloneContract(contract);
    this.contracts.set(stored.contractId, stored);
    return cloneContract(stored);
  }

  async findContractById(contractId: string): Promise<PlsContract | null> {
    const contract = this.contracts.get(contractId);
    return contract ? cloneContract(contract) : null;
  }

  async listContracts(): Promise<PlsContract[]> {
    return [...this.contracts.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.contractId.localeCompare(right.contractId))
      .map(cloneContract);
  }

  async saveDistribution(distribution: PlsDistributionRecord): Promise<PlsDistributionRecord> {
    const stored = cloneDistribution(distribution);
    this.distributions.set(stored.distributionId, stored);
    return cloneDistribution(stored);
  }

  async findDistributionById(distributionId: string): Promise<PlsDistributionRecord | null> {
    const distribution = this.distributions.get(distributionId);
    return distribution ? cloneDistribution(distribution) : null;
  }

  async listDistributionsByContract(contractId: string): Promise<PlsDistributionRecord[]> {
    return [...this.distributions.values()]
      .filter(distribution => distribution.contractId === contractId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.distributionId.localeCompare(right.distributionId))
      .map(cloneDistribution);
  }
}
