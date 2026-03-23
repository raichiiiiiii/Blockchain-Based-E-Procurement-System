import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';

describe('POST /api/v1/shariah-reviews', () => {
  test('should submit a review successfully with valid body and x-actor-id', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    
    // Create an active assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: 'role123',
      status: 'active'
    });
    
    const server = createTestableServer({ 
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.organizationId, payload.organizationId);
    assert.strictEqual(responseBody.data.title, payload.title);
    assert.strictEqual(responseBody.data.summary, payload.summary);
    assert.strictEqual(responseBody.data.status, 'submitted');
    assert.strictEqual(responseBody.data.submittedByUserId, 'user456');
    assert.ok(responseBody.data.id);
    assert.ok(responseBody.data.createdAt);
  });

  test('should return 400 when x-actor-id header is missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const server = createTestableServer({ shariahReviewRepository: repository });

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
    const server = createTestableServer({ shariahReviewRepository: repository });

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
    
    // Create an active assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: 'role123',
      status: 'active'
    });
    
    const server = createTestableServer({ 
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository
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
    // Fastify validation error structure
    const responseBody = response.json();
    assert.ok(responseBody.message); // Fastify validation error has a message
  });

  test('should return 400 when title is whitespace-only (service invalidInput)', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    
    // Create an active assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: 'role123',
      status: 'active'
    });
    
    const server = createTestableServer({ 
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository
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

  test('submittedByUserId in the success response should match x-actor-id', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    
    // Create an active assignment for the user
    await roleAssignmentRepository.save({
      userId: 'specific-user-id',
      organizationId: 'org789',
      roleId: 'role123',
      status: 'active'
    });
    
    const server = createTestableServer({ 
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository
    });

    const payload = {
      organizationId: 'org789',
      title: 'Another Review',
      summary: 'Summary for another review.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'specific-user-id'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.submittedByUserId, 'specific-user-id');
  });

  test('should return 403 when user has no assignments in the target organization', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const server = createTestableServer({ 
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User does not have required permissions for this organization');
  });

  test('should return 403 when user only has revoked assignments in the target organization', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    
    // Create a revoked assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: 'role123',
      status: 'revoked'
    });
    
    const server = createTestableServer({ 
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User does not have required permissions for this organization');
  });
});
