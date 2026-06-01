import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { PostgresDeliveryEvidenceRepository } from './postgres-delivery-evidence-repository.js';
import { PostgresProcurementCloseoutRepository } from './postgres-procurement-closeout-repository.js';
import { PostgresProcurementInvoiceRepository } from './postgres-invoice-repository.js';
import { PostgresProcurementOrderRepository } from './postgres-procurement-order-repository.js';
import { PostgresSourceToAwardRepository } from './postgres-source-to-award-repository.js';
import type { DeliveryEvidenceRecord } from '../domain/delivery-evidence.js';
import type { ProcurementCaseCloseout } from '../domain/procurement-closeout.js';
import type { ProcurementInvoice } from '../domain/invoice.js';
import type { ProcurementOrder } from '../domain/procurement-order.js';
import type { SourceToAwardCase } from '../domain/source-to-award.js';

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

const sourceCase: SourceToAwardCase = {
  caseId: 'sta-case-postgres-1',
  buyerOrganizationId: 'buyer-org',
  status: 'purchaseOrderGenerated',
  requisition: {
    requisitionId: 'req-postgres-1',
    title: 'Halal packaging lot',
    estimatedAmount: '68000.00',
    currency: 'MYR',
    requestedByUserId: 'buyer-user',
    createdAt: '2026-05-22T08:00:00.000Z',
    approvedByUserId: 'buyer-user',
    approvedAt: '2026-05-22T08:30:00.000Z',
  },
  rfq: {
    rfqId: 'rfq-postgres-1',
    requisitionId: 'req-postgres-1',
    supplierOrganizationIds: ['supplier-org'],
    issuedByUserId: 'buyer-user',
    issuedAt: '2026-05-22T09:00:00.000Z',
  },
  quotations: [{
    quotationId: 'quote-postgres-1',
    rfqId: 'rfq-postgres-1',
    supplierOrganizationId: 'supplier-org',
    submittedByUserId: 'supplier-user',
    amount: '68000.00',
    currency: 'MYR',
    deliveryDays: 7,
    submittedAt: '2026-05-22T10:00:00.000Z',
  }],
  award: {
    awardId: 'award-postgres-1',
    rfqId: 'rfq-postgres-1',
    quotationId: 'quote-postgres-1',
    supplierOrganizationId: 'supplier-org',
    selectedByUserId: 'buyer-user',
    selectedAt: '2026-05-22T11:00:00.000Z',
    generatedOrderId: acceptedOrder.orderId,
  },
  generatedOrderId: acceptedOrder.orderId,
  lifecycleEventIds: ['requisition-event', 'rfq-event', 'award-event'],
  latestLifecyclePayloadHash: `sha256:${'4'.repeat(64)}`,
  createdAt: '2026-05-22T08:00:00.000Z',
  updatedAt: '2026-05-22T11:30:00.000Z',
};

const sourceCaseRow = {
  case_id: sourceCase.caseId,
  buyer_organization_id: sourceCase.buyerOrganizationId,
  status: sourceCase.status,
  requisition: sourceCase.requisition,
  rfq: sourceCase.rfq,
  quotations: sourceCase.quotations,
  award: sourceCase.award,
  generated_order_id: sourceCase.generatedOrderId,
  lifecycle_event_ids: sourceCase.lifecycleEventIds,
  latest_lifecycle_payload_hash: sourceCase.latestLifecyclePayloadHash,
  created_at: new Date(sourceCase.createdAt),
  updated_at: new Date(sourceCase.updatedAt),
};

const invoice: ProcurementInvoice = {
  invoiceId: 'invoice-postgres-1',
  orderId: acceptedOrder.orderId,
  deliveryEvidenceId: deliveryEvidence.evidenceId,
  supplierOrganizationId: acceptedOrder.supplierOrganizationId,
  buyerOrganizationId: acceptedOrder.buyerOrganizationId,
  submittedByUserId: 'supplier-user',
  amount: acceptedOrder.amount,
  tax: '0.00',
  currency: acceptedOrder.currency,
  invoiceReference: 'invoice:postgres:001',
  invoiceHash: `sha256:${'5'.repeat(64)}`,
  status: 'paymentApproved',
  matchResult: {
    status: 'passed',
    checkedAt: '2026-05-23T11:00:00.000Z',
    checkedByUserId: 'buyer-user',
    issues: [],
    orderAmount: acceptedOrder.amount,
    invoiceAmount: acceptedOrder.amount,
    deliveryEvidenceId: deliveryEvidence.evidenceId,
  },
  submittedAt: '2026-05-23T10:30:00.000Z',
  updatedAt: '2026-05-23T11:30:00.000Z',
  paymentApprovedByUserId: 'buyer-user',
  paymentApprovedAt: '2026-05-23T11:30:00.000Z',
  lifecycleEventIds: ['invoice-issued-event', 'invoice-matched-event', 'invoice-approved-event'],
  latestLifecyclePayloadHash: `sha256:${'6'.repeat(64)}`,
};

const invoiceRow = {
  invoice_id: invoice.invoiceId,
  order_id: invoice.orderId,
  delivery_evidence_id: invoice.deliveryEvidenceId,
  supplier_organization_id: invoice.supplierOrganizationId,
  buyer_organization_id: invoice.buyerOrganizationId,
  submitted_by_user_id: invoice.submittedByUserId,
  amount: invoice.amount,
  tax: invoice.tax,
  currency: invoice.currency,
  invoice_reference: invoice.invoiceReference,
  invoice_hash: invoice.invoiceHash,
  status: invoice.status,
  match_result: invoice.matchResult,
  submitted_at: new Date(invoice.submittedAt),
  updated_at: new Date(invoice.updatedAt),
  payment_approved_by_user_id: invoice.paymentApprovedByUserId,
  payment_approved_at: new Date(invoice.paymentApprovedAt!),
  lifecycle_event_ids: invoice.lifecycleEventIds,
  latest_lifecycle_payload_hash: invoice.latestLifecyclePayloadHash,
};

const closeout: ProcurementCaseCloseout = {
  closeoutId: 'closeout-postgres-1',
  caseId: acceptedOrder.orderId,
  orderId: acceptedOrder.orderId,
  buyerOrganizationId: acceptedOrder.buyerOrganizationId,
  supplierOrganizationId: acceptedOrder.supplierOrganizationId,
  closedByUserId: 'buyer-user',
  closedAt: '2026-05-24T09:00:00.000Z',
  status: 'closed',
  notes: 'Closed after delivery and invoice approval.',
  metrics: {
    supplierOrganizationId: acceptedOrder.supplierOrganizationId,
    orderCount: 1,
    deliveryEvidenceCount: 1,
    invoiceCount: 1,
    invoiceExceptionCount: 0,
    proofCoveragePercent: 100,
    closeoutCount: 0,
    score: 100,
    lastUpdatedAt: '2026-05-24T09:00:00.000Z',
  },
};

const closeoutRow = {
  closeout_id: closeout.closeoutId,
  case_id: closeout.caseId,
  order_id: closeout.orderId,
  buyer_organization_id: closeout.buyerOrganizationId,
  supplier_organization_id: closeout.supplierOrganizationId,
  closed_by_user_id: closeout.closedByUserId,
  closed_at: new Date(closeout.closedAt),
  status: closeout.status,
  notes: closeout.notes,
  metrics: closeout.metrics,
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

test('PostgresSourceToAwardRepository saves source-to-award cases with safe JSON workflow data', async () => {
  const db = new FakePostgresExecutor([[sourceCaseRow]]);
  const repository = new PostgresSourceToAwardRepository(db);

  const saved = await repository.save(sourceCase);

  assert.strictEqual(saved.caseId, sourceCase.caseId);
  assert.strictEqual(saved.requisition.requisitionId, sourceCase.requisition.requisitionId);
  assert.strictEqual(saved.rfq?.supplierOrganizationIds[0], 'supplier-org');
  assert.deepStrictEqual(saved.lifecycleEventIds, sourceCase.lifecycleEventIds);
  assert.strictEqual(db.queries[0].values?.[3], JSON.stringify(sourceCase.requisition));
  assert.strictEqual(db.queries[0].values?.[5], JSON.stringify(sourceCase.quotations));
});

test('PostgresSourceToAwardRepository queries supplier-visible cases through RFQ JSON membership', async () => {
  const db = new FakePostgresExecutor([[sourceCaseRow]]);
  const repository = new PostgresSourceToAwardRepository(db);

  const cases = await repository.listBySupplierOrganization('supplier-org');

  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].rfq?.rfqId, sourceCase.rfq?.rfqId);
  assert.match(db.queries[0].text, /supplierOrganizationIds/);
  assert.strictEqual(db.queries[0].values?.[0], 'supplier-org');
});

test('PostgresProcurementInvoiceRepository saves invoice match state and lifecycle ids', async () => {
  const db = new FakePostgresExecutor([[invoiceRow]]);
  const repository = new PostgresProcurementInvoiceRepository(db);

  const saved = await repository.save(invoice);

  assert.strictEqual(saved.invoiceId, invoice.invoiceId);
  assert.strictEqual(saved.status, 'paymentApproved');
  assert.strictEqual(saved.matchResult.status, 'passed');
  assert.deepStrictEqual(saved.lifecycleEventIds, invoice.lifecycleEventIds);
  assert.strictEqual(db.queries[0].values?.[12], JSON.stringify(invoice.matchResult));
});

test('PostgresProcurementInvoiceRepository looks up duplicate invoice hashes', async () => {
  const db = new FakePostgresExecutor([[invoiceRow]]);
  const repository = new PostgresProcurementInvoiceRepository(db);

  const found = await repository.findByInvoiceHash(invoice.invoiceHash);

  assert.strictEqual(found?.invoiceHash, invoice.invoiceHash);
  assert.match(db.queries[0].text, /invoice_hash = \$1/);
});

test('PostgresProcurementCloseoutRepository saves closeout metrics without raw documents', async () => {
  const db = new FakePostgresExecutor([[closeoutRow]]);
  const repository = new PostgresProcurementCloseoutRepository(db);

  const saved = await repository.save(closeout);

  assert.strictEqual(saved.closeoutId, closeout.closeoutId);
  assert.strictEqual(saved.metrics.score, 100);
  assert.strictEqual((saved as ProcurementCaseCloseout & { rawDocument?: unknown }).rawDocument, undefined);
  assert.strictEqual(db.queries[0].values?.[9], JSON.stringify(closeout.metrics));
});
