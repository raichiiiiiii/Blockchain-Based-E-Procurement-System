import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';

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
