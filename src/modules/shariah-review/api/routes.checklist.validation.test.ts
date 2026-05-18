import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('PUT /api/v1/shariah-reviews/:reviewId/checklist', () => {

  test('should return 400 when duplicate itemCode entries are provided', async () => {
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with duplicate itemCodes
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item1', // Duplicate itemCode
          outcome: 'fail',
          comment: 'This item failed'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Duplicate itemCode entries are not allowed');
  });


  test('should return 400 when fail outcome has no comment', async () => {
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with fail outcome but no comment
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'fail'
          // Missing comment
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('must have a comment'));
  });


  test('should return 400 when x-actor-id header is missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/some-review/checklist',
      payload: {
        entries: []
      }
      // Missing x-actor-id header
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });


  test('should return 400 when itemCode is unknown', async () => {
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with unknown itemCode
    const checklistPayload = {
      entries: [
        {
          itemCode: 'unknownItem',
          outcome: 'pass'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Unknown checklist item code'));
  });


  test('should return 400 when evidenceRefs missing for evidence-required item', async () => {
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with missing evidenceRefs for item2 which requires evidence
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item2',
          outcome: 'fail',
          comment: 'This item failed'
          // Missing evidenceRefs
        },
        {
          itemCode: 'item4',
          outcome: 'pass'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('requires evidence'));
  });


  // New test: completeChecklist: true with missing mandatory seeded item
  test('should return 400 when completeChecklist is true but missing mandatory seeded items', async () => {
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to complete checklist with missing mandatory items
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1', // Mandatory
          outcome: 'pass'
        }
        // Missing other mandatory items (item2, item4)
      ],
      completeChecklist: true
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'All mandatory checklist items must be provided for completion');
  });

  // New test: validationError shared audit
  test('should persist shared access audit event for validationError outcome', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

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
      userId: 'test-coordinator',
      organizationId: 'test-org',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // First submit a review
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const payload = {
      organizationId: 'test-org',
      title: 'Test Review',
      summary: 'This is a test summary.'
    };

    const submitResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'test-coordinator'
      }
    });

    assert.strictEqual(submitResponse.statusCode, 201);
    const submittedReview = submitResponse.json().data;

    // Try to save a checklist with duplicate itemCodes (causes validationError)
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item1', // Duplicate itemCode
          outcome: 'fail',
          comment: 'This item failed'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'test-coordinator'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'updateShariahChecklist');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, submittedReview.id);
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'invalid_checklist_input');
    assert.strictEqual(event.actorUserId, 'test-coordinator');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/checklist');
    assert.strictEqual(event.method, 'PUT');
  });
});
