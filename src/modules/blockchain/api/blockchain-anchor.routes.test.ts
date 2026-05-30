import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { registerBlockchainAnchorRoutes } from './blockchain-anchor.routes.js';
import { InMemoryBlockchainAnchorGateway } from '../infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import type { BlockchainAnchorMetadata } from '../application/blockchain-anchor-metadata-repository.js';
import type { OnChainAnchorRecord } from '../application/blockchain-anchor-gateway.js';

const caseIdHash = `sha256:${'a'.repeat(64)}`;
const payloadHash = `sha256:${'1'.repeat(64)}`;
const changedPayloadHash = `sha256:${'2'.repeat(64)}`;

function authorizedHeaders(role = 'auditor'): Record<string, string> {
  return {
    'x-actor-id': `${role}-user`,
    'x-actor-role': role,
  };
}

function anchoredMetadata(overrides: Partial<BlockchainAnchorMetadata> = {}): BlockchainAnchorMetadata {
  return {
    eventId: 'event-anchored',
    payloadHash,
    caseIdHash,
    anchorStatus: 'anchored',
    blockchainNetwork: 'fabric-local',
    channelName: 'procurement-channel',
    chaincodeName: 'audit-anchor',
    transactionId: 'fabric-tx-123',
    blockNumber: '42',
    anchoredAt: '2026-05-25T04:01:00.000Z',
    createdAt: '2026-05-25T04:01:05.000Z',
    updatedAt: '2026-05-25T04:01:05.000Z',
    ...overrides,
  };
}

function onChainRecord(overrides: Partial<OnChainAnchorRecord> = {}): OnChainAnchorRecord {
  return {
    eventId: 'event-anchored',
    caseIdHash,
    eventType: 'purchaseOrderAccepted',
    payloadHash,
    schemaVersion: 'procure-to-pay-lifecycle-event.v1',
    canonicalization: 'json-canonical-v1',
    occurredAt: '2026-05-25T04:00:00.000Z',
    anchoredAt: '2026-05-25T04:01:00.000Z',
    ...overrides,
  };
}

async function createApp(options?: {
  metadataRepository?: InMemoryBlockchainAnchorMetadataRepository;
  gateway?: InMemoryBlockchainAnchorGateway;
}) {
  const app = fastify();
  app.register(actorContextPlugin);
  app.register(registerBlockchainAnchorRoutes, {
    metadataRepository: options?.metadataRepository,
    gateway: options?.gateway,
  });
  await app.ready();
  return app;
}

describe('Blockchain anchor routes', () => {
  it('returns notAnchored when no proof metadata exists', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository(),
      gateway: new InMemoryBlockchainAnchorGateway(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/blockchain/anchors/missing-event',
      headers: authorizedHeaders(),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(body.data, {
      eventId: 'missing-event',
      anchorStatus: 'notAnchored',
    });
  });

  it('returns anchored proof metadata without fabricating unavailable fields', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([
        anchoredMetadata({
          transactionId: undefined,
          blockNumber: undefined,
        }),
      ]),
      gateway: new InMemoryBlockchainAnchorGateway(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/blockchain/anchors/event-anchored',
      headers: authorizedHeaders('securityOperator'),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.data.anchorStatus, 'anchored');
    assert.strictEqual(body.data.payloadHash, payloadHash);
    assert.strictEqual(body.data.channelName, 'procurement-channel');
    assert.strictEqual(body.data.transactionId, undefined);
    assert.strictEqual(body.data.blockNumber, undefined);
  });

  it('allows regulator reporting users to inspect proof metadata read-only', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([anchoredMetadata()]),
      gateway: new InMemoryBlockchainAnchorGateway(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/blockchain/anchors/event-anchored',
      headers: authorizedHeaders('regulator'),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.data.eventId, 'event-anchored');
    assert.strictEqual(body.data.anchorStatus, 'anchored');
  });

  it('verifies a matching proof through the gateway', async () => {
    const gateway = new InMemoryBlockchainAnchorGateway({
      seedRecords: [onChainRecord()],
    });
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([anchoredMetadata()]),
      gateway,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/blockchain/anchors/event-anchored/verify',
      headers: authorizedHeaders(),
      payload: {
        payloadHash,
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.data.verificationStatus, 'verified');
    assert.strictEqual(body.data.anchoredPayloadHash, payloadHash);
  });

  it('returns mismatch for a different submitted payload hash', async () => {
    const gateway = new InMemoryBlockchainAnchorGateway({
      seedRecords: [onChainRecord()],
    });
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([anchoredMetadata()]),
      gateway,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/blockchain/anchors/event-anchored/verify',
      headers: authorizedHeaders(),
      payload: {
        payloadHash: changedPayloadHash,
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.data.verificationStatus, 'mismatch');
    assert.strictEqual(body.data.submittedPayloadHash, changedPayloadHash);
    assert.strictEqual(body.data.anchoredPayloadHash, payloadHash);
  });

  it('returns notFound when the gateway has no anchor for the event', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository(),
      gateway: new InMemoryBlockchainAnchorGateway(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/blockchain/anchors/missing-event/verify',
      headers: authorizedHeaders(),
      payload: {
        payloadHash,
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.data.verificationStatus, 'notFound');
    assert.strictEqual(body.data.anchoredPayloadHash, undefined);
  });

  it('returns unavailable when verification cannot reach a gateway', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([anchoredMetadata()]),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/blockchain/anchors/event-anchored/verify',
      headers: authorizedHeaders(),
      payload: {
        payloadHash,
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.data.verificationStatus, 'unavailable');
    assert.strictEqual(body.data.anchoredPayloadHash, undefined);
  });

  it('rejects roles outside proof review access', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([anchoredMetadata()]),
      gateway: new InMemoryBlockchainAnchorGateway(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/blockchain/anchors/event-anchored',
      headers: authorizedHeaders('buyer'),
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(body.error.code, 'FORBIDDEN');
    assert.strictEqual(body.data, undefined);
  });

  it('rejects blank verification payload hash', async () => {
    const app = await createApp({
      metadataRepository: new InMemoryBlockchainAnchorMetadataRepository([anchoredMetadata()]),
      gateway: new InMemoryBlockchainAnchorGateway(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/blockchain/anchors/event-anchored/verify',
      headers: authorizedHeaders(),
      payload: {
        payloadHash: '   ',
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.issues.some((issue: { path: string }) => issue.path === 'payloadHash'));
  });
});
