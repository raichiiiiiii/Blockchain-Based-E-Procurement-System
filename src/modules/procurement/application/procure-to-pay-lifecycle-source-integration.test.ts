import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  recordProcureToPaySourceEvent,
  ProcureToPayLifecycleSourceMappingError
} from './procure-to-pay-lifecycle-source-integration.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { ProcureToPayLifecyclePersistenceError } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';

describe('procure-to-pay-lifecycle-source-integration', () => {
  it('purchase order source emits purchaseOrder lifecycle event with targetType purchaseOrder', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'po-def',
      sourceAction: 'purchaseOrderCreated',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.lifecycleStage, 'purchaseOrder');
    assert.strictEqual(result.eventType, 'purchaseOrderCreated');
    assert.strictEqual(result.targetType, 'purchaseOrder');
    assert.strictEqual(result.targetId, 'po-def');
  });

  it('delivery source emits delivery lifecycle event with targetType delivery', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'del-def',
      sourceAction: 'deliveryRecorded',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.lifecycleStage, 'delivery');
    assert.strictEqual(result.eventType, 'deliveryRecorded');
    assert.strictEqual(result.targetType, 'delivery');
    assert.strictEqual(result.targetId, 'del-def');
  });

  it('invoice source emits invoice lifecycle event with targetType invoice', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'inv-def',
      sourceAction: 'invoiceIssued',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.lifecycleStage, 'invoice');
    assert.strictEqual(result.eventType, 'invoiceIssued');
    assert.strictEqual(result.targetType, 'invoice');
    assert.strictEqual(result.targetId, 'inv-def');
  });

  it('settlement source emits settlement lifecycle event with targetType settlement', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'set-def',
      sourceAction: 'settlementInitiated',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.lifecycleStage, 'settlement');
    assert.strictEqual(result.eventType, 'settlementInitiated');
    assert.strictEqual(result.targetType, 'settlement');
    assert.strictEqual(result.targetId, 'set-def');
  });

  it('escrow source emits escrow lifecycle event with targetType escrow', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'accepted-order-demo-123',
      caseId: 'order-123',
      sourceId: 'escrow-def',
      sourceAction: 'escrowCreated',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.lifecycleStage, 'escrow');
    assert.strictEqual(result.eventType, 'escrowCreated');
    assert.strictEqual(result.targetType, 'escrow');
    assert.strictEqual(result.targetId, 'escrow-def');
  });

  it('requestId, actorUserId, correlationId, caseId, lifecycleStage, eventType, targetType, targetId are mapped correctly', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-test',
      actorUserId: 'user-test',
      correlationId: 'corr-test',
      caseId: 'ptp-case-test',
      sourceId: 'po-test',
      sourceAction: 'purchaseOrderCreated',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.requestId, 'req-test');
    assert.strictEqual(result.actorUserId, 'user-test');
    assert.strictEqual(result.correlationId, 'corr-test');
    assert.strictEqual(result.caseId, 'ptp-case-test');
    assert.strictEqual(result.lifecycleStage, 'purchaseOrder');
    assert.strictEqual(result.eventType, 'purchaseOrderCreated');
    assert.strictEqual(result.targetType, 'purchaseOrder');
    assert.strictEqual(result.targetId, 'po-test');
  });

  it('immutableReference payloadHash/canonicalization is generated through the existing write path', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'po-def',
      sourceAction: 'purchaseOrderCreated',
      outcome: 'success'
    });

    assert.ok(result);
    assert.ok(result.immutableReference.payloadHash);
    assert.strictEqual(result.immutableReference.canonicalization, 'json-stable-v1');
  });

  it('sourcePayloadRef/sourceRecordRef/previousEventHash are preserved when provided', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const previousEvent = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-prev',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceAction: 'purchaseOrderCreated',
      sourceId: 'po-prev',
      outcome: 'success'
    });

    if (previousEvent === null) {
      assert.fail('Expected previous event to be recorded');
    }

    const event = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceAction: 'deliveryRecorded',
      sourceId: 'del-def',
      outcome: 'success',
      previousEventHash: previousEvent.immutableReference.payloadHash,
      sourcePayloadRef: 'source-payload-ref',
      sourceRecordRef: 'source-record-ref'
    });

    if (event === null) {
      assert.fail('Expected chained event to be recorded');
    }

    assert.strictEqual(
      event.immutableReference.previousEventHash,
      previousEvent.immutableReference.payloadHash
    );
    assert.strictEqual(event.immutableReference.sourcePayloadRef, 'source-payload-ref');
    assert.strictEqual(event.immutableReference.sourceRecordRef, 'source-record-ref');
  });

  it('unsupported source/action is rejected', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const invalidInput = {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'po-def',
      sourceAction: 'invalidAction',
      outcome: 'success'
    };

    await assert.rejects(
      async () => {
        await recordProcureToPaySourceEvent(
          repository,
          invalidInput as unknown as Parameters<typeof recordProcureToPaySourceEvent>[1]
        );
      },
      ProcureToPayLifecycleSourceMappingError
    );
  });

  it('blank sourceId/targetId is rejected', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    await assert.rejects(
      async () => {
        await recordProcureToPaySourceEvent(repository, {
          requestId: 'req-123',
          actorUserId: 'user-abc',
          correlationId: 'corr-456',
          caseId: 'ptp-case-789',
          sourceId: '',
          sourceAction: 'purchaseOrderCreated',
          outcome: 'success'
        });
      },
      ProcureToPayLifecycleSourceMappingError
    );
  });

  it('invalid correlation/missing caseId still rejects through existing validation', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    await assert.rejects(
      async () => {
        await recordProcureToPaySourceEvent(repository, {
          requestId: 'req-123',
          actorUserId: 'user-abc',
          correlationId: '',
          caseId: 'ptp-case-789',
          sourceId: 'po-def',
          sourceAction: 'purchaseOrderCreated',
          outcome: 'success'
        });
      },
      (err: unknown) => {
        return err instanceof Error && err.name !== 'ProcureToPayLifecycleSourceMappingError';
      }
    );
  });

  it('repository append-only/duplicate safeguards still propagate through the source integration seam', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const sourceInput = {
      requestId: 'req-duplicate',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceAction: 'purchaseOrderCreated' as const,
      sourceId: 'po-duplicate',
      outcome: 'success' as const,
      occurredAt: '2026-04-22T10:30:00.000Z',
      recordedAt: '2026-04-22T10:30:05.000Z'
    };

    await recordProcureToPaySourceEvent(repository, sourceInput);

    await assert.rejects(
      async () => {
        await recordProcureToPaySourceEvent(repository, sourceInput);
      },
      ProcureToPayLifecyclePersistenceError
    );
  });

  it('valid write remains successful after source integration', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const result = await recordProcureToPaySourceEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'po-def',
      sourceAction: 'purchaseOrderCreated',
      outcome: 'success'
    });

    assert.ok(result);
    assert.strictEqual(result.targetId, 'po-def');
    assert.strictEqual(result.eventType, 'purchaseOrderCreated');
  });

  it('returns null when repository is undefined', async () => {
    const result = await recordProcureToPaySourceEvent(undefined, {
      requestId: 'req-123',
      actorUserId: 'user-abc',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      sourceId: 'po-def',
      sourceAction: 'purchaseOrderCreated',
      outcome: 'success'
    });

    assert.strictEqual(result, null);
  });
});
