import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryAccessAuditEventRepository } from './in-memory-access-audit-event-repository.js';
import { createAccessAuditEvent } from '../application/access-audit-event-builder.js';
import type { CreateAccessAuditEventInput } from '../application/access-audit-event-builder.js';

describe('InMemoryAccessAuditEventRepository', () => {
  let repository: InMemoryAccessAuditEventRepository;

  beforeEach(() => {
    repository = new InMemoryAccessAuditEventRepository();
  });

  it('saves and lists events', async () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    };
    
    const event = createAccessAuditEvent(input);

    const savedEvent = await repository.save(event);
    const events = await repository.list();

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].eventId, savedEvent.eventId);
    assert.strictEqual(events[0].requestId, 'req-123');
  });

  it('preserves insertion order', async () => {
    const input1: CreateAccessAuditEventInput = {
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    };

    const input2: CreateAccessAuditEventInput = {
      requestId: 'req-2',
      actorUserId: 'user-2',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    };

    const event1 = createAccessAuditEvent(input1);
    const event2 = createAccessAuditEvent(input2);

    await repository.save(event1);
    await repository.save(event2);

    const events = await repository.list();

    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].requestId, 'req-1');
    assert.strictEqual(events[1].requestId, 'req-2');
  });

  it('save(...) returns saved event copy', async () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    };
    
    const event = createAccessAuditEvent(input);

    const savedEvent = await repository.save(event);

    assert.strictEqual(savedEvent.requestId, 'req-123');
    assert.notStrictEqual(savedEvent, event); // Should be a copy
  });

  it('list() returns defensive copies', async () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    };
    
    const event = createAccessAuditEvent(input);

    await repository.save(event);
    const events = await repository.list();
    const retrievedEvent = events[0];

    // Modify the retrieved event
    retrievedEvent.requestId = 'modified';

    // List again to check if original was affected
    const eventsAgain = await repository.list();
    const originalEvent = eventsAgain[0];

    assert.strictEqual(originalEvent.requestId, 'req-123'); // Should not be modified
    assert.strictEqual(retrievedEvent.requestId, 'modified'); // Our copy was modified
  });

  it('mutating returned event does not mutate stored event', async () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    };
    
    const event = createAccessAuditEvent(input);

    const saved = await repository.save(event);
    const originalRequestId = saved.requestId;
    
    // Get the event and modify it
    saved.requestId = 'mutated-id';
    saved.action = 'mutated-action';

    // Get the event again - should be unchanged
    const events = await repository.list();
    const originalEvent = events[0];

    assert.strictEqual(originalEvent.requestId, originalRequestId);
    assert.strictEqual(originalEvent.action, 'createRole');
  });

  it('mutating returned event from list does not mutate stored event', async () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    };
    
    const event = createAccessAuditEvent(input);

    await repository.save(event);
    
    // Get the event and modify it
    const events = await repository.list();
    const retrievedEvent = events[0];
    const originalRequestId = retrievedEvent.requestId;
    
    retrievedEvent.requestId = 'hacked-id';
    retrievedEvent.action = 'hacked-action';

    // Get the event again - should be unchanged
    const eventsAgain = await repository.list();
    const originalEvent = eventsAgain[0];

    assert.strictEqual(originalEvent.requestId, originalRequestId);
    assert.strictEqual(originalEvent.action, 'createRole');
  });
});
