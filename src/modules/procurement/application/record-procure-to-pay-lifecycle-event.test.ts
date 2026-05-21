import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { recordProcureToPayLifecycleEvent } from './record-procure-to-pay-lifecycle-event.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import type { ProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event.js';
import { ProcureToPayLifecyclePersistenceError } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';

describe('recordProcureToPayLifecycleEvent', () => {
  it('returns null when repository is undefined', async () => {
    const result = await recordProcureToPayLifecycleEvent(undefined, {
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

    assert.strictEqual(result, null);
  });

  it('builds and saves event when repository is provided', async () => {
    const mockEvent: ProcureToPayLifecycleEvent = {
      eventId: 'test-event-id',
      schemaVersion: 'procure-to-pay-lifecycle-event.v1',
      occurredAt: '2023-01-01T00:00:00.000Z',
      recordedAt: '2023-01-01T00:00:05.000Z',
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      actorSource: 'actorContext',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success',
      immutableReference: {
        payloadHash: 'test-hash',
        canonicalization: 'json-stable-v1'
      }
    };

    const saveMock = mock.fn(async (): Promise<ProcureToPayLifecycleEvent> => mockEvent);

    const mockRepository: ProcureToPayLifecycleEventRepository = {
      save: saveMock,
      list: async (): Promise<ProcureToPayLifecycleEvent[]> => []
    };

    const result = await recordProcureToPayLifecycleEvent(mockRepository, {
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

    assert.strictEqual(result, mockEvent);
    assert.strictEqual(saveMock.mock.callCount(), 1);
  });

  it('valid event is saved', async () => {
    const mockEvent: ProcureToPayLifecycleEvent = {
      eventId: 'test-event-id',
      schemaVersion: 'procure-to-pay-lifecycle-event.v1',
      occurredAt: '2023-01-01T00:00:00.000Z',
      recordedAt: '2023-01-01T00:00:05.000Z',
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      actorSource: 'actorContext',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success',
      immutableReference: {
        payloadHash: 'test-hash',
        canonicalization: 'json-stable-v1'
      }
    };

    const saveMock = mock.fn(async (): Promise<ProcureToPayLifecycleEvent> => mockEvent);

    const mockRepository: ProcureToPayLifecycleEventRepository = {
      save: saveMock,
      list: async (): Promise<ProcureToPayLifecycleEvent[]> => []
    };

    const result = await recordProcureToPayLifecycleEvent(mockRepository, {
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

    assert.strictEqual(result, mockEvent);
    assert.strictEqual(saveMock.mock.callCount(), 1);
  });

  it('duplicate/invalid persistence error propagates when repository rejects', async () => {
    const saveMock = mock.fn(async () => {
      throw new ProcureToPayLifecyclePersistenceError(
	'duplicateEventId',
	'Duplicate lifecycle event'
      );    
    });

    const mockRepository: ProcureToPayLifecycleEventRepository = {
      save: saveMock,
      list: async (): Promise<ProcureToPayLifecycleEvent[]> => []
    };

    await assert.rejects(
      async () => {
        await recordProcureToPayLifecycleEvent(mockRepository, {
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
      },
      ProcureToPayLifecyclePersistenceError
    );
  });
});
