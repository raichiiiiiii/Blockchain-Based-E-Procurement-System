import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { recordAccessAuditEvent } from './record-access-audit-event.js';
import { InMemoryAccessAuditEventRepository } from '../infrastructure/in-memory-access-audit-event-repository.js';
import type { AccessAuditEventRepository } from './access-audit-event-repository.js';
import type { AccessAuditEvent } from './access-audit-event.js';

// Test double repository that throws on save
class ThrowingRepository implements AccessAuditEventRepository {
  async save(): Promise<AccessAuditEvent> {
    throw new Error('Save failed');
  }
  
  async list(): Promise<AccessAuditEvent[]> {
    return [];
  }
}

describe('recordAccessAuditEvent', () => {
  test('returns null when repository is undefined', async () => {
    const result = await recordAccessAuditEvent(undefined, {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });
    
    assert.strictEqual(result, null);
  });

  test('saves and returns an access audit event when repository is provided', async () => {
    const repository = new InMemoryAccessAuditEventRepository();
    
    const result = await recordAccessAuditEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control'
    });
    
    assert.notStrictEqual(result, null);
    assert.ok(result);
    
    // Check required fields
    assert.ok(result.eventId);
    assert.strictEqual(result.schemaVersion, 'access-audit-event.v1');
    assert.ok(result.occurredAt);
    assert.strictEqual(result.requestId, 'req-123');
    assert.strictEqual(result.actorUserId, 'user-456');
    assert.strictEqual(result.actorSource, 'actorContext');
    assert.strictEqual(result.action, 'createRole');
    assert.strictEqual(result.targetType, 'role');
    assert.strictEqual(result.targetId, 'role-789');
    assert.strictEqual(result.outcome, 'success');
    assert.strictEqual(result.module, 'access-control');
    assert.ok(result.evidence.payloadHash);
    assert.strictEqual(result.evidence.canonicalization, 'json-stable-v1');
  });

  test('preserves reason, route, and method', async () => {
    const repository = new InMemoryAccessAuditEventRepository();
    
    const result = await recordAccessAuditEvent(repository, {
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
    
    assert.notStrictEqual(result, null);
    assert.ok(result);
    assert.strictEqual(result.reason, 'admin_required');
    assert.strictEqual(result.route, '/api/v1/roles');
    assert.strictEqual(result.method, 'POST');
  });

  test('preserves previousEventHash', async () => {
    const repository = new InMemoryAccessAuditEventRepository();
    
    const result = await recordAccessAuditEvent(repository, {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      previousEventHash: 'prev-hash-123'
    });
    
    assert.notStrictEqual(result, null);
    assert.ok(result);
    assert.strictEqual(result.evidence.previousEventHash, 'prev-hash-123');
  });

  test('propagates repository save errors when repository is configured and save fails', async () => {
    const repository = new ThrowingRepository();
    
    await assert.rejects(
      async () => {
        await recordAccessAuditEvent(repository, {
          requestId: 'req-123',
          actorUserId: 'user-456',
          action: 'createRole',
          targetType: 'role',
          targetId: 'role-789',
          outcome: 'success',
          module: 'access-control'
        });
      },
      { message: 'Save failed' }
    );
  });
});
