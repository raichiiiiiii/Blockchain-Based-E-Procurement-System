import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createAccessAuditEvent } from './access-audit-event-builder.js';
import type { AccessAuditEvent } from './access-audit-event.js';

describe('createAccessAuditEvent', () => {
  it('creates event with required fields', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(typeof event.eventId, 'string');
    assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(typeof event.occurredAt, 'string');
    assert.strictEqual(event.requestId, 'req-123');
    assert.strictEqual(event.actorUserId, 'user-456');
    assert.strictEqual(event.actorSource, 'actorContext');
    assert.strictEqual(event.action, 'createRole');
    assert.strictEqual(event.targetType, 'role');
    assert.strictEqual(event.targetId, 'role-789');
    assert.strictEqual(event.outcome, 'success');
    assert.strictEqual(event.module, 'access-control');
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(typeof event.evidence.payloadHash, 'string');
  });

  it('uses schema version access-audit-event.v1', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
  });

  it('uses actorSource: actorContext', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(event.actorSource, 'actorContext');
  });

  it('sets canonicalization json-stable-v1', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
  });

  it('generates eventId when omitted', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(typeof event.eventId, 'string');
    assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('accepts injected eventId and occurredAt for deterministic tests', () => {
    const event = createAccessAuditEvent({
      eventId: 'test-event-id',
      occurredAt: '2023-01-01T00:00:00.000Z',
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(event.eventId, 'test-event-id');
    assert.strictEqual(event.occurredAt, '2023-01-01T00:00:00.000Z');
  });

  it('preserves optional reason, route, and method', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'forbidden',
      module: 'access-control',
      reason: 'admin_required',
      route: '/api/v1/roles',
      method: 'POST'
    });

    assert.strictEqual(event.reason, 'admin_required');
    assert.strictEqual(event.route, '/api/v1/roles');
    assert.strictEqual(event.method, 'POST');
  });

  it('preserves previousEventHash when provided', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      previousEventHash: 'prev-hash-123'
    });

    assert.strictEqual(event.evidence.previousEventHash, 'prev-hash-123');
  });

  it('omits optional fields when not provided', () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });

    assert.strictEqual(event.reason, undefined);
    assert.strictEqual(event.route, undefined);
    assert.strictEqual(event.method, undefined);
    assert.strictEqual(event.evidence.previousEventHash, undefined);
  });
});
