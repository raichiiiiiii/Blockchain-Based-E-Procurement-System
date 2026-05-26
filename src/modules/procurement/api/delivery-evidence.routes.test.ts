import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryBlockchainAnchorGateway } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import { InMemoryDeliveryEvidenceRepository } from '../infrastructure/in-memory-delivery-evidence-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcurementOrderRepository } from '../infrastructure/in-memory-procurement-order-repository.js';
import type { ProcurementOrder } from '../domain/procurement-order.js';

async function createSession(
  repository: InMemoryAuthSessionRepository,
  input: {
    token: string;
    actorUserId: string;
    actorOrganizationId: string;
    actorRoleCodes: string[];
  },
) {
  await repository.save({
    sessionId: `session-${input.actorUserId}`,
    tokenHash: hashToken(input.token),
    actorUserId: input.actorUserId,
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
  });
}

function acceptedOrder(overrides: Partial<ProcurementOrder> = {}): ProcurementOrder {
  return {
    orderId: 'order-delivery-1',
    buyerOrganizationId: 'buyer-org',
    supplierOrganizationId: 'supplier-org',
    title: 'Halal packaging lot',
    amount: '68000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'buyer-user',
    createdAt: '2026-05-22T09:20:00.000Z',
    updatedAt: '2026-05-22T13:45:00.000Z',
    acceptedBy: 'supplier-user',
    acceptedAt: '2026-05-22T13:45:00.000Z',
    lifecycleEventIds: ['order-accepted-event'],
    ...overrides,
  };
}

async function createDeliveryEvidenceTestContext(options?: {
  gateway?: InMemoryBlockchainAnchorGateway;
  order?: ProcurementOrder;
}) {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const orderRepository = new InMemoryProcurementOrderRepository();
  const evidenceRepository = new InMemoryDeliveryEvidenceRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
  const blockchainAnchorMetadataRepository = new InMemoryBlockchainAnchorMetadataRepository();

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'buyer-user',
    actorOrganizationId: 'buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'other-buyer-token',
    actorUserId: 'other-buyer-user',
    actorOrganizationId: 'other-buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'supplier-token',
    actorUserId: 'supplier-user',
    actorOrganizationId: 'supplier-org',
    actorRoleCodes: ['supplier'],
  });
  await createSession(sessionRepository, {
    token: 'other-supplier-token',
    actorUserId: 'other-supplier-user',
    actorOrganizationId: 'other-supplier-org',
    actorRoleCodes: ['supplier'],
  });
  await createSession(sessionRepository, {
    token: 'auditor-token',
    actorUserId: 'auditor-user',
    actorOrganizationId: 'audit-org',
    actorRoleCodes: ['auditor'],
  });

  await orderRepository.save(options?.order ?? acceptedOrder());

  const server = createTestableServer({
    sessionRepository,
    procurementOrderRepository: orderRepository,
    deliveryEvidenceRepository: evidenceRepository,
    procureToPayLifecycleEventRepository: lifecycleEventRepository,
    blockchainAnchorGateway: options?.gateway ?? new InMemoryBlockchainAnchorGateway(),
    blockchainAnchorMetadataRepository,
  });
  await server.ready();

  return {
    server,
    evidenceRepository,
    lifecycleEventRepository,
  };
}

const validEvidencePayload = {
  evidenceType: 'deliveryNote',
  evidenceReference: 'delivery-ref:barakah:dn-1002',
  notes: 'Sealed carton count and dispatch timestamp recorded by supplier operations.',
};

test('supplier submits delivery evidence for an assigned accepted order', async () => {
  const { server, lifecycleEventRepository } = await createDeliveryEvidenceTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: validEvidencePayload,
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.strictEqual(body.data.orderId, 'order-delivery-1');
  assert.strictEqual(body.data.supplierOrganizationId, 'supplier-org');
  assert.strictEqual(body.data.submittedByUserId, 'supplier-user');
  assert.strictEqual(body.data.verificationStatus, 'metadataRecorded');
  assert.match(body.data.evidenceHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(body.data.lifecycleEventId);
  assert.strictEqual(body.data.blockchainAnchor.anchorStatus, 'anchored');
  assert.strictEqual(body.data.rawDocument, undefined);

  const lifecycleEvents = await lifecycleEventRepository.list();
  assert.strictEqual(lifecycleEvents.length, 1);
  assert.strictEqual(lifecycleEvents[0].eventType, 'deliveryEvidenceSubmitted');
  assert.strictEqual(lifecycleEvents[0].targetType, 'delivery');
  assert.strictEqual(lifecycleEvents[0].targetId, body.data.evidenceId);
});

test('supplier cannot submit delivery evidence for an unrelated order', async () => {
  const { server } = await createDeliveryEvidenceTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer other-supplier-token',
    },
    payload: validEvidencePayload,
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
});

test('supplier cannot submit delivery evidence before order acceptance', async () => {
  const { server } = await createDeliveryEvidenceTestContext({
    order: acceptedOrder({
      status: 'created',
      acceptedAt: undefined,
      acceptedBy: undefined,
    }),
  });

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: validEvidencePayload,
  });

  assert.strictEqual(response.statusCode, 409);
  assert.strictEqual(response.json().error.code, 'CONFLICT');
  assert.strictEqual(response.json().error.details.orderStatus, 'created');
});

test('buyer can view delivery evidence for own order', async () => {
  const { server } = await createDeliveryEvidenceTestContext();

  await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: validEvidencePayload,
  });

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.strictEqual(response.statusCode, 200);
  const body = response.json();
  assert.strictEqual(body.data.items.length, 1);
  assert.strictEqual(body.data.items[0].evidenceType, 'deliveryNote');
});

test('unrelated buyer cannot view delivery evidence', async () => {
  const { server } = await createDeliveryEvidenceTestContext();

  await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: validEvidencePayload,
  });

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer other-buyer-token',
    },
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
});

test('anonymous delivery evidence request is denied', async () => {
  const { server } = await createDeliveryEvidenceTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
  });

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
});

test('invalid delivery evidence payload is rejected with the standard envelope', async () => {
  const { server } = await createDeliveryEvidenceTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: {
      evidenceType: 'unsupportedProof',
      evidenceHash: 'not-a-hash',
    },
  });

  const body = response.json();
  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.issues.some((issue: { path: string }) => issue.path === 'evidenceType'));
  assert.ok(body.error.details.issues.some((issue: { path: string }) => issue.path === 'evidenceReference'));
  assert.ok(body.error.details.issues.some((issue: { path: string }) => issue.path === 'evidenceHash'));
});

test('missing order returns not found', async () => {
  const { server } = await createDeliveryEvidenceTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders/missing-order/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: validEvidencePayload,
  });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.json().error.code, 'NOT_FOUND');
});

test('anchor failure does not delete delivery evidence', async () => {
  const { server, evidenceRepository } = await createDeliveryEvidenceTestContext({
    gateway: new InMemoryBlockchainAnchorGateway({ unavailable: true }),
  });

  const createResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/orders/order-delivery-1/delivery-evidence',
    headers: {
      authorization: 'Bearer supplier-token',
    },
    payload: validEvidencePayload,
  });

  assert.strictEqual(createResponse.statusCode, 201);
  const createBody = createResponse.json();
  assert.strictEqual(createBody.data.blockchainAnchor.anchorStatus, 'failed');
  assert.strictEqual(createBody.data.blockchainAnchor.failureReason, 'blockchain_unavailable');

  const stored = await evidenceRepository.listByOrderId('order-delivery-1');
  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].evidenceId, createBody.data.evidenceId);
});
