import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryProcureToPayLifecycleEventRepository } from './in-memory-procure-to-pay-lifecycle-event-repository.js';
import { createProcureToPayLifecycleEvent } from '../application/procure-to-pay-lifecycle-event-builder.js';
import { ProcureToPayLifecyclePersistenceError } from './in-memory-procure-to-pay-lifecycle-event-repository.js';

describe('InMemoryProcureToPayLifecycleEventRepository', () => {
  it('repository is append-only and defensive-copy safe', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    });

    const savedEvent1 = await repository.save(event1);
    
    // Mutate the returned event
    savedEvent1.targetId = 'mutated-id';
    
    // Save another event
    const event2 = createProcureToPayLifecycleEvent({
      requestId: 'req-456',
      correlationId: 'corr-789',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-def',
      targetType: 'delivery',
      targetId: 'del-ghi',
      outcome: 'success'
    });

    const savedEvent2 = await repository.save(event2);
    
    // List events
    const events = await repository.list();
    
    // Verify we have 2 events
    assert.strictEqual(events.length, 2);
    
    // Verify the first event wasn't mutated
    assert.strictEqual(events[0].targetId, 'po-def');
    
    // Verify the second event is correct
    assert.strictEqual(events[1].targetId, 'del-ghi');
    
    // Mutate the list
    events[0] = events[1];
    
    // List again to verify internal storage wasn't affected
    const events2 = await repository.list();
    assert.strictEqual(events2[0].targetId, 'po-def');
  });

  it('multiple saves preserve both events rather than overwriting', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    });

    const event2 = createProcureToPayLifecycleEvent({
      requestId: 'req-456',
      correlationId: 'corr-789',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-def',
      targetType: 'delivery',
      targetId: 'del-ghi',
      outcome: 'success'
    });

    await repository.save(event1);
    await repository.save(event2);
    
    const events = await repository.list();
    
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].targetId, 'po-def');
    assert.strictEqual(events[1].targetId, 'del-ghi');
  });

  it('valid write remains successful', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    });

    const savedEvent = await repository.save(event);
    assert.ok(savedEvent);
    assert.strictEqual(savedEvent.targetId, 'po-def');
  });

  it('duplicate eventId is rejected', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'test-event-id',
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    });

    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'test-event-id', // Same eventId
      requestId: 'req-456',
      correlationId: 'corr-789',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-def',
      targetType: 'delivery',
      targetId: 'del-ghi',
      outcome: 'success'
    });

    await repository.save(event1);
    
    await assert.rejects(
      async () => await repository.save(event2),
      (err: any) => {
        return err instanceof ProcureToPayLifecyclePersistenceError && 
               err.reason === 'duplicateEventId';
      }
    );
  });

  it('duplicate payloadHash is rejected', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    const fixedOccurredAt = '2026-03-15T02:00:00.000Z';
    const fixedRecordedAt = '2026-03-15T02:00:01.000Z';
    
    const event1 = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success',
      occurredAt: fixedOccurredAt,
      recordedAt: fixedRecordedAt
    });

    // Create identical event with different eventId
    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'different-event-id',
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success',
      occurredAt: fixedOccurredAt,
      recordedAt: fixedRecordedAt
    });

    await repository.save(event1);
    
    await assert.rejects(
      async () => await repository.save(event2),
      (err: any) => {
        return err instanceof ProcureToPayLifecyclePersistenceError && 
               err.reason === 'duplicatePayloadHash';
      }
    );
  });

  it('first event may omit previousEventHash', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
      // No previousEventHash
    });

    const savedEvent = await repository.save(event);
    assert.ok(savedEvent);
  });

  it('chained event with matching previousEventHash, same caseId, same correlationId succeeds', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    });

    const savedEvent1 = await repository.save(event1);
    
    const event2 = createProcureToPayLifecycleEvent({
      requestId: 'req-456',
      correlationId: 'corr-456', // Same correlationId
      caseId: 'ptp-case-789',     // Same caseId
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-def',
      targetType: 'delivery',
      targetId: 'del-ghi',
      outcome: 'success',
      previousEventHash: savedEvent1.immutableReference.payloadHash // Valid previous hash
    });

    const savedEvent2 = await repository.save(event2);
    assert.ok(savedEvent2);
  });

  it('previousEventHash not found is rejected', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success',
      previousEventHash: 'non-existent-hash'
    });

    await assert.rejects(
      async () => await repository.save(event),
      (err: any) => {
        return err instanceof ProcureToPayLifecyclePersistenceError && 
               err.reason === 'previousEventHashNotFound';
      }
    );
  });

  it('previousEventHash from another caseId or correlationId is rejected', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    });

    const savedEvent1 = await repository.save(event1);
    
    const event2 = createProcureToPayLifecycleEvent({
      requestId: 'req-456',
      correlationId: 'different-corr', // Different correlationId
      caseId: 'ptp-case-789',          // Same caseId
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-def',
      targetType: 'delivery',
      targetId: 'del-ghi',
      outcome: 'success',
      previousEventHash: savedEvent1.immutableReference.payloadHash
    });

    await assert.rejects(
      async () => await repository.save(event2),
      (err: any) => {
        return err instanceof ProcureToPayLifecyclePersistenceError && 
               err.reason === 'previousEventHashCorrelationMismatch';
      }
    );
  });

  it('append-only behavior still preserves multiple valid events', async () => {
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-1',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success'
    });

    const event2 = createProcureToPayLifecycleEvent({
      requestId: 'req-2',
      correlationId: 'corr-2',
      caseId: 'ptp-case-2',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-2',
      targetType: 'delivery',
      targetId: 'del-2',
      outcome: 'success'
    });

    const savedEvent1 = await repository.save(event1);
    const savedEvent2 = await repository.save(event2);
    
    const events = await repository.list();
    
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].eventId, savedEvent1.eventId);
    assert.strictEqual(events[1].eventId, savedEvent2.eventId);
  });
});
