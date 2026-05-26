import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { PostgresDeliveryEvidenceRepository } from './postgres-delivery-evidence-repository.js';
import { PostgresProcurementOrderRepository } from './postgres-procurement-order-repository.js';
import type { DeliveryEvidenceRecord } from '../domain/delivery-evidence.js';
import type { ProcurementOrder } from '../domain/procurement-order.js';

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

const acceptedOrder: ProcurementOrder = {
  orderId: 'order-postgres-1',
  buyerOrganizationId: 'buyer-org',
  supplierOrganizationId: 'supplier-org',
  title: 'Halal packaging lot',
  description: 'Accepted order available for delivery evidence.',
  amount: '68000.00',
  currency: 'MYR',
  status: 'accepted',
  createdBy: 'buyer-user',
  createdAt: '2026-05-22T09:20:00.000Z',
  updatedAt: '2026-05-22T13:45:00.000Z',
  acceptedBy: 'supplier-user',
  acceptedAt: '2026-05-22T13:45:00.000Z',
  lifecycleEventIds: ['order-created-event', 'order-accepted-event'],
  latestLifecyclePayloadHash: `sha256:${'1'.repeat(64)}`,
};

const acceptedOrderRow = {
  order_id: acceptedOrder.orderId,
  buyer_organization_id: acceptedOrder.buyerOrganizationId,
  supplier_organization_id: acceptedOrder.supplierOrganizationId,
  title: acceptedOrder.title,
  description: acceptedOrder.description,
  amount: acceptedOrder.amount,
  currency: acceptedOrder.currency,
  status: acceptedOrder.status,
  created_by: acceptedOrder.createdBy,
  created_at: new Date(acceptedOrder.createdAt),
  updated_at: new Date(acceptedOrder.updatedAt),
  accepted_by: acceptedOrder.acceptedBy,
  accepted_at: new Date(acceptedOrder.acceptedAt!),
  rejected_by: null,
  rejected_at: null,
  lifecycle_event_ids: acceptedOrder.lifecycleEventIds,
  latest_lifecycle_payload_hash: acceptedOrder.latestLifecyclePayloadHash,
};

const deliveryEvidence: DeliveryEvidenceRecord = {
  evidenceId: 'delivery-evidence-postgres-1',
  orderId: acceptedOrder.orderId,
  buyerOrganizationId: acceptedOrder.buyerOrganizationId,
  supplierOrganizationId: acceptedOrder.supplierOrganizationId,
  submittedByUserId: 'supplier-user',
  evidenceType: 'deliveryNote',
  evidenceReference: 'delivery-ref:barakah:dn-1002',
  evidenceHash: `sha256:${'2'.repeat(64)}`,
  notes: 'Sealed carton count recorded by supplier operations.',
  submittedAt: '2026-05-23T10:15:00.000Z',
  verificationStatus: 'metadataRecorded',
  lifecycleEventId: 'delivery-event-1',
  lifecycleEventHash: `sha256:${'3'.repeat(64)}`,
  blockchainAnchor: {
    eventId: 'delivery-event-1',
    payloadHash: `sha256:${'3'.repeat(64)}`,
    anchorStatus: 'failed',
    blockchainNetwork: 'fabric-local',
    failureReason: 'blockchain_unavailable',
  },
};

const deliveryEvidenceRow = {
  evidence_id: deliveryEvidence.evidenceId,
  order_id: deliveryEvidence.orderId,
  buyer_organization_id: deliveryEvidence.buyerOrganizationId,
  supplier_organization_id: deliveryEvidence.supplierOrganizationId,
  submitted_by_user_id: deliveryEvidence.submittedByUserId,
  evidence_type: deliveryEvidence.evidenceType,
  evidence_reference: deliveryEvidence.evidenceReference,
  evidence_hash: deliveryEvidence.evidenceHash,
  notes: deliveryEvidence.notes,
  submitted_at: new Date(deliveryEvidence.submittedAt),
  verification_status: deliveryEvidence.verificationStatus,
  lifecycle_event_id: deliveryEvidence.lifecycleEventId,
  lifecycle_event_hash: deliveryEvidence.lifecycleEventHash,
  blockchain_event_id: deliveryEvidence.blockchainAnchor?.eventId,
  blockchain_payload_hash: deliveryEvidence.blockchainAnchor?.payloadHash,
  blockchain_anchor_status: deliveryEvidence.blockchainAnchor?.anchorStatus,
  blockchain_network: deliveryEvidence.blockchainAnchor?.blockchainNetwork,
  blockchain_transaction_id: null,
  blockchain_block_number: null,
  blockchain_channel_name: null,
  blockchain_chaincode_name: null,
  blockchain_anchored_at: null,
  blockchain_failure_reason: deliveryEvidence.blockchainAnchor?.failureReason,
};

test('PostgresProcurementOrderRepository saves and maps accepted orders', async () => {
  const db = new FakePostgresExecutor([[acceptedOrderRow]]);
  const repository = new PostgresProcurementOrderRepository(db);

  const saved = await repository.save(acceptedOrder);

  assert.strictEqual(saved.orderId, acceptedOrder.orderId);
  assert.strictEqual(saved.status, 'accepted');
  assert.deepStrictEqual(saved.lifecycleEventIds, acceptedOrder.lifecycleEventIds);
  assert.strictEqual(saved.acceptedAt, acceptedOrder.acceptedAt);
  assert.strictEqual(db.queries[0].values?.[15], acceptedOrder.lifecycleEventIds);
});

test('PostgresProcurementOrderRepository lists supplier orders', async () => {
  const db = new FakePostgresExecutor([[acceptedOrderRow]]);
  const repository = new PostgresProcurementOrderRepository(db);

  const orders = await repository.listBySupplierOrganization('supplier-org');

  assert.strictEqual(orders.length, 1);
  assert.strictEqual(orders[0].supplierOrganizationId, 'supplier-org');
  assert.match(db.queries[0].text, /supplier_organization_id = \$1/);
});

test('PostgresDeliveryEvidenceRepository saves proof metadata without raw payloads', async () => {
  const db = new FakePostgresExecutor([[deliveryEvidenceRow]]);
  const repository = new PostgresDeliveryEvidenceRepository(db);

  const saved = await repository.save(deliveryEvidence);

  assert.strictEqual(saved.evidenceId, deliveryEvidence.evidenceId);
  assert.strictEqual(saved.evidenceReference, deliveryEvidence.evidenceReference);
  assert.strictEqual(saved.blockchainAnchor?.anchorStatus, 'failed');
  assert.strictEqual(saved.blockchainAnchor?.failureReason, 'blockchain_unavailable');
  assert.strictEqual((saved as DeliveryEvidenceRecord & { rawDocument?: unknown }).rawDocument, undefined);
  assert.strictEqual(db.queries[0].values?.[22], 'blockchain_unavailable');
});

test('PostgresDeliveryEvidenceRepository lists evidence by order id in submitted order', async () => {
  const db = new FakePostgresExecutor([[deliveryEvidenceRow]]);
  const repository = new PostgresDeliveryEvidenceRepository(db);

  const items = await repository.listByOrderId(acceptedOrder.orderId);

  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].orderId, acceptedOrder.orderId);
  assert.match(db.queries[0].text, /ORDER BY submitted_at, evidence_id/);
});
