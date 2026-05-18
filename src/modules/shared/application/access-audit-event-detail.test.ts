import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryAccessAuditEventRepository } from '../infrastructure/in-memory-access-audit-event-repository.js';
import { createAccessAuditEvent } from './access-audit-event-builder.js';
import { getAccessAuditEventDetail } from './access-audit-event-detail.js';
import type { CreateAccessAuditEventInput } from './access-audit-event-builder.js';

describe('access-audit-event-detail', () => {
  let repository: InMemoryAccessAuditEventRepository;

  beforeEach(() => {
    repository = new InMemoryAccessAuditEventRepository();
  });

  it('returns existing event when eventId matches', async () => {
    // Seed two events
    const event1Input: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event2Input: CreateAccessAuditEventInput = {
      requestId: 'req-2',
      actorUserId: 'user-2',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    };

    const event1 = createAccessAuditEvent(event1Input);
    const event2 = createAccessAuditEvent(event2Input);

    await repository.save(event1);
    await repository.save(event2);

    // Lookup the target event
    const result = await getAccessAuditEventDetail(repository, event2.eventId);

    // Assert result
    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.eventId, event2.eventId);
    assert.deepStrictEqual(result, event2);
  });

  it('returns null when eventId does not exist', async () => {
    // Seed one unrelated event
    const eventInput: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event = createAccessAuditEvent(eventInput);
    await repository.save(event);

    // Lookup with missing eventId
    const result = await getAccessAuditEventDetail(repository, 'missing-event-id');

    // Assert result is null
    assert.strictEqual(result, null);
  });

  it('preserves all payload fields in returned event', async () => {
    // Seed an event with all fields
    const eventInput: CreateAccessAuditEventInput = {
      eventId: 'test-event-id',
      occurredAt: '2026-04-15T10:30:00Z',
      requestId: 'req-test-123',
      actorUserId: 'test-user-456',
      action: 'testAction',
      targetType: 'testTargetType',
      targetId: 'testTargetId',
      outcome: 'success',
      module: 'access-control',
      reason: 'test reason',
      route: '/api/v1/test-route',
      method: 'POST'
    };

    const event = createAccessAuditEvent(eventInput);
    await repository.save(event);

    // Lookup the event
    const result = await getAccessAuditEventDetail(repository, event.eventId);

    // Assert all fields are preserved
    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.eventId, event.eventId);
    assert.strictEqual(result?.schemaVersion, event.schemaVersion);
    assert.strictEqual(result?.occurredAt, event.occurredAt);
    assert.strictEqual(result?.requestId, event.requestId);
    assert.strictEqual(result?.actorUserId, event.actorUserId);
    assert.strictEqual(result?.actorSource, event.actorSource);
    assert.strictEqual(result?.action, event.action);
    assert.strictEqual(result?.targetType, event.targetType);
    assert.strictEqual(result?.targetId, event.targetId);
    assert.strictEqual(result?.outcome, event.outcome);
    assert.strictEqual(result?.reason, event.reason);
    assert.strictEqual(result?.module, event.module);
    assert.strictEqual(result?.route, event.route);
    assert.strictEqual(result?.method, event.method);
    assert.strictEqual(result?.evidence.payloadHash, event.evidence.payloadHash);
    assert.strictEqual(result?.evidence.canonicalization, event.evidence.canonicalization);
  });

  it('does not break existing list/query behavior', async () => {
    // Seed an event
    const eventInput: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event = createAccessAuditEvent(eventInput);
    await repository.save(event);

    // Use getAccessAuditEventDetail
    const detailResult = await getAccessAuditEventDetail(repository, event.eventId);
    assert.notStrictEqual(detailResult, null);

    // Verify list still works
    const listResult = await repository.list();
    assert.strictEqual(listResult.length, 1);
    assert.strictEqual(listResult[0].eventId, event.eventId);
  });
});
