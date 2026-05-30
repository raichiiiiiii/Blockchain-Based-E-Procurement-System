import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { PaymentInstruction } from '../domain/payment-instruction.js';
import { PostgresPaymentInstructionRepository } from './postgres-payment-instruction-repository.js';

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

const instruction: PaymentInstruction = {
  paymentInstructionId: 'payment-demo-001',
  escrowId: 'demo-escrow-001',
  amount: '68000.00',
  currency: 'MYR',
  debtorOrganizationId: 'demo-financier-org',
  creditorOrganizationId: 'demo-supplier-org',
  status: 'accepted',
  paymentReference: 'escrow:demo-escrow-001',
  adapterName: 'localSandbox',
  adapterReference: 'sandbox-payment:payment-demo-001',
  createdByUserId: 'demo-financier-user',
  createdAt: '2026-05-30T10:00:00.000Z',
  updatedAt: '2026-05-30T10:00:00.000Z',
  lifecycleEventIds: ['payment-event-001'],
};

const instructionRow = {
  payment_instruction_id: instruction.paymentInstructionId,
  escrow_id: instruction.escrowId,
  amount: instruction.amount,
  currency: instruction.currency,
  debtor_organization_id: instruction.debtorOrganizationId,
  creditor_organization_id: instruction.creditorOrganizationId,
  status: instruction.status,
  payment_reference: instruction.paymentReference,
  adapter_name: instruction.adapterName,
  adapter_reference: instruction.adapterReference,
  failure_reason: null,
  created_by_user_id: instruction.createdByUserId,
  created_at: new Date(instruction.createdAt),
  updated_at: new Date(instruction.updatedAt),
  lifecycle_event_ids: instruction.lifecycleEventIds,
};

test('PostgresPaymentInstructionRepository saves sandbox/manual instruction metadata only', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresPaymentInstructionRepository(db);

  const saved = await repository.save(instruction);

  assert.strictEqual(saved.paymentInstructionId, instruction.paymentInstructionId);
  assert.match(db.queries[0].text, /INSERT INTO payment_instructions/);
  assert.strictEqual(db.queries[0].values?.[0], instruction.paymentInstructionId);
  assert.strictEqual(db.queries[0].values?.[6], instruction.status);
  assert.strictEqual(db.queries[0].values?.[8], instruction.adapterName);
  assert.deepStrictEqual(db.queries[0].values?.[14], instruction.lifecycleEventIds);
});

test('PostgresPaymentInstructionRepository updates reconciliation status and lifecycle events', async () => {
  const db = new FakePostgresExecutor([[{ payment_instruction_id: instruction.paymentInstructionId }]]);
  const repository = new PostgresPaymentInstructionRepository(db);

  const updated = await repository.update({
    ...instruction,
    status: 'settled',
    updatedAt: '2026-05-30T10:05:00.000Z',
    lifecycleEventIds: [...instruction.lifecycleEventIds, 'payment-event-002'],
  });

  assert.strictEqual(updated.status, 'settled');
  assert.match(db.queries[0].text, /UPDATE payment_instructions/);
  assert.match(db.queries[0].text, /RETURNING payment_instruction_id/);
  assert.strictEqual(db.queries[0].values?.[5], 'settled');
});

test('PostgresPaymentInstructionRepository finds instructions by id', async () => {
  const db = new FakePostgresExecutor([[instructionRow]]);
  const repository = new PostgresPaymentInstructionRepository(db);

  const found = await repository.findById(instruction.paymentInstructionId);

  assert.strictEqual(found?.paymentInstructionId, instruction.paymentInstructionId);
  assert.strictEqual(found?.createdAt, instruction.createdAt);
  assert.deepStrictEqual(found?.lifecycleEventIds, instruction.lifecycleEventIds);
  assert.match(db.queries[0].text, /WHERE payment_instruction_id = \$1/);
});

test('PostgresPaymentInstructionRepository finds active instruction by escrow', async () => {
  const db = new FakePostgresExecutor([[instructionRow]]);
  const repository = new PostgresPaymentInstructionRepository(db);

  const found = await repository.findActiveByEscrowId(instruction.escrowId);

  assert.strictEqual(found?.escrowId, instruction.escrowId);
  assert.match(db.queries[0].text, /status IN \('pending', 'accepted', 'settled'\)/);
  assert.match(db.queries[0].text, /ORDER BY updated_at DESC, payment_instruction_id ASC/);
});

test('PostgresPaymentInstructionRepository returns null for missing instruction', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresPaymentInstructionRepository(db);

  const found = await repository.findById('missing-payment');

  assert.strictEqual(found, null);
});

test('PostgresPaymentInstructionRepository throws when updating a missing instruction', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresPaymentInstructionRepository(db);

  await assert.rejects(
    () => repository.update(instruction),
    /Payment instruction does not exist: payment-demo-001/,
  );
});
