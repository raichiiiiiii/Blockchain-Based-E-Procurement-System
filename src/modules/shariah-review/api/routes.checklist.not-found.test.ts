import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';

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
});
