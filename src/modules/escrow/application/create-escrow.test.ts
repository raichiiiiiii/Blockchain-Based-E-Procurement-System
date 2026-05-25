import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createEscrow } from './create-escrow.js';
import { InMemoryEscrowRepository } from '../infrastructure/in-memory-escrow-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryBlockchainAnchorGateway } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.js';

const validInput = {
  orderId: 'order-123',
  buyerOrganizationId: 'org-buyer-1',
  supplierOrganizationId: 'org-supplier-1',
  financierOrganizationId: 'org-financier-1',
  termsHash: 'sha256:terms-hash',
  acceptedOrderReference: 'accepted-order-demo-123',
  actorUserId: 'buyer-user-1',
  actorRoleCodes: ['buyer'],
  requestId: 'req-123',
};

describe('createEscrow', () => {
  it('creates escrow, emits escrowCreated lifecycle event, and anchors the event hash', async () => {
    const escrowRepository = new InMemoryEscrowRepository();
    const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
    const blockchainAnchorGateway = new InMemoryBlockchainAnchorGateway({
      now: () => '2026-05-25T05:00:00.000Z',
    });
    const blockchainAnchorMetadataRepository = new InMemoryBlockchainAnchorMetadataRepository();

    const result = await createEscrow(validInput, {
      escrowRepository,
      lifecycleEventRepository,
      blockchainAnchorGateway,
      blockchainAnchorMetadataRepository,
      idGenerator: () => 'escrow-123',
      now: () => '2026-05-25T04:59:00.000Z',
    });

    assert.strictEqual(result.status, 'created');
    if (result.status !== 'created') {
      assert.fail('Expected escrow to be created');
    }

    assert.strictEqual(result.escrow.escrowId, 'escrow-123');
    assert.strictEqual(result.escrow.status, 'escrowCreated');
    assert.ok(result.escrow.lifecycleEventId);
    assert.ok(result.escrow.lifecycleEventHash);
    assert.strictEqual(result.escrow.blockchainAnchor?.anchorStatus, 'anchored');

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].lifecycleStage, 'escrow');
    assert.strictEqual(lifecycleEvents[0].eventType, 'escrowCreated');
    assert.strictEqual(lifecycleEvents[0].targetType, 'escrow');
    assert.strictEqual(lifecycleEvents[0].targetId, 'escrow-123');

    const anchorMetadata = await blockchainAnchorMetadataRepository.findByEventId(lifecycleEvents[0].eventId);
    assert.strictEqual(anchorMetadata?.payloadHash, result.escrow.blockchainAnchor?.payloadHash);
  });

  it('rejects invalid input before persisting escrow', async () => {
    const escrowRepository = new InMemoryEscrowRepository();

    const result = await createEscrow(
      {
        ...validInput,
        termsHash: '   ',
      },
      {
        escrowRepository,
        idGenerator: () => 'escrow-123',
      },
    );

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(await escrowRepository.findById('escrow-123'), null);
  });

  it('rejects duplicate active escrow for the same order', async () => {
    const escrowRepository = new InMemoryEscrowRepository();

    const firstResult = await createEscrow(validInput, {
      escrowRepository,
      idGenerator: () => 'escrow-123',
    });
    const secondResult = await createEscrow(validInput, {
      escrowRepository,
      idGenerator: () => 'escrow-456',
    });

    assert.strictEqual(firstResult.status, 'created');
    assert.strictEqual(secondResult.status, 'duplicateActiveEscrow');
  });

  it('keeps escrow created when blockchain anchoring is unavailable', async () => {
    const escrowRepository = new InMemoryEscrowRepository();
    const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
    const blockchainAnchorGateway = new InMemoryBlockchainAnchorGateway({ unavailable: true });
    const blockchainAnchorMetadataRepository = new InMemoryBlockchainAnchorMetadataRepository();

    const result = await createEscrow(validInput, {
      escrowRepository,
      lifecycleEventRepository,
      blockchainAnchorGateway,
      blockchainAnchorMetadataRepository,
      idGenerator: () => 'escrow-123',
    });

    assert.strictEqual(result.status, 'created');
    if (result.status !== 'created') {
      assert.fail('Expected escrow to remain created when anchoring fails');
    }

    assert.strictEqual(result.escrow.status, 'escrowCreated');
    assert.strictEqual(result.escrow.blockchainAnchor?.anchorStatus, 'failed');
    assert.strictEqual(result.escrow.blockchainAnchor?.failureReason, 'blockchain_unavailable');
  });

  it('rejects unauthenticated and non-buyer create attempts', async () => {
    const escrowRepository = new InMemoryEscrowRepository();

    const unauthenticated = await createEscrow(
      {
        ...validInput,
        actorUserId: undefined,
      },
      { escrowRepository },
    );
    const forbidden = await createEscrow(
      {
        ...validInput,
        actorRoleCodes: ['auditor'],
      },
      { escrowRepository },
    );

    assert.strictEqual(unauthenticated.status, 'unauthorized');
    assert.strictEqual(forbidden.status, 'forbidden');
  });
});
