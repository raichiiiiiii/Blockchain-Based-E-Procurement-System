import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { registerEscrowRoutes } from './escrow.routes.js';
import { InMemoryEscrowRepository } from '../infrastructure/in-memory-escrow-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcurementOrderRepository } from '../../procurement/infrastructure/in-memory-procurement-order-repository.js';
import type { ProcurementEligibilityGateway } from '../../procurement/application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';
import { InMemoryBlockchainAnchorGateway } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.js';

function buyerHeaders(): Record<string, string> {
  return {
    'x-actor-id': 'buyer-user-1',
    'x-actor-role': 'buyer',
  };
}

function validPayload() {
  return {
    orderId: 'order-123',
    buyerOrganizationId: 'org-buyer-1',
    supplierOrganizationId: 'org-supplier-1',
    financierOrganizationId: 'org-financier-1',
    termsHash: 'sha256:terms-hash',
    acceptedOrderReference: 'accepted-order-demo-123',
  };
}

function acceptedOrder(overrides: Partial<ProcurementOrder> = {}): ProcurementOrder {
  return {
    orderId: 'order-123',
    buyerOrganizationId: 'org-buyer-1',
    supplierOrganizationId: 'org-supplier-1',
    title: 'Accepted procurement order',
    amount: '12000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'buyer-user-1',
    createdAt: '2026-05-24T10:00:00.000Z',
    updatedAt: '2026-05-24T11:00:00.000Z',
    acceptedBy: 'supplier-user-1',
    acceptedAt: '2026-05-24T11:00:00.000Z',
    lifecycleEventIds: ['order-accepted-event'],
    ...overrides,
  };
}

function authenticatedBuyerPreHandler(
  organizationId = 'org-buyer-1',
): (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> {
  return async (request) => {
    request.actorContext = {
      userId: 'buyer-user-1',
      authorizationContext: {
        roles: ['buyer'],
      },
      isAuthenticated: true,
      actorUserId: 'buyer-user-1',
      actorOrganizationId: organizationId,
      actorRoleCodes: ['buyer'],
      authenticationSessionId: 'session-escrow-test',
      authenticationMethod: 'localPassword',
    };
  };
}

async function createApp(options?: {
  gateway?: InMemoryBlockchainAnchorGateway;
  orderRepository?: ProcurementOrderRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
}) {
  const app = fastify();
  app.register(actorContextPlugin);
  app.register(registerEscrowRoutes, {
    escrowRepository: new InMemoryEscrowRepository(),
    lifecycleEventRepository: new InMemoryProcureToPayLifecycleEventRepository(),
    blockchainAnchorGateway: options?.gateway ?? new InMemoryBlockchainAnchorGateway(),
    blockchainAnchorMetadataRepository: new InMemoryBlockchainAnchorMetadataRepository(),
    orderRepository: options?.orderRepository,
    eligibilityGateway: options?.eligibilityGateway,
    authenticatedPreHandler: options?.authenticatedPreHandler,
  });
  await app.ready();
  return app;
}

describe('Escrow routes', () => {
  it('creates and retrieves escrow for an authenticated buyer', async () => {
    const app = await createApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createBody = JSON.parse(createResponse.body);
    assert.strictEqual(createBody.data.status, 'escrowCreated');
    assert.strictEqual(createBody.data.orderId, 'order-123');
    assert.ok(createBody.data.lifecycleEventId);
    assert.ok(createBody.data.lifecycleEventHash);
    assert.strictEqual(createBody.data.blockchainAnchor.anchorStatus, 'anchored');
    assert.strictEqual(createBody.data.rawTerms, undefined);

    const getResponse = await app.inject({
      method: 'GET',
      url: `/escrows/${createBody.data.escrowId}`,
      headers: buyerHeaders(),
    });

    assert.strictEqual(getResponse.statusCode, 200);
    const getBody = JSON.parse(getResponse.body);
    assert.strictEqual(getBody.data.escrowId, createBody.data.escrowId);
    assert.strictEqual(getBody.data.termsHash, 'sha256:terms-hash');
  });

  it('allows auditor and security operator read-only escrow retrieval while denying unrelated roles', async () => {
    const app = await createApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });
    const createBody = JSON.parse(createResponse.body);

    const auditorResponse = await app.inject({
      method: 'GET',
      url: `/escrows/${createBody.data.escrowId}`,
      headers: {
        'x-actor-id': 'auditor-user-1',
        'x-actor-role': 'auditor',
      },
    });
    const securityResponse = await app.inject({
      method: 'GET',
      url: `/escrows/${createBody.data.escrowId}`,
      headers: {
        'x-actor-id': 'security-user-1',
        'x-actor-role': 'securityOperator',
      },
    });
    const supplierResponse = await app.inject({
      method: 'GET',
      url: `/escrows/${createBody.data.escrowId}`,
      headers: {
        'x-actor-id': 'supplier-user-1',
        'x-actor-role': 'supplier',
      },
    });

    assert.strictEqual(auditorResponse.statusCode, 200);
    assert.strictEqual(securityResponse.statusCode, 200);
    assert.strictEqual(supplierResponse.statusCode, 403);
  });

  it('rejects invalid create input', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: {
        ...validPayload(),
        termsHash: '   ',
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.issues.some((issue: { path: string }) => issue.path === 'termsHash'));
  });

  it('rejects unauthenticated create requests', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/escrows',
      payload: validPayload(),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  it('rejects non-buyer create requests', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: {
        'x-actor-id': 'auditor-user-1',
        'x-actor-role': 'auditor',
      },
      payload: validPayload(),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(body.error.code, 'FORBIDDEN');
  });

  it('rejects duplicate active escrow for the same order', async () => {
    const app = await createApp();

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });
    const secondResponse = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });

    const secondBody = JSON.parse(secondResponse.body);
    assert.strictEqual(firstResponse.statusCode, 201);
    assert.strictEqual(secondResponse.statusCode, 409);
    assert.strictEqual(secondBody.error.code, 'CONFLICT');
  });

  it('rejects escrow creation when a persisted order is not accepted', async () => {
    const orderRepository = new InMemoryProcurementOrderRepository();
    await orderRepository.save(acceptedOrder({ status: 'created', acceptedBy: undefined, acceptedAt: undefined }));
    const app = await createApp({
      orderRepository,
      authenticatedPreHandler: authenticatedBuyerPreHandler(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(body.error.code, 'CONFLICT');
    assert.strictEqual(body.error.details.orderStatus, 'created');
  });

  it('rejects escrow creation for non-eligible organizations', async () => {
    const app = await createApp({
      authenticatedPreHandler: authenticatedBuyerPreHandler(),
      eligibilityGateway: {
        async checkOrganizationEligibility(memberOrganizationId) {
          return {
            memberOrganizationId,
            eligibility: memberOrganizationId === 'org-buyer-1' ? 'blocked' : 'eligible',
            reasonCodes: memberOrganizationId === 'org-buyer-1' ? ['sanctions_exposure'] : [],
          };
        },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(body.error.code, 'FORBIDDEN');
    assert.strictEqual(body.error.details.party, 'buyer');
    assert.strictEqual(body.error.details.eligibility, 'blocked');
  });

  it('keeps create response successful when anchoring fails', async () => {
    const app = await createApp({
      gateway: new InMemoryBlockchainAnchorGateway({ unavailable: true }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/escrows',
      headers: buyerHeaders(),
      payload: validPayload(),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(body.data.status, 'escrowCreated');
    assert.strictEqual(body.data.blockchainAnchor.anchorStatus, 'failed');
    assert.strictEqual(body.data.blockchainAnchor.failureReason, 'blockchain_unavailable');
  });
});
