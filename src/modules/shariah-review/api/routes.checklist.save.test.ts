import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('PUT /api/v1/shariah-reviews/:reviewId/checklist', () => {

  test('should save a valid complete checklist successfully', async () => {
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

    // First submit a review to have something to add checklist to
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
    
    // Now save a checklist for the review
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item2',
          outcome: 'fail',
          comment: 'This item failed because of reason X',
          evidenceRefs: ['evidence-1', 'evidence-2']
        },
        {
          itemCode: 'item3',
          outcome: 'notApplicable',
          comment: 'Not applicable in this context'
        },
        {
          itemCode: 'item4',
          outcome: 'pass'
        }
      ],
      reviewerComment: 'Overall the review looks good'
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.reviewId, submittedReview.id);
    assert.strictEqual(responseBody.data.status, 'checklistComplete');
  });


  test('should save incomplete checklist and return checklistInProgress status', async () => {
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

    // Save an incomplete checklist (empty entries for this test)
    const checklistPayload = {
      entries: [],
      reviewerComment: 'Work in progress'
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.reviewId, submittedReview.id);
    assert.strictEqual(responseBody.data.status, 'checklistInProgress');
  });


  // New test: partial save without completeChecklist and missing mandatory seeded items
  test('should save partial checklist without completeChecklist and return checklistInProgress when missing mandatory items', async () => {
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

    // Save a partial checklist without completeChecklist flag and missing mandatory items
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1', // Mandatory
          outcome: 'pass'
        }
        // Missing other mandatory items (item2, item4)
      ],
      reviewerComment: 'Partial work in progress'
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.reviewId, submittedReview.id);
    assert.strictEqual(responseBody.data.status, 'checklistInProgress');
  });


  // Updated test: completeChecklist: true with valid full checklist
  test('should save complete checklist with completeChecklist flag and return checklistComplete status', async () => {
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

    // Save a complete checklist with completeChecklist flag
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item2',
          outcome: 'fail',
          comment: 'This item failed because of reason X',
          evidenceRefs: ['evidence-1', 'evidence-2']
        },
        {
          itemCode: 'item3',
          outcome: 'notApplicable',
          comment: 'Not applicable in this context'
        },
        {
          itemCode: 'item4',
          outcome: 'pass'
        }
      ],
      reviewerComment: 'Overall the review looks good',
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

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.reviewId, submittedReview.id);
    assert.strictEqual(responseBody.data.status, 'checklistComplete');
  });

  // New test: successful checklist save shared audit
  test('should persist shared access audit event for successful checklist save', async () => {
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

    // Save a checklist
    const checklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item2',
          outcome: 'fail',
          comment: 'This item failed because of reason X',
          evidenceRefs: ['evidence-1', 'evidence-2']
        }
      ],
      reviewerComment: 'Test checklist save'
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: checklistPayload,
      headers: {
        'x-actor-id': 'test-coordinator'
      }
    });

    assert.strictEqual(response.statusCode, 200);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'updateShariahChecklist');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, submittedReview.id);
    assert.strictEqual(event.outcome, 'success');
    assert.strictEqual(event.actorUserId, 'test-coordinator');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/checklist');
    assert.strictEqual(event.method, 'PUT');
  });
});
