import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createAccessAuditEvent, canonicalizeAccessAuditValue } from './access-audit-event-builder.js';
import type { CreateAccessAuditEventInput } from './access-audit-event-builder.js';

describe('access audit event evidence', () => {
  it('hash is deterministic for identical audited payload', () => {
    const input1: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const event1 = createAccessAuditEvent(input1);
    const event2 = createAccessAuditEvent(input1);

    assert.strictEqual(event1.evidence.payloadHash, event2.evidence.payloadHash);
  });

  it('hash is stable when object key order differs', () => {
    const input1: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const input2: CreateAccessAuditEventInput = {
      module: 'access-control',
      outcome: 'success',
      targetId: 'role-789',
      targetType: 'role',
      action: 'createRole',
      actorUserId: 'user-456',
      requestId: 'req-123',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const event1 = createAccessAuditEvent(input1);
    const event2 = createAccessAuditEvent(input2);

    assert.strictEqual(event1.evidence.payloadHash, event2.evidence.payloadHash);
  });

  it('hash changes when audited payload changes', () => {
    const input1: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const input2: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'forbidden', // Changed
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const event1 = createAccessAuditEvent(input1);
    const event2 = createAccessAuditEvent(input2);

    assert.notStrictEqual(event1.evidence.payloadHash, event2.evidence.payloadHash);
  });

  it('hash does not change when only eventId changes', () => {
    const input1: CreateAccessAuditEventInput = {
      eventId: 'event-1',
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const input2: CreateAccessAuditEventInput = {
      eventId: 'event-2', // Changed
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const event1 = createAccessAuditEvent(input1);
    const event2 = createAccessAuditEvent(input2);

    assert.strictEqual(event1.evidence.payloadHash, event2.evidence.payloadHash);
  });

  it('hash does not change when only previousEventHash changes', () => {
    const input1: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      previousEventHash: 'prev-1',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const input2: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      previousEventHash: 'prev-2', // Changed
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const event1 = createAccessAuditEvent(input1);
    const event2 = createAccessAuditEvent(input2);

    assert.strictEqual(event1.evidence.payloadHash, event2.evidence.payloadHash);
  });

  it('hash is lowercase hex SHA-256 length', () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      occurredAt: '2026-01-01T00:00:00.000Z'
    };

    const event = createAccessAuditEvent(input);

    assert.strictEqual(typeof event.evidence.payloadHash, 'string');
    assert.match(event.evidence.payloadHash, /^[0-9a-f]{64}$/);
  });

  it('arrays preserve order', () => {
    // This test ensures our canonicalization preserves array order
    const obj1 = { items: ['a', 'b', 'c'] };
    const obj2 = { items: ['c', 'b', 'a'] };
    
    const str1 = canonicalizeAccessAuditValue(obj1);
    const str2 = canonicalizeAccessAuditValue(obj2);
    
    assert.notStrictEqual(str1, str2);
  });
});
