import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';

describe('PUT /api/v1/shariah-reviews/:reviewId/checklist', () => {

  // New test: authorized actor can save checklist
  test('should allow authorized coordinator to save checklist', async () => {
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
      userId: 'authorizedUser',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // First submit a review
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

    const submitResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'authorizedUser'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Save a checklist with authorized user
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
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'authorizedUser'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.reviewId, submittedReview.id);
    assert.strictEqual(responseBody.data.status, 'checklistInProgress');
  });


  // New test: actor with no assignment is denied
  test('should deny checklist save for user with no role assignment', async () => {
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

    // Create an active coordinator assignment for the authorized user
    await roleAssignmentRepository.save({
      userId: 'authorizedUser',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // First submit a review with authorized user
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

    const submitResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'authorizedUser'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with user who has no assignment
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
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'userWithNoAssignment'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to save checklists');
  });


  // New test: actor with revoked assignment is denied
  test('should deny checklist save for user with revoked role assignment', async () => {
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

    // Create an active coordinator assignment for the authorized user
    await roleAssignmentRepository.save({
      userId: 'authorizedUser',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // Create a revoked coordinator assignment for the unauthorized user
    await roleAssignmentRepository.save({
      userId: 'userWithRevokedAssignment',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'revoked'
    });

    // First submit a review with authorized user
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

    const submitResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'authorizedUser'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with user who has revoked assignment
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
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'userWithRevokedAssignment'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to save checklists');
  });


  // New test: actor with active non-coordinator assignment is denied
  test('should deny checklist save for user with active non-coordinator assignment', async () => {
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

    // Create another role
    const otherRole = await roleRepository.save({
      roleCode: 'otherRole',
      displayName: 'Other Role',
      scope: 'organization',
      permissions: ['some-other-permission'],
      status: 'active',
      isSystemReserved: false
    });

    // Create an active coordinator assignment for the authorized user
    await roleAssignmentRepository.save({
      userId: 'authorizedUser',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // Create an active assignment for the user with a non-coordinator role
    await roleAssignmentRepository.save({
      userId: 'userWithNonCoordinatorRole',
      organizationId: 'org123',
      roleId: otherRole.id,
      status: 'active'
    });

    // First submit a review with authorized user
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

    const submitResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'authorizedUser'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with user who has active non-coordinator assignment
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
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'userWithNonCoordinatorRole'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to save checklists');
  });
});
