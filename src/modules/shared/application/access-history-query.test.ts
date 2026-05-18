import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryAccessAuditEventRepository } from '../infrastructure/in-memory-access-audit-event-repository.js';
import { createAccessAuditEvent } from './access-audit-event-builder.js';
import { queryAccessHistory } from './access-history-query.js';
import type { CreateAccessAuditEventInput } from './access-audit-event-builder.js';

describe('access-history-query', () => {
  let repository: InMemoryAccessAuditEventRepository;

  beforeEach(() => {
    repository = new InMemoryAccessAuditEventRepository();
  });

  it('returns all events when query is empty', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-2',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, {});
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result, [event1, event2]);
  });

  it('filters by actorUserId', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-2',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { actorUserId: 'user-1' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].actorUserId, 'user-1');
  });

  it('filters by targetType', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'submitShariahReview',
      targetType: 'shariahReview',
      targetId: 'review-1',
      outcome: 'success',
      module: 'shariah-review'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { targetType: 'role' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].targetType, 'role');
  });

  it('filters by targetId', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { targetId: 'role-1' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].targetId, 'role-1');
  });

  it('filters by action', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { action: 'createRole' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].action, 'createRole');
  });

  it('filters by outcome', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'forbidden',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { outcome: 'forbidden' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].outcome, 'forbidden');
  });

  it('filters by module', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'submitShariahReview',
      targetType: 'shariahReview',
      targetId: 'review-1',
      outcome: 'success',
      module: 'shariah-review'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { module: 'shariah-review' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].module, 'shariah-review');
  });

  it('filters by route', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control',
      route: '/api/v1/roles'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'submitShariahReview',
      targetType: 'shariahReview',
      targetId: 'review-1',
      outcome: 'success',
      module: 'shariah-review',
      route: '/api/v1/shariah-reviews'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { route: '/api/v1/roles' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].route, '/api/v1/roles');
  });

  it('filters by method', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control',
      method: 'POST'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control',
      method: 'PATCH'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { method: 'POST' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].method, 'POST');
  });

  it('filters by occurredFrom inclusively', async () => {
    const event1 = createAccessAuditEvent({
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      occurredAt: '2026-04-02T10:00:00Z',
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { occurredFrom: '2026-04-02T10:00:00Z' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].occurredAt, '2026-04-02T10:00:00Z');
  });

  it('filters by occurredTo inclusively', async () => {
    const event1 = createAccessAuditEvent({
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      occurredAt: '2026-04-02T10:00:00Z',
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, { occurredTo: '2026-04-01T10:00:00Z' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].occurredAt, '2026-04-01T10:00:00Z');
  });

  it('applies combined filters with AND semantics', async () => {
    const event1 = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-2',
      outcome: 'success',
      module: 'access-control'
    });

    const event3 = createAccessAuditEvent({
      requestId: 'req-3',
      actorUserId: 'user-2',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);
    await repository.save(event3);

    const result = await queryAccessHistory(repository, {
      actorUserId: 'user-1',
      targetType: 'role',
      targetId: 'role-1'
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].actorUserId, 'user-1');
    assert.strictEqual(result[0].targetType, 'role');
    assert.strictEqual(result[0].targetId, 'role-1');
  });

  it('returns [] when no events match', async () => {
    const event = createAccessAuditEvent({
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event);

    const result = await queryAccessHistory(repository, { actorUserId: 'nonexistent-user' });
    assert.strictEqual(result.length, 0);
  });

  it('sorts by occurredAt ascending', async () => {
    const event1 = createAccessAuditEvent({
      occurredAt: '2026-04-02T10:00:00Z',
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, {});
    assert.strictEqual(result[0].occurredAt, '2026-04-01T10:00:00Z');
    assert.strictEqual(result[1].occurredAt, '2026-04-02T10:00:00Z');
  });

  it('uses eventId ascending as tie-breaker when occurredAt is equal', async () => {
    const event1 = createAccessAuditEvent({
      eventId: 'zzz-event-id',
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-1',
      actorUserId: 'user-1',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    const event2 = createAccessAuditEvent({
      eventId: 'aaa-event-id',
      occurredAt: '2026-04-01T10:00:00Z',
      requestId: 'req-2',
      actorUserId: 'user-1',
      action: 'updateRole',
      targetType: 'role',
      targetId: 'role-1',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event1);
    await repository.save(event2);

    const result = await queryAccessHistory(repository, {});
    assert.strictEqual(result[0].eventId, 'aaa-event-id');
    assert.strictEqual(result[1].eventId, 'zzz-event-id');
  });

  it('preserves full AccessAuditEvent payload fields', async () => {
    const input: CreateAccessAuditEventInput = {
      requestId: 'req-123',
      actorUserId: 'user-456',
      action: 'createRole',
      targetType: 'role',
      targetId: 'role-789',
      outcome: 'success',
      module: 'access-control',
      reason: 'test reason',
      route: '/api/v1/roles',
      method: 'POST'
    };

    const event = createAccessAuditEvent(input);
    await repository.save(event);

    const result = await queryAccessHistory(repository, { actorUserId: 'user-456' });
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], event);
  });

  it('handles representative governed-write sample', async () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'admin-user',
      action: 'createRoleAssignment',
      targetType: 'roleAssignment',
      targetId: 'user-001:org-001:role-reviewer',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event);

    const result = await queryAccessHistory(repository, { action: 'createRoleAssignment' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].action, 'createRoleAssignment');
  });

  it('handles representative denied-action sample', async () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'non-admin-user',
      action: 'changeRoleAssignment',
      targetType: 'roleAssignment',
      targetId: 'user-001:org-001:role-coordinator',
      outcome: 'forbidden',
      reason: 'admin_required',
      module: 'access-control'
    });

    await repository.save(event);

    const result = await queryAccessHistory(repository, { outcome: 'forbidden' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].outcome, 'forbidden');
  });

  it('handles representative sensitive-read sample', async () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'authorized-coordinator',
      action: 'viewShariahReviewHistory',
      targetType: 'shariahReview',
      targetId: 'review-001',
      outcome: 'success',
      module: 'shariah-review',
      route: '/api/v1/shariah-reviews/:reviewId/history',
      method: 'GET'
    });

    await repository.save(event);

    const result = await queryAccessHistory(repository, { action: 'viewShariahReviewHistory' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].action, 'viewShariahReviewHistory');
  });

  it('handles edge case with special characters in string fields', async () => {
    const event = createAccessAuditEvent({
      requestId: 'req-123',
      actorUserId: 'user-with@special.chars',
      action: 'createRole',
      targetType: 'role-type_with.special/chars',
      targetId: 'role-123#tag:value',
      outcome: 'success',
      module: 'access-control'
    });

    await repository.save(event);

    const result = await queryAccessHistory(repository, { actorUserId: 'user-with@special.chars' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].actorUserId, 'user-with@special.chars');
  });

  it('handles empty repository returns []', async () => {
    const result = await queryAccessHistory(repository, {});
    assert.strictEqual(result.length, 0);
  });
});
