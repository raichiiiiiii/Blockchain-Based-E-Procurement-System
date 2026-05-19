import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryAccessAuditEventRepository } from '../infrastructure/in-memory-access-audit-event-repository.js';
import { createAccessAuditEvent } from './access-audit-event-builder.js';
import { getAccessAuditEventSequence } from './access-audit-event-sequence.js';
import type { CreateAccessAuditEventInput } from './access-audit-event-builder.js';

describe('access-audit-event-sequence', () => {
  let repository: InMemoryAccessAuditEventRepository;

  beforeEach(() => {
    repository = new InMemoryAccessAuditEventRepository();
  });

  it('retrieves actor-based sequence with correct events', async () => {
    // Seed events for two actors
    const event1Input: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'actor-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event2Input: CreateAccessAuditEventInput = {
      requestId: 'req-2',
      actorUserId: 'actor-2',
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

    // Retrieve sequence for actor-1
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'actor-1'
    });

    // Assertions
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].actorUserId, 'actor-1');
    assert.strictEqual(result.items[0].eventId, event1.eventId);

    // Check scope preservation
    assert.strictEqual(result.scope.type, 'actor');
    assert.strictEqual(result.scope.actorUserId, 'actor-1');

    // Check ordering metadata
    assert.strictEqual(result.ordering.primary, 'occurredAt');
    assert.strictEqual(result.ordering.secondary, 'eventId');
    assert.strictEqual(result.ordering.direction, 'ascending');

    // Check completeness metadata
    assert.strictEqual(result.completeness.status, 'unknown');
    assert.strictEqual(result.completeness.reason, 'completeness_not_proven');
  });

  it('retrieves target-based sequence with correct events', async () => {
    // Seed events for two targets
    const event1Input: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRoleAssignment',
      targetType: 'roleAssignment',
      targetId: 'user-001:org-001:role-reviewer',
      outcome: 'success',
      module: 'access-control'
    };

    const event2Input: CreateAccessAuditEventInput = {
      requestId: 'req-2',
      actorUserId: 'user-2',
      action: 'createRoleAssignment',
      targetType: 'roleAssignment',
      targetId: 'user-002:org-002:role-coordinator',
      outcome: 'success',
      module: 'access-control'
    };

    const event1 = createAccessAuditEvent(event1Input);
    const event2 = createAccessAuditEvent(event2Input);

    await repository.save(event1);
    await repository.save(event2);

    // Retrieve sequence for specific target
    const result = await getAccessAuditEventSequence(repository, {
      type: 'target',
      targetType: 'roleAssignment',
      targetId: 'user-001:org-001:role-reviewer'
    });

    // Assertions
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].targetType, 'roleAssignment');
    assert.strictEqual(result.items[0].targetId, 'user-001:org-001:role-reviewer');
    assert.strictEqual(result.items[0].eventId, event1.eventId);

    // Check scope preservation
    assert.strictEqual(result.scope.type, 'target');
    assert.strictEqual(result.scope.targetType, 'roleAssignment');
    assert.strictEqual(result.scope.targetId, 'user-001:org-001:role-reviewer');
  });

  it('filters events by time range inclusively', async () => {
    // Seed events before, inside, and after range
    const eventBeforeInput: CreateAccessAuditEventInput = {
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-before',
      actorUserId: 'actor-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const eventInsideInput: CreateAccessAuditEventInput = {
      occurredAt: '2026-04-02T10:00:00Z',
      requestId: 'req-inside',
      actorUserId: 'actor-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const eventAfterInput: CreateAccessAuditEventInput = {
      occurredAt: '2026-04-03T10:00:00Z',
      requestId: 'req-after',
      actorUserId: 'actor-1',
      action: 'deleteRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const eventBefore = createAccessAuditEvent(eventBeforeInput);
    const eventInside = createAccessAuditEvent(eventInsideInput);
    const eventAfter = createAccessAuditEvent(eventAfterInput);

    await repository.save(eventBefore);
    await repository.save(eventInside);
    await repository.save(eventAfter);

    // Retrieve sequence with time range
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'actor-1',
      occurredFrom: '2026-04-02T00:00:00Z',
      occurredTo: '2026-04-02T23:59:59Z'
    });

    // Should only include the event inside the range
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].eventId, eventInside.eventId);
    assert.strictEqual(result.items[0].occurredAt, '2026-04-02T10:00:00Z');
  });

  it('orders events by occurredAt ascending then eventId ascending', async () => {
    // Seed events out of order, including two with same occurredAt
    const event1Input: CreateAccessAuditEventInput = {
      eventId: 'zzz-early-event',
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-1',
      actorUserId: 'actor-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event2Input: CreateAccessAuditEventInput = {
      eventId: 'aaa-late-event',
      occurredAt: '2026-04-03T10:00:00Z',
      requestId: 'req-2',
      actorUserId: 'actor-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event3Input: CreateAccessAuditEventInput = {
      eventId: 'mid-event',
      occurredAt: '2026-04-02T10:00:00Z',
      requestId: 'req-3',
      actorUserId: 'actor-1',
      action: 'deleteRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    // Two events with same occurredAt but different eventIds
    const event4Input: CreateAccessAuditEventInput = {
      eventId: 'zzz-same-time-event',
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-4',
      actorUserId: 'actor-1',
      action: 'assignRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    };

    const event5Input: CreateAccessAuditEventInput = {
      eventId: 'aaa-same-time-event',
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-5',
      actorUserId: 'actor-1',
      action: 'revokeRole',
      targetType: 'role',
      targetId: 'role-3',
      outcome: 'success',
      module: 'access-control'
    };

    const event1 = createAccessAuditEvent(event1Input);
    const event2 = createAccessAuditEvent(event2Input);
    const event3 = createAccessAuditEvent(event3Input);
    const event4 = createAccessAuditEvent(event4Input);
    const event5 = createAccessAuditEvent(event5Input);

    // Save in random order
    await repository.save(event1);
    await repository.save(event3);
    await repository.save(event5);
    await repository.save(event2);
    await repository.save(event4);

    // Retrieve sequence
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'actor-1'
    });

    // Check ordering: occurredAt ascending, then eventId ascending
    assert.strictEqual(result.items.length, 5);

    // First three items have the same occurredAt and should be ordered by eventId
    assert.strictEqual(result.items[0].eventId, 'aaa-same-time-event');
    assert.strictEqual(result.items[0].occurredAt, '2026-04-01T10:00:00Z');
    assert.strictEqual(result.items[1].eventId, 'zzz-early-event');
    assert.strictEqual(result.items[1].occurredAt, '2026-04-01T10:00:00Z');
    assert.strictEqual(result.items[2].eventId, 'zzz-same-time-event');
    assert.strictEqual(result.items[2].occurredAt, '2026-04-01T10:00:00Z');

    // Next items should be ordered by occurredAt
    assert.strictEqual(result.items[3].eventId, 'mid-event');
    assert.strictEqual(result.items[3].occurredAt, '2026-04-02T10:00:00Z');
    assert.strictEqual(result.items[4].eventId, 'aaa-late-event');
    assert.strictEqual(result.items[4].occurredAt, '2026-04-03T10:00:00Z');
  });

  it('returns empty array when no events match', async () => {
    // Seed one unrelated event
    const eventInput: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'actor-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event = createAccessAuditEvent(eventInput);
    await repository.save(event);

    // Retrieve sequence for non-matching actor
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'non-existent-actor'
    });

    // Assertions
    assert.strictEqual(result.items.length, 0);
    assert.strictEqual(result.completeness.status, 'unknown');
  });

  it('returns single event when only one matches', async () => {
    // Seed one matching event
    const eventInput: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'actor-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event = createAccessAuditEvent(eventInput);
    await repository.save(event);

    // Retrieve sequence
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'actor-1'
    });

    // Assertions
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].eventId, event.eventId);
    assert.strictEqual(result.completeness.status, 'unknown');
  });

  it('preserves all AccessAuditEvent payload fields', async () => {
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

    // Retrieve sequence
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'test-user-456'
    });

    // Assertions
    assert.strictEqual(result.items.length, 1);
    const returnedEvent = result.items[0];

    // Verify all required AccessAuditEvent fields are preserved
    assert.strictEqual(returnedEvent.eventId, event.eventId);
    assert.strictEqual(returnedEvent.schemaVersion, event.schemaVersion);
    assert.strictEqual(returnedEvent.occurredAt, event.occurredAt);
    assert.strictEqual(returnedEvent.requestId, event.requestId);
    assert.strictEqual(returnedEvent.actorUserId, event.actorUserId);
    assert.strictEqual(returnedEvent.actorSource, event.actorSource);
    assert.strictEqual(returnedEvent.action, event.action);
    assert.strictEqual(returnedEvent.targetType, event.targetType);
    assert.strictEqual(returnedEvent.targetId, event.targetId);
    assert.strictEqual(returnedEvent.outcome, event.outcome);
    assert.strictEqual(returnedEvent.reason, event.reason);
    assert.strictEqual(returnedEvent.module, event.module);
    assert.strictEqual(returnedEvent.route, event.route);
    assert.strictEqual(returnedEvent.method, event.method);
    assert.strictEqual(returnedEvent.evidence.payloadHash, event.evidence.payloadHash);
    assert.strictEqual(returnedEvent.evidence.canonicalization, event.evidence.canonicalization);
  });

  it('does not break existing query behavior', async () => {
    // Seed events
    const event1Input: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'actor-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event2Input: CreateAccessAuditEventInput = {
      requestId: 'req-2',
      actorUserId: 'actor-2',
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

    // Use getAccessAuditEventSequence
    const sequenceResult = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'actor-1'
    });

    assert.strictEqual(sequenceResult.items.length, 1);

    // Verify existing queryAccessHistory still works
    const { queryAccessHistory } = await import('./access-history-query.js');
    const queryResult = await queryAccessHistory(repository, { actorUserId: 'actor-2' });

    assert.strictEqual(queryResult.length, 1);
    assert.strictEqual(queryResult[0].actorUserId, 'actor-2');
  });

  it('returns limited evidence chain without claiming completeness', async () => {
    // Seed events with limited evidence chain (no previousEventHash)
    const event1Input: CreateAccessAuditEventInput = {
      eventId: 'event-1',
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-1',
      actorUserId: 'limited-chain-actor',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event2Input: CreateAccessAuditEventInput = {
      eventId: 'event-2',
      occurredAt: '2026-04-02T10:00:00Z',
      requestId: 'req-2',
      actorUserId: 'limited-chain-actor',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const event1 = createAccessAuditEvent(event1Input);
    const event2 = createAccessAuditEvent(event2Input);

    await repository.save(event1);
    await repository.save(event2);

    // Retrieve sequence
    const result = await getAccessAuditEventSequence(repository, {
      type: 'actor',
      actorUserId: 'limited-chain-actor'
    });

    // Assertions
    assert.strictEqual(result.items.length, 2);

    // Check that evidence fields are preserved
    result.items.forEach(item => {
      assert.ok(item.evidence.payloadHash, 'Evidence should have payloadHash');
      assert.ok(item.evidence.canonicalization, 'Evidence should have canonicalization');
      // previousEventHash should be absent/undefined when not present
      assert.strictEqual(item.evidence.previousEventHash, undefined, 'previousEventHash should be undefined when not present');
    });

    // Check completeness metadata
    assert.strictEqual(result.completeness.status, 'unknown');
    assert.strictEqual(result.completeness.reason, 'completeness_not_proven');
    // Response should not claim completeness
    assert.notStrictEqual(result.completeness.status, 'complete');
  });
});
