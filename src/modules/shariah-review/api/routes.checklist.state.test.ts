import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('PUT /api/v1/shariah-reviews/:reviewId/checklist', () => {

  // New test: checklist save allowed from submitted state
  test('should allow checklist save when review is in submitted state', async () => {
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
    
    // Verify the review is in submitted state
    assert.strictEqual(submittedReview.status, 'submitted');

    // Save a checklist for the review in submitted state
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.reviewId, submittedReview.id);
    assert.strictEqual(responseBody.data.status, 'checklistInProgress');
  });


  // New test: checklist save allowed from checklistInProgress state
  test('should allow checklist save when review is in checklistInProgress state', async () => {
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

    // Save an initial checklist to move review to checklistInProgress state
    const initialChecklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        }
      ]
    };

    const initialResponse = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: initialChecklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(initialResponse.statusCode, 200);
    const initialResponseBody = initialResponse.json();
    assert.strictEqual(initialResponseBody.data.status, 'checklistInProgress');

    // Now save an updated checklist while in checklistInProgress state
    const updatedChecklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item2',
          outcome: 'fail',
          comment: 'This item failed',
          evidenceRefs: ['evidence-1']
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: updatedChecklistPayload,
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


  // New test: checklist save blocked from checklistComplete state
  test('should block checklist save when review is in checklistComplete state', async () => {
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

    // Save a complete checklist to move review to checklistComplete state
    const completeChecklistPayload = {
      entries: [
        {
          itemCode: 'item1',
          outcome: 'pass'
        },
        {
          itemCode: 'item2',
          outcome: 'fail',
          comment: 'This item failed',
          evidenceRefs: ['evidence-1']
        },
        {
          itemCode: 'item4',
          outcome: 'pass'
        }
      ],
      completeChecklist: true
    };

    const completeResponse = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: completeChecklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(completeResponse.statusCode, 200);
    const completeResponseBody = completeResponse.json();
    assert.strictEqual(completeResponseBody.data.status, 'checklistComplete');

    // Try to save another checklist while in checklistComplete state
    const updateChecklistPayload = {
      entries: [
        {
          itemCode: 'item3',
          outcome: 'notApplicable'
        }
      ]
    };

    const response = await server.inject({
      method: 'PUT',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/checklist`,
      payload: updateChecklistPayload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Cannot save checklist for review in status: checklistComplete'));
  });


  // New test: checklist save blocked from approved state
  test('should block checklist save when review is in approved state', async () => {
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

    // Manually update the review to approved state (simulating decision recording)
    const reviewInDb = await repository.findById(submittedReview.id);
    if (reviewInDb) {
      reviewInDb.status = 'approved';
      await repository.save(reviewInDb);
    }

    // Try to save a checklist while in approved state
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Cannot save checklist for review in status: approved'));
  });


  // New test: checklist save blocked from rejected state
  test('should block checklist save when review is in rejected state', async () => {
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

    // Manually update the review to rejected state (simulating decision recording)
    const reviewInDb = await repository.findById(submittedReview.id);
    if (reviewInDb) {
      reviewInDb.status = 'rejected';
      await repository.save(reviewInDb);
    }

    // Try to save a checklist while in rejected state
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Cannot save checklist for review in status: rejected'));
  });


  // New test: checklist save blocked from conditionalApproved state
  test('should block checklist save when review is in conditionalApproved state', async () => {
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

    // Manually update the review to conditionalApproved state (simulating decision recording)
    const reviewInDb = await repository.findById(submittedReview.id);
    if (reviewInDb) {
      reviewInDb.status = 'conditionalApproved';
      await repository.save(reviewInDb);
    }

    // Try to save a checklist while in conditionalApproved state
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
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Cannot save checklist for review in status: conditionalApproved'));
  });

  // New test: invalid-state shared audit
  test('should persist shared access audit event for invalid review state', async () => {
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

    // Manually update the review to approved state (invalid state for checklist update)
    const reviewInDb = await repository.findById(submittedReview.id);
    if (reviewInDb) {
      reviewInDb.status = 'approved';
      await repository.save(reviewInDb);
    }

    // Try to save a checklist while in approved state (invalid state)
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
    assert.strictEqual(event.reason, 'invalid_review_status');
    assert.strictEqual(event.actorUserId, 'test-coordinator');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/checklist');
    assert.strictEqual(event.method, 'PUT');
  });
});
