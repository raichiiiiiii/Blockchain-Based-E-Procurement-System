import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { 
  createProcureToPayLifecycleEvent, 
  ProcureToPayLifecycleValidationError 
} from './procure-to-pay-lifecycle-event-builder.js';
import type { ProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event.js';
import type { CreateProcureToPayLifecycleEventInput } from './procure-to-pay-lifecycle-event-builder.js';

describe('createProcureToPayLifecycleEvent', () => {
  it('creates valid purchaseOrder event with approved fields', () => {
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

    assert.strictEqual(typeof event.eventId, 'string');
    assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.strictEqual(event.schemaVersion, 'procure-to-pay-lifecycle-event.v1');
    assert.strictEqual(typeof event.occurredAt, 'string');
    assert.strictEqual(typeof event.recordedAt, 'string');
    assert.strictEqual(event.requestId, 'req-123');
    assert.strictEqual(event.correlationId, 'corr-456');
    assert.strictEqual(event.caseId, 'ptp-case-789');
    assert.strictEqual(event.lifecycleStage, 'purchaseOrder');
    assert.strictEqual(event.eventType, 'purchaseOrderCreated');
    assert.strictEqual(event.actorUserId, 'user-abc');
    assert.strictEqual(event.actorSource, 'actorContext');
    assert.strictEqual(event.targetType, 'purchaseOrder');
    assert.strictEqual(event.targetId, 'po-def');
    assert.strictEqual(event.outcome, 'success');
    assert.strictEqual(event.immutableReference.canonicalization, 'json-stable-v1');
    assert.strictEqual(typeof event.immutableReference.payloadHash, 'string');
  });

  it('creates valid delivery event', () => {
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-abc',
      targetType: 'delivery',
      targetId: 'del-def',
      outcome: 'success'
    });

    assert.strictEqual(event.lifecycleStage, 'delivery');
    assert.strictEqual(event.eventType, 'deliveryRecorded');
    assert.strictEqual(event.targetType, 'delivery');
    assert.strictEqual(event.targetId, 'del-def');
  });

  it('creates valid invoice event', () => {
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'invoice',
      eventType: 'invoiceIssued',
      actorUserId: 'user-abc',
      targetType: 'invoice',
      targetId: 'inv-def',
      outcome: 'success'
    });

    assert.strictEqual(event.lifecycleStage, 'invoice');
    assert.strictEqual(event.eventType, 'invoiceIssued');
    assert.strictEqual(event.targetType, 'invoice');
    assert.strictEqual(event.targetId, 'inv-def');
  });

  it('creates valid settlement event', () => {
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'settlement',
      eventType: 'settlementInitiated',
      actorUserId: 'user-abc',
      targetType: 'settlement',
      targetId: 'set-def',
      outcome: 'success'
    });

    assert.strictEqual(event.lifecycleStage, 'settlement');
    assert.strictEqual(event.eventType, 'settlementInitiated');
    assert.strictEqual(event.targetType, 'settlement');
    assert.strictEqual(event.targetId, 'set-def');
  });

  it('creates valid escrowCreated event for the escrow first slice', () => {
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'accepted-order-demo-123',
      caseId: 'order-123',
      lifecycleStage: 'escrow',
      eventType: 'escrowCreated',
      actorUserId: 'user-abc',
      targetType: 'escrow',
      targetId: 'escrow-def',
      outcome: 'success'
    });

    assert.strictEqual(event.lifecycleStage, 'escrow');
    assert.strictEqual(event.eventType, 'escrowCreated');
    assert.strictEqual(event.targetType, 'escrow');
    assert.strictEqual(event.targetId, 'escrow-def');
  });

  it('requires all mandatory fields', () => {
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

    assert.ok(event.requestId);
    assert.ok(event.correlationId);
    assert.ok(event.caseId);
    assert.ok(event.lifecycleStage);
    assert.ok(event.eventType);
    assert.ok(event.actorUserId);
    assert.ok(event.targetType);
    assert.ok(event.targetId);
  });

  it('generates immutableReference payloadHash and canonicalization', () => {
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

    assert.ok(event.immutableReference.payloadHash);
    assert.strictEqual(event.immutableReference.canonicalization, 'json-stable-v1');
  });

  it('preserves previousEventHash and source refs when provided', () => {
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
      previousEventHash: 'prev-hash-123',
      sourcePayloadRef: 'source-payload-ref',
      sourceRecordRef: 'source-record-ref',
      anchorRef: 'anchor-ref'
    });

    assert.strictEqual(event.immutableReference.previousEventHash, 'prev-hash-123');
    assert.strictEqual(event.immutableReference.sourcePayloadRef, 'source-payload-ref');
    assert.strictEqual(event.immutableReference.sourceRecordRef, 'source-record-ref');
    assert.strictEqual(event.immutableReference.anchorRef, 'anchor-ref');
  });

  it('rejects invalid lifecycleStage', () => {
    const invalidLifecycleStageInput = {
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'invalidStage',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'success'
    };

    assert.throws(() => {
      createProcureToPayLifecycleEvent(
	invalidLifecycleStageInput as unknown as CreateProcureToPayLifecycleEventInput
      );
    }, ProcureToPayLifecycleValidationError);
  });

  it('rejects eventType under wrong lifecycleStage', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: 'req-123',
        correlationId: 'corr-456',
        caseId: 'ptp-case-789',
        lifecycleStage: 'delivery',
        eventType: 'purchaseOrderCreated', // Wrong for delivery stage
        actorUserId: 'user-abc',
        targetType: 'delivery',
        targetId: 'del-def',
        outcome: 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });

  it('rejects missing correlationId', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: 'req-123',
        correlationId: '', // Blank
        caseId: 'ptp-case-789',
        lifecycleStage: 'purchaseOrder',
        eventType: 'purchaseOrderCreated',
        actorUserId: 'user-abc',
        targetType: 'purchaseOrder',
        targetId: 'po-def',
        outcome: 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });

  it('rejects missing caseId', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: 'req-123',
        correlationId: 'corr-456',
        caseId: '', // Blank
        lifecycleStage: 'purchaseOrder',
        eventType: 'purchaseOrderCreated',
        actorUserId: 'user-abc',
        targetType: 'purchaseOrder',
        targetId: 'po-def',
        outcome: 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });

  it('accepts injected eventId, occurredAt, and recordedAt for deterministic tests', () => {
    const event = createProcureToPayLifecycleEvent({
      eventId: 'test-event-id',
      occurredAt: '2023-01-01T00:00:00.000Z',
      recordedAt: '2023-01-01T00:00:05.000Z',
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

    assert.strictEqual(event.eventId, 'test-event-id');
    assert.strictEqual(event.occurredAt, '2023-01-01T00:00:00.000Z');
    assert.strictEqual(event.recordedAt, '2023-01-01T00:00:05.000Z');
  });

  it('preserves optional reason and metadata', () => {
    const event = createProcureToPayLifecycleEvent({
      requestId: 'req-123',
      correlationId: 'corr-456',
      caseId: 'ptp-case-789',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderRejected',
      actorUserId: 'user-abc',
      targetType: 'purchaseOrder',
      targetId: 'po-def',
      outcome: 'rejected',
      reason: 'insufficient_funds',
      metadata: {
        amount: 1000,
        currency: 'USD'
      }
    });

    assert.strictEqual(event.reason, 'insufficient_funds');
    assert.deepStrictEqual(event.metadata, {
      amount: 1000,
      currency: 'USD'
      });
  });

  it('rejects blank requestId', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: '', // Blank
        correlationId: 'corr-456',
        caseId: 'ptp-case-789',
        lifecycleStage: 'purchaseOrder',
        eventType: 'purchaseOrderCreated',
        actorUserId: 'user-abc',
        targetType: 'purchaseOrder',
        targetId: 'po-def',
        outcome: 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });

  it('rejects blank actorUserId', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: 'req-123',
        correlationId: 'corr-456',
        caseId: 'ptp-case-789',
        lifecycleStage: 'purchaseOrder',
        eventType: 'purchaseOrderCreated',
        actorUserId: '', // Blank
        targetType: 'purchaseOrder',
        targetId: 'po-def',
        outcome: 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });

  it('rejects blank eventType', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: 'req-123',
        correlationId: 'corr-456',
        caseId: 'ptp-case-789',
        lifecycleStage: 'purchaseOrder',
        eventType: '', // Blank
        actorUserId: 'user-abc',
        targetType: 'purchaseOrder',
        targetId: 'po-def',
        outcome: 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });

  it('rejects invalid outcome', () => {
    assert.throws(() => {
      createProcureToPayLifecycleEvent({
        requestId: 'req-123',
        correlationId: 'corr-456',
        caseId: 'ptp-case-789',
        lifecycleStage: 'purchaseOrder',
        eventType: 'purchaseOrderCreated',
        actorUserId: 'user-abc',
        targetType: 'purchaseOrder',
        targetId: 'po-def',
        // Type cast to avoid TypeScript error while testing runtime validation
        outcome: 'invalidOutcome' as unknown as 'success'
      });
    }, ProcureToPayLifecycleValidationError);
  });
});
