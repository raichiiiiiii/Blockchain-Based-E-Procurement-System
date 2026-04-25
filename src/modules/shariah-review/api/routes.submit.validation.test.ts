import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';

describe('POST /api/v1/shariah-reviews', () => {
  test('should return 400 when x-actor-id header is missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const payload = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload
      // x-actor-id header is missing
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('should return 400 when x-actor-id header is blank/whitespace-only', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const payload = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': '   ' // Whitespace-only
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('should return 400 when required body fields are missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['submit-shariah-review'],
      status: 'active',
      isSystemReserved: true
    });

    // Create an active coordinator assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    // Test with completely empty payload
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: {},
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message); // Message should be present
  });

  test('should return 400 when title is whitespace-only (service invalidInput)', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['submit-shariah-review'],
      status: 'active',
      isSystemReserved: true
    });

    // Create an active coordinator assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const payload = {
      organizationId: 'org123',
      title: '   ', // Whitespace-only
      summary: 'This is a test summary.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid review submission input');
  });

});
