import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { PlsContract, PlsDistributionRecord } from '../domain/pls-contract.js';
import { PostgresPlsContractRepository } from './postgres-pls-contract-repository.js';

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakePostgresExecutor implements PostgresExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly responses: QueryResultRow[][]) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) {
    this.queries.push({ text, values });
    const rows = (this.responses.shift() ?? []) as T[];
    return {
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }
}

const contract: PlsContract = {
  contractId: 'pls-demo-halal-packaging',
  procurementReference: 'demo-order-001',
  contractTemplateVersion: 'mudarabah-procurement-v1',
  buyerOrganizationId: 'demo-buyer-org',
  supplierOrganizationId: 'demo-supplier-org',
  financierOrganizationId: 'demo-financier-org',
  capitalAmount: '68000.00',
  currency: 'MYR',
  profitShare: {
    financierPercent: 60,
    ventureOperatorPercent: 40,
  },
  lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
  status: 'approvedForActivation',
  shariahApproval: {
    reviewId: 'review-demo-approved',
    status: 'approved',
    decidedAt: '2026-05-21T10:00:00.000Z',
  },
  createdAt: '2026-05-20T09:00:00.000Z',
  updatedAt: '2026-05-21T10:00:00.000Z',
};

const contractRow = {
  contract_id: contract.contractId,
  procurement_reference: contract.procurementReference,
  contract_template_version: contract.contractTemplateVersion,
  buyer_organization_id: contract.buyerOrganizationId,
  supplier_organization_id: contract.supplierOrganizationId,
  financier_organization_id: contract.financierOrganizationId,
  capital_amount: contract.capitalAmount,
  currency: contract.currency,
  profit_share: contract.profitShare,
  loss_allocation: contract.lossAllocation,
  status: contract.status,
  shariah_approval: contract.shariahApproval,
  shariah_certificate: null,
  activated_at: null,
  created_at: new Date(contract.createdAt),
  updated_at: new Date(contract.updatedAt),
};

const distribution: PlsDistributionRecord = {
  distributionId: 'pls-distribution-demo-profit',
  contractId: contract.contractId,
  eventType: 'profit',
  grossResultAmount: '12000.00',
  currency: 'MYR',
  calculationBasis: 'Simulation-only profit outcome for supervised demo.',
  allocations: [
    {
      partyRole: 'financier',
      organizationId: 'demo-financier-org',
      amount: '7200.00',
      basis: '60% agreed profit share',
    },
    {
      partyRole: 'ventureOperator',
      organizationId: 'demo-supplier-org',
      amount: '4800.00',
      basis: '40% agreed profit share',
    },
  ],
  createdBy: 'demo-financier-user',
  createdAt: '2026-05-22T10:00:00.000Z',
};

const distributionRow = {
  distribution_id: distribution.distributionId,
  contract_id: distribution.contractId,
  event_type: distribution.eventType,
  gross_result_amount: distribution.grossResultAmount,
  currency: distribution.currency,
  calculation_basis: distribution.calculationBasis,
  allocations: distribution.allocations,
  created_by: distribution.createdBy,
  created_at: new Date(distribution.createdAt),
};

test('PostgresPlsContractRepository saves PLS contracts without payment execution payloads', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresPlsContractRepository(db);

  await repository.saveContract(contract);

  assert.match(db.queries[0].text, /INSERT INTO pls_contracts/);
  assert.strictEqual(db.queries[0].values?.[0], contract.contractId);
  assert.strictEqual(db.queries[0].values?.[10], 'approvedForActivation');
  assert.strictEqual((contract as PlsContract & { paymentCredentials?: unknown }).paymentCredentials, undefined);
});

test('PostgresPlsContractRepository lists and maps contracts in stable updated order', async () => {
  const db = new FakePostgresExecutor([[contractRow]]);
  const repository = new PostgresPlsContractRepository(db);

  const contracts = await repository.listContracts();

  assert.strictEqual(contracts[0]?.contractId, contract.contractId);
  assert.strictEqual(contracts[0]?.profitShare.financierPercent, 60);
  assert.strictEqual(contracts[0]?.shariahApproval?.reviewId, 'review-demo-approved');
  assert.match(db.queries[0].text, /ORDER BY updated_at DESC, contract_id ASC/);
});

test('PostgresPlsContractRepository saves and lists simulation distribution records', async () => {
  const db = new FakePostgresExecutor([[], [distributionRow]]);
  const repository = new PostgresPlsContractRepository(db);

  await repository.saveDistribution(distribution);
  const distributions = await repository.listDistributionsByContract(contract.contractId);

  assert.match(db.queries[0].text, /INSERT INTO pls_distribution_records/);
  assert.strictEqual(db.queries[0].values?.[0], distribution.distributionId);
  assert.strictEqual(distributions[0]?.allocations[0]?.amount, '7200.00');
  assert.match(db.queries[1].text, /ORDER BY created_at DESC, distribution_id ASC/);
});

test('PostgresPlsContractRepository returns null for missing records', async () => {
  const db = new FakePostgresExecutor([[], []]);
  const repository = new PostgresPlsContractRepository(db);

  const missingContract = await repository.findContractById('missing-contract');
  const missingDistribution = await repository.findDistributionById('missing-distribution');

  assert.strictEqual(missingContract, null);
  assert.strictEqual(missingDistribution, null);
});
