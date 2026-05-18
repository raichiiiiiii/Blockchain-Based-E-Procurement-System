import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('PUT /api/v1/shariah-reviews/:reviewId/checklist', () => {

  test('should return 404 when review is not found', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/nonexistent-review/checklist',
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 404);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.strictEqual(responseBody.error.message, 'Review not found');
  });

  test('should persist shared access audit event for not found review', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/nonexistent-review/checklist',
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'test-user'
      }
    });

    assert.strictEqual(response.statusCode, 404);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'updateShariahChecklist');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, 'nonexistent-review');
    assert.strictEqual(event.outcome, 'notFound');
    assert.strictEqual(event.reason, 'review_not_found');
    assert.strictEqual(event.actorUserId, 'test-user');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/checklist');
    assert.strictEqual(event.method, 'PUT');
  });
});
