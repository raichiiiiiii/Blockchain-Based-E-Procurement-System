import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryProcureToPayLifecycleEventRepository } from './in-memory-procure-to-pay-lifecycle-event-repository.js';
import { createProcureToPayLifecycleEvent } from '../application/procure-to-pay-lifecycle-event-builder.js';

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
});
