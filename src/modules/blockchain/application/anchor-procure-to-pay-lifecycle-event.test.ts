import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createProcureToPayLifecycleEvent } from '../../procurement/application/procure-to-pay-lifecycle-event-builder.js';
import { InMemoryBlockchainAnchorGateway } from '../infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import {
  anchorProcureToPayLifecycleEvent,
  blockchainAnchorHashing,
} from './anchor-procure-to-pay-lifecycle-event.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPayLifecycleEvent } from '../../procurement/application/record-procure-to-pay-lifecycle-event.js';

describe('anchorProcureToPayLifecycleEvent', () => {
  it('anchors lifecycle event proof metadata without exposing raw case id', async () => {
    const event = createProcureToPayLifecycleEvent({
      eventId: 'ptp-event-001',
      requestId: 'req-001',
      correlationId: 'corr-001',
      caseId: 'case-sensitive-business-id',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderAccepted',
      actorUserId: 'buyer-user',
      targetType: 'purchaseOrder',
      targetId: 'po-001',
      outcome: 'success',
      occurredAt: '2026-05-25T04:00:00.000Z',
      recordedAt: '2026-05-25T04:00:05.000Z',
    });
    const gateway = new InMemoryBlockchainAnchorGateway({
      now: () => '2026-05-25T04:01:00.000Z',
    });
    const metadataRepository = new InMemoryBlockchainAnchorMetadataRepository();

    const metadata = await anchorProcureToPayLifecycleEvent(event, {
      gateway,
      metadataRepository,
      now: () => '2026-05-25T04:01:05.000Z',
    });

    assert.ok(metadata);
    assert.strictEqual(metadata.anchorStatus, 'anchored');
    assert.match(metadata.payloadHash, /^sha256:[a-f0-9]{64}$/);
    assert.match(metadata.caseIdHash ?? '', /^sha256:[a-f0-9]{64}$/);
    assert.notStrictEqual(metadata.caseIdHash, 'case-sensitive-business-id');
    assert.strictEqual(metadata.transactionId, undefined);

    const stored = await metadataRepository.findByEventId('ptp-event-001');
    assert.strictEqual(stored?.anchorStatus, 'anchored');
  });

  it('keeps the lifecycle event persisted when anchoring fails', async () => {
    const lifecycleRepository = new InMemoryProcureToPayLifecycleEventRepository();
    const metadataRepository = new InMemoryBlockchainAnchorMetadataRepository();
    const gateway = new InMemoryBlockchainAnchorGateway({
      unavailable: true,
    });

    const event = await recordProcureToPayLifecycleEvent(
      lifecycleRepository,
      {
        eventId: 'ptp-event-failed-anchor',
        requestId: 'req-001',
        correlationId: 'corr-001',
        caseId: 'ptp-case-001',
        lifecycleStage: 'purchaseOrder',
        eventType: 'purchaseOrderAccepted',
        actorUserId: 'buyer-user',
        targetType: 'purchaseOrder',
        targetId: 'po-001',
        outcome: 'success',
        occurredAt: '2026-05-25T04:00:00.000Z',
        recordedAt: '2026-05-25T04:00:05.000Z',
      },
      {
        gateway,
        metadataRepository,
        now: () => '2026-05-25T04:01:05.000Z',
      },
    );

    const lifecycleEvents = await lifecycleRepository.list();
    const metadata = await metadataRepository.findByEventId('ptp-event-failed-anchor');

    assert.ok(event);
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0]?.eventId, 'ptp-event-failed-anchor');
    assert.strictEqual(metadata?.anchorStatus, 'failed');
    assert.strictEqual(metadata?.failureReason, 'blockchain_unavailable');
  });

  it('normalizes existing lifecycle hashes for blockchain input', () => {
    const hexHash = 'a'.repeat(64);

    assert.strictEqual(
      blockchainAnchorHashing.toBlockchainHash(hexHash),
      `sha256:${hexHash}`,
    );
    assert.strictEqual(
      blockchainAnchorHashing.toBlockchainHash(`sha256:${hexHash}`),
      `sha256:${hexHash}`,
    );
  });
});
