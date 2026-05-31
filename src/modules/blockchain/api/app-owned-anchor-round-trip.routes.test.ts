import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { registerBlockchainAnchorRoutes } from './blockchain-anchor.routes.js';
import { registerEscrowRoutes } from '../../escrow/api/escrow.routes.js';
import { InMemoryBlockchainAnchorGateway } from '../infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import { InMemoryEscrowRepository } from '../../escrow/infrastructure/in-memory-escrow-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcurementOrderRepository } from '../../procurement/infrastructure/in-memory-procurement-order-repository.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';

const changedPayloadHash = `sha256:${'3'.repeat(64)}`;

function buyerHeaders(): Record<string, string> {
  return {
    'x-actor-id': 'buyer-user-1',
    'x-actor-org': 'org-buyer-1',
    'x-actor-role': 'buyer',
  };
}

function proofReaderHeaders(): Record<string, string> {
  return {
    'x-actor-id': 'auditor-user-1',
    'x-actor-role': 'auditor',
  };
}

function acceptedOrder(): ProcurementOrder {
  return {
    orderId: 'order-app-owned-anchor-1',
    buyerOrganizationId: 'org-buyer-1',
    supplierOrganizationId: 'org-supplier-1',
    title: 'Accepted procurement order for app-owned anchor test',
    amount: '12000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'buyer-user-1',
    createdAt: '2026-05-24T10:00:00.000Z',
    updatedAt: '2026-05-24T11:00:00.000Z',
    acceptedBy: 'supplier-user-1',
    acceptedAt: '2026-05-24T11:00:00.000Z',
    lifecycleEventIds: ['order-accepted-event'],
  };
}

function escrowPayload() {
  return {
    orderId: 'order-app-owned-anchor-1',
    buyerOrganizationId: 'org-buyer-1',
    supplierOrganizationId: 'org-supplier-1',
    financierOrganizationId: 'org-financier-1',
    termsHash: `sha256:${'4'.repeat(64)}`,
    acceptedOrderReference: 'accepted-order-app-owned-anchor-1',
  };
}

async function createApp(options?: {
  gateway?: InMemoryBlockchainAnchorGateway;
}) {
  const app = fastify();
  const gateway = options?.gateway ?? new InMemoryBlockchainAnchorGateway({
    now: () => '2026-05-31T09:05:00.000Z',
  });
  const metadataRepository = new InMemoryBlockchainAnchorMetadataRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
  const escrowRepository = new InMemoryEscrowRepository();
  const orderRepository = new InMemoryProcurementOrderRepository();
  await orderRepository.save(acceptedOrder());

  app.register(actorContextPlugin);
  app.register(registerEscrowRoutes, {
    prefix: '/api/v1',
    escrowRepository,
    lifecycleEventRepository,
    blockchainAnchorGateway: gateway,
    blockchainAnchorMetadataRepository: metadataRepository,
    orderRepository,
  });
  app.register(registerBlockchainAnchorRoutes, {
    prefix: '/api/v1',
    gateway,
    metadataRepository,
  });
  await app.ready();

  return {
    app,
    lifecycleEventRepository,
    metadataRepository,
  };
}

describe('app-owned blockchain anchor round trip', () => {
  it('creates escrowCreated lifecycle proof metadata and verifies the same app-created anchor', async () => {
    const { app, lifecycleEventRepository, metadataRepository } = await createApp();

    const createEscrowResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/escrows',
      headers: buyerHeaders(),
      payload: escrowPayload(),
    });

    assert.strictEqual(createEscrowResponse.statusCode, 201);
    const createEscrowBody = JSON.parse(createEscrowResponse.body);
    const eventId = createEscrowBody.data.lifecycleEventId as string;
    assert.ok(eventId);
    assert.strictEqual(createEscrowBody.data.blockchainAnchor.anchorStatus, 'anchored');

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].eventId, eventId);
    assert.strictEqual(lifecycleEvents[0].eventType, 'escrowCreated');

    const storedMetadata = await metadataRepository.findByEventId(eventId);
    assert.strictEqual(storedMetadata?.anchorStatus, 'anchored');
    assert.match(storedMetadata?.payloadHash ?? '', /^sha256:[a-f0-9]{64}$/);

    const proofLookupResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/blockchain/anchors/${eventId}`,
      headers: proofReaderHeaders(),
    });
    assert.strictEqual(proofLookupResponse.statusCode, 200);
    const proofLookupBody = JSON.parse(proofLookupResponse.body);
    assert.strictEqual(proofLookupBody.data.anchorStatus, 'anchored');
    assert.strictEqual(proofLookupBody.data.payloadHash, storedMetadata?.payloadHash);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/blockchain/anchors/${eventId}/verify`,
      headers: proofReaderHeaders(),
      payload: {
        payloadHash: proofLookupBody.data.payloadHash,
      },
    });
    assert.strictEqual(verifyResponse.statusCode, 200);
    const verifyBody = JSON.parse(verifyResponse.body);
    assert.strictEqual(verifyBody.data.verificationStatus, 'verified');
    assert.strictEqual(verifyBody.data.anchoredPayloadHash, proofLookupBody.data.payloadHash);

    const mismatchResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/blockchain/anchors/${eventId}/verify`,
      headers: proofReaderHeaders(),
      payload: {
        payloadHash: changedPayloadHash,
      },
    });
    assert.strictEqual(JSON.parse(mismatchResponse.body).data.verificationStatus, 'mismatch');

    const notFoundResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/blockchain/anchors/missing-app-owned-event/verify',
      headers: proofReaderHeaders(),
      payload: {
        payloadHash: proofLookupBody.data.payloadHash,
      },
    });
    assert.strictEqual(JSON.parse(notFoundResponse.body).data.verificationStatus, 'notFound');
  });

  it('keeps escrow and lifecycle event persisted when anchoring fails', async () => {
    const { app, lifecycleEventRepository, metadataRepository } = await createApp({
      gateway: new InMemoryBlockchainAnchorGateway({ unavailable: true }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/escrows',
      headers: buyerHeaders(),
      payload: escrowPayload(),
    });

    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.body);
    const eventId = body.data.lifecycleEventId as string;
    assert.strictEqual(body.data.status, 'escrowCreated');
    assert.strictEqual(body.data.blockchainAnchor.anchorStatus, 'failed');

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].eventId, eventId);

    const storedMetadata = await metadataRepository.findByEventId(eventId);
    assert.strictEqual(storedMetadata?.anchorStatus, 'failed');
    assert.strictEqual(storedMetadata?.failureReason, 'blockchain_unavailable');
  });
});
