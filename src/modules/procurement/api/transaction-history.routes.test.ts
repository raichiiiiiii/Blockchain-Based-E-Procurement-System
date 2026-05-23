import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import { registerTransactionHistoryRoutes } from './transaction-history.routes.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { createProcureToPayLifecycleEvent } from '../application/procure-to-pay-lifecycle-event-builder.js';

describe('Transaction History API Routes', () => {
  it('returns related lifecycle events for a caseId', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    // Create events for the target case
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success',
      occurredAt: '2023-01-01T10:00:00.000Z'
    });
    
    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'event-2',
      requestId: 'req-2',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-2',
      targetType: 'delivery',
      targetId: 'del-1',
      outcome: 'success',
      occurredAt: '2023-01-02T10:00:00.000Z'
    });
    
    // Create event for a different case
    const event3 = createProcureToPayLifecycleEvent({
      eventId: 'event-3',
      requestId: 'req-3',
      correlationId: 'corr-2',
      caseId: 'ptp-case-456',
      lifecycleStage: 'invoice',
      eventType: 'invoiceIssued',
      actorUserId: 'user-3',
      targetType: 'invoice',
      targetId: 'inv-1',
      outcome: 'success',
      occurredAt: '2023-01-03T10:00:00.000Z'
    });
    
    await repository.save(event1);
    await repository.save(event2);
    await repository.save(event3);
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.caseId, 'ptp-case-123');
    assert.strictEqual(result.data.items.length, 2);
    assert.strictEqual(result.data.items[0].eventId, 'event-1');
    assert.strictEqual(result.data.items[1].eventId, 'event-2');
    assert.ok(result.data.completeness);
  });

  it('excludes events from other caseIds', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    // Create events for different cases
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success'
    });
    
    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'event-2',
      requestId: 'req-2',
      correlationId: 'corr-2',
      caseId: 'ptp-case-456',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-2',
      targetType: 'delivery',
      targetId: 'del-1',
      outcome: 'success'
    });
    
    await repository.save(event1);
    await repository.save(event2);
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.items.length, 1);
    assert.strictEqual(result.data.items[0].caseId, 'ptp-case-123');
    assert.ok(result.data.completeness);
  });

  it('optionally filters by correlationId if provided', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    // Create events with different correlationIds for the same case
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success'
    });
    
    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'event-2',
      requestId: 'req-2',
      correlationId: 'corr-2',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-2',
      targetType: 'delivery',
      targetId: 'del-1',
      outcome: 'success'
    });
    
    await repository.save(event1);
    await repository.save(event2);
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history?correlationId=corr-1'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.items.length, 1);
    assert.strictEqual(result.data.items[0].correlationId, 'corr-1');
    assert.ok(result.data.completeness);
  });

  it('orders by occurredAt ascending', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success',
      occurredAt: '2023-01-03T10:00:00.000Z'
    });
    
    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'event-2',
      requestId: 'req-2',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-2',
      targetType: 'delivery',
      targetId: 'del-1',
      outcome: 'success',
      occurredAt: '2023-01-01T10:00:00.000Z'
    });
    
    const event3 = createProcureToPayLifecycleEvent({
      eventId: 'event-3',
      requestId: 'req-3',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'invoice',
      eventType: 'invoiceIssued',
      actorUserId: 'user-3',
      targetType: 'invoice',
      targetId: 'inv-1',
      outcome: 'success',
      occurredAt: '2023-01-02T10:00:00.000Z'
    });
    
    await repository.save(event1);
    await repository.save(event2);
    await repository.save(event3);
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.items.length, 3);
    assert.strictEqual(result.data.items[0].eventId, 'event-2'); // earliest occurredAt
    assert.strictEqual(result.data.items[1].eventId, 'event-3'); // middle occurredAt
    assert.strictEqual(result.data.items[2].eventId, 'event-1'); // latest occurredAt
    assert.ok(result.data.completeness);
  });

  it('uses eventId ascending as tie-breaker when occurredAt is identical', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    // Create events with identical occurredAt but different eventIds
    const event1 = createProcureToPayLifecycleEvent({
      eventId: 'event-z',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success',
      occurredAt: '2023-01-01T10:00:00.000Z'
    });
    
    const event2 = createProcureToPayLifecycleEvent({
      eventId: 'event-a',
      requestId: 'req-2',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-2',
      targetType: 'delivery',
      targetId: 'del-1',
      outcome: 'success',
      occurredAt: '2023-01-01T10:00:00.000Z'
    });
    
    const event3 = createProcureToPayLifecycleEvent({
      eventId: 'event-m',
      requestId: 'req-3',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'invoice',
      eventType: 'invoiceIssued',
      actorUserId: 'user-3',
      targetType: 'invoice',
      targetId: 'inv-1',
      outcome: 'success',
      occurredAt: '2023-01-01T10:00:00.000Z'
    });
    
    await repository.save(event1);
    await repository.save(event2);
    await repository.save(event3);
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.items.length, 3);
    assert.strictEqual(result.data.items[0].eventId, 'event-a'); // alphabetically first
    assert.strictEqual(result.data.items[1].eventId, 'event-m'); // alphabetically middle
    assert.strictEqual(result.data.items[2].eventId, 'event-z'); // alphabetically last
    assert.ok(result.data.completeness);
  });

  it('returns an empty successful result for a valid caseId with no events', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.caseId, 'ptp-case-123');
    assert.strictEqual(result.data.items.length, 0);
    assert.deepStrictEqual(result.data.ordering, {
      primary: 'occurredAt',
      secondary: 'eventId',
      direction: 'ascending'
    });
    assert.ok(result.data.completeness);
    assert.strictEqual(result.data.completeness.status, 'unknown');
    assert.strictEqual(result.data.completeness.reason, 'no_events_recorded');
    assert.strictEqual(result.data.completeness.message, 'No events have been recorded for this case');
  });

  it('returns an empty successful result when no repository is provided', async () => {
    const app = fastify();
    
    app.register(registerTransactionHistoryRoutes);
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.caseId, 'ptp-case-123');
    assert.strictEqual(result.data.items.length, 0);
    assert.deepStrictEqual(result.data.ordering, {
      primary: 'occurredAt',
      secondary: 'eventId',
      direction: 'ascending'
    });
    assert.ok(result.data.completeness);
    assert.strictEqual(result.data.completeness.status, 'unknown');
    assert.strictEqual(result.data.completeness.reason, 'no_events_recorded');
    assert.strictEqual(result.data.completeness.message, 'No events have been recorded for this case');
  });

  it('rejects blank caseId', async () => {
    const app = fastify();
    
    app.register(registerTransactionHistoryRoutes);
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/%20%20%20/history' // URL encoded spaces
    });
    
    assert.strictEqual(response.statusCode, 400);
    const result = JSON.parse(response.body);
    assert.ok(result.error);
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
    assert.ok(result.error.message.includes('caseId is required and cannot be blank'));
  });

  it('rejects blank correlationId', async () => {
    const app = fastify();
    
    app.register(registerTransactionHistoryRoutes);
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history?correlationId=%20%20%20' // URL encoded spaces
    });
    
    assert.strictEqual(response.statusCode, 400);
    const result = JSON.parse(response.body);
    assert.ok(result.error);
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
    assert.ok(result.error.details.issues.some((issue: any) => 
      issue.path === 'correlationId' && issue.message.includes('cannot be blank')
    ));
  });

  it('rejects unsupported query parameters', async () => {
    const app = fastify();
    
    app.register(registerTransactionHistoryRoutes);
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history?unsupportedParam=value'
    });
    
    assert.strictEqual(response.statusCode, 400);
    const result = JSON.parse(response.body);
    assert.ok(result.error);
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
    assert.ok(result.error.details.issues.some((issue: any) => 
      issue.path === 'unsupportedParam' && issue.message.includes('Unsupported query parameter')
    ));
  });

  it('projects lifecycle event fields without mutating stored events', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();
    
    const event = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success',
      metadata: {
        amount: 1000,
        currency: 'USD'
      }
    });
    
    await repository.save(event);
    
    app.register(registerTransactionHistoryRoutes, { repository });
    
    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.items.length, 1);
    const resultEvent = result.data.items[0];
    
    // Check that all expected fields are present
    assert.strictEqual(resultEvent.eventId, 'event-1');
    assert.strictEqual(resultEvent.schemaVersion, 'procure-to-pay-lifecycle-event.v1');
    assert.strictEqual(resultEvent.requestId, 'req-1');
    assert.strictEqual(resultEvent.correlationId, 'corr-1');
    assert.strictEqual(resultEvent.caseId, 'ptp-case-123');
    assert.strictEqual(resultEvent.lifecycleStage, 'purchaseOrder');
    assert.strictEqual(resultEvent.eventType, 'purchaseOrderCreated');
    assert.strictEqual(resultEvent.actorUserId, 'user-1');
    assert.strictEqual(resultEvent.actorSource, 'actorContext');
    assert.strictEqual(resultEvent.targetType, 'purchaseOrder');
    assert.strictEqual(resultEvent.targetId, 'po-1');
    assert.strictEqual(resultEvent.outcome, 'success');
    assert.ok(resultEvent.immutableReference.payloadHash);
    assert.ok(resultEvent.metadata);
    assert.strictEqual(resultEvent.metadata?.amount, 1000);
    assert.strictEqual(resultEvent.metadata?.currency, 'USD');
    assert.ok(result.data.completeness);
  });

  it('preserves immutableReference fields in returned projections', async () => {
    const app = fastify();
    const repository = new InMemoryProcureToPayLifecycleEventRepository();

    const previousEvent = createProcureToPayLifecycleEvent({
      eventId: 'event-0',
      requestId: 'req-0',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'purchaseOrder',
      eventType: 'purchaseOrderCreated',
      actorUserId: 'user-1',
      targetType: 'purchaseOrder',
      targetId: 'po-1',
      outcome: 'success',
      occurredAt: '2023-01-01T09:00:00.000Z',
      recordedAt: '2023-01-01T09:00:05.000Z'
    });

    await repository.save(previousEvent);

    const event = createProcureToPayLifecycleEvent({
      eventId: 'event-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      caseId: 'ptp-case-123',
      lifecycleStage: 'delivery',
      eventType: 'deliveryRecorded',
      actorUserId: 'user-1',
      targetType: 'delivery',
      targetId: 'del-1',
      outcome: 'success',
      occurredAt: '2023-01-01T10:00:00.000Z',
      recordedAt: '2023-01-01T10:00:05.000Z',
      previousEventHash: previousEvent.immutableReference.payloadHash,
      sourcePayloadRef: 'source-payload-ref',
      sourceRecordRef: 'source-record-ref',
      anchorRef: 'anchor-ref'
    });

    await repository.save(event);

    app.register(registerTransactionHistoryRoutes, { repository });

    const response = await app.inject({
      method: 'GET',
      url: '/procurement/transactions/ptp-case-123/history'
    });

    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.body);
    assert.strictEqual(result.data.items.length, 2);
    const resultEvent = result.data.items[1];

    assert.ok(resultEvent.immutableReference.payloadHash);
    assert.strictEqual(resultEvent.immutableReference.canonicalization, 'json-stable-v1');
    assert.strictEqual(
      resultEvent.immutableReference.previousEventHash,
      previousEvent.immutableReference.payloadHash
    );
    assert.strictEqual(resultEvent.immutableReference.sourcePayloadRef, 'source-payload-ref');
    assert.strictEqual(resultEvent.immutableReference.sourceRecordRef, 'source-record-ref');
    assert.strictEqual(resultEvent.immutableReference.anchorRef, 'anchor-ref');
    assert.ok(result.data.completeness);
  });
});
