import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { ProcurementContract } from '../domain/procurement-contract.js';
import { PostgresProcurementContractRepository } from './postgres-procurement-contract-repository.js';

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

const contract: ProcurementContract = {
  contractId: 'contract-demo-001',
  contractNumber: 'AMANAH-BARAKAH-2026-001',
  buyerOrganizationId: 'demo-buyer-org',
  supplierOrganizationId: 'demo-supplier-org',
  financierOrganizationId: 'demo-financier-org',
  status: 'accepted',
  version: 2,
  humanReadableDocumentId: 'document-contract-demo',
  machineReadableTerms: {
    parties: {
      buyerOrganizationId: 'demo-buyer-org',
      supplierOrganizationId: 'demo-supplier-org',
      financierOrganizationId: 'demo-financier-org',
      buyerName: 'Amanah Retail Sdn Bhd',
      supplierName: 'Barakah Supplies Sdn Bhd',
      financierName: 'Mabrur Finance Partner',
    },
    lineItems: [
      {
        itemId: 'line-1',
        description: 'Halal-certified packaging supplies',
        quantity: '500 cartons',
        unitPrice: '136.00',
        currency: 'MYR',
      },
    ],
    deliveryTerms: 'Supplier records delivery evidence before escrow review.',
    acceptanceCriteria: ['Buyer accepts delivery evidence metadata.'],
    escrowReleaseConditions: ['Accepted order and buyer-reviewed delivery evidence.'],
    paymentTerms: 'Escrow-backed settlement instruction only.',
    disputeAndArbitrationRules: 'Manual arbitration applies in the MVP.',
    documentReferences: ['document-contract-demo'],
    clauseReferences: [
      {
        clauseId: 'clause-escrow',
        title: 'Escrow Conditions',
        summary: 'Release requires buyer review and proof metadata.',
      },
    ],
  },
  termsHash: 'sha256:contract-terms-hash',
  signedAt: '2026-05-30T12:15:00.000Z',
  effectiveAt: '2026-06-01T00:00:00.000Z',
  expiresAt: '2026-12-31T00:00:00.000Z',
  createdByUserId: 'demo-buyer-user',
  createdAt: '2026-05-30T12:00:00.000Z',
  updatedAt: '2026-05-30T12:15:00.000Z',
  offers: [
    {
      offerId: 'offer-demo-001',
      contractId: 'contract-demo-001',
      proposedTerms: {
        parties: {
          buyerOrganizationId: 'demo-buyer-org',
          supplierOrganizationId: 'demo-supplier-org',
        },
        lineItems: [],
        deliveryTerms: 'Revised delivery terms',
        acceptanceCriteria: ['Buyer review'],
        escrowReleaseConditions: ['Proof metadata'],
        paymentTerms: 'Settlement instruction only',
        disputeAndArbitrationRules: 'Manual arbitration',
        documentReferences: [],
        clauseReferences: [],
      },
      proposedTermsHash: 'sha256:offer-terms-hash',
      actorUserId: 'demo-supplier-user',
      actorOrganizationId: 'demo-supplier-org',
      comment: 'Supplier revised delivery window.',
      status: 'submitted',
      createdAt: '2026-05-30T12:10:00.000Z',
    },
  ],
  acceptances: [
    {
      acceptanceId: 'acceptance-buyer',
      contractId: 'contract-demo-001',
      acceptedBy: 'buyer',
      actorUserId: 'demo-buyer-user',
      actorOrganizationId: 'demo-buyer-org',
      acceptedAt: '2026-05-30T12:14:00.000Z',
      acceptedVersion: 2,
      acceptedTermsHash: 'sha256:contract-terms-hash',
    },
    {
      acceptanceId: 'acceptance-supplier',
      contractId: 'contract-demo-001',
      acceptedBy: 'supplier',
      actorUserId: 'demo-supplier-user',
      actorOrganizationId: 'demo-supplier-org',
      acceptedAt: '2026-05-30T12:15:00.000Z',
      acceptedVersion: 2,
      acceptedTermsHash: 'sha256:contract-terms-hash',
    },
  ],
  lifecycleEvents: [
    {
      eventId: 'contract-event-created',
      eventType: 'contractCreated',
      actorUserId: 'demo-buyer-user',
      actorOrganizationId: 'demo-buyer-org',
      occurredAt: '2026-05-30T12:00:00.000Z',
      termsHash: 'sha256:contract-terms-hash',
    },
  ],
};

const contractRow = {
  contract_json: contract,
};

test('PostgresProcurementContractRepository saves contract aggregate JSON with indexed metadata', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresProcurementContractRepository(db);

  const saved = await repository.save(contract);

  assert.strictEqual(saved.contractId, contract.contractId);
  assert.match(db.queries[0].text, /INSERT INTO procurement_contracts/);
  assert.strictEqual(db.queries[0].values?.[0], contract.contractId);
  assert.strictEqual(db.queries[0].values?.[2], contract.buyerOrganizationId);
  assert.strictEqual(db.queries[0].values?.[8], contract.termsHash);
  assert.strictEqual(db.queries[0].values?.[15], JSON.stringify(contract));
});

test('PostgresProcurementContractRepository finds contract terms, offers, acceptances, and lifecycle events', async () => {
  const db = new FakePostgresExecutor([[contractRow]]);
  const repository = new PostgresProcurementContractRepository(db);

  const found = await repository.findById(contract.contractId);

  assert.strictEqual(found?.contractId, contract.contractId);
  assert.strictEqual(found?.machineReadableTerms.parties.buyerName, 'Amanah Retail Sdn Bhd');
  assert.strictEqual(found?.offers[0]?.offerId, 'offer-demo-001');
  assert.strictEqual(found?.acceptances.length, 2);
  assert.strictEqual(found?.lifecycleEvents[0]?.eventType, 'contractCreated');
  assert.match(db.queries[0].text, /WHERE contract_id = \$1/);
});

test('PostgresProcurementContractRepository lists contracts in stable updated order', async () => {
  const db = new FakePostgresExecutor([[contractRow]]);
  const repository = new PostgresProcurementContractRepository(db);

  const contracts = await repository.list();

  assert.strictEqual(contracts[0]?.contractId, contract.contractId);
  assert.match(db.queries[0].text, /ORDER BY updated_at DESC, contract_id ASC/);
});

test('PostgresProcurementContractRepository returns null for missing contracts', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresProcurementContractRepository(db);

  const found = await repository.findById('missing-contract');

  assert.strictEqual(found, null);
});
