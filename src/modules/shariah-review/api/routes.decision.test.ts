import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import type { FastifyInstance } from 'fastify';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import type { PersistedRole } from '../../access-control/application/role-repository.js';
import type { RoleAssignment } from '../../access-control/domain/role-assignment.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('Shariah Review Decision Routes', () => {
  let app: FastifyInstance;
  let testReview: ShariahReview;
  let coordinatorRole: PersistedRole;
  let coordinatorAssignment: RoleAssignment;
  let repository: InMemoryShariahReviewRepository;
  let roleRepository: InMemoryRoleRepository;
  let roleAssignmentRepository: InMemoryRoleAssignmentRepository;

  beforeEach(async () => {
    repository = new InMemoryShariahReviewRepository();
    roleRepository = new InMemoryRoleRepository();
    roleAssignmentRepository = new InMemoryRoleAssignmentRepository();

    app = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository
    });

    // Create a coordinator role
    coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['manage-shariah-reviews'],
      status: 'active',
      isSystemReserved: true
    });

    // Create a test organization through the API
    const orgResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-001',
        legalName: 'Test Organization',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create a role assignment for the coordinator
    coordinatorAssignment = {
      userId: 'coordinator-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(coordinatorAssignment);

    // Create a test review in submitted state through the API
    const reviewResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Test Review',
        summary: 'Test review summary'
      }
    });

    testReview = reviewResponse.json().data;

    // Update the review to checklistComplete state directly in repository
    const updatedReview: ShariahReview = {
      ...testReview,
      status: 'checklistComplete'
    };

    await repository.save(updatedReview);
    testReview = updatedReview;
  });

  it('should approve from checklistComplete successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${testReview.id}/decision`,
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'All requirements met'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const result = response.json();
    assert.strictEqual(result.data.reviewId, testReview.id);
    assert.strictEqual(result.data.status, 'approved');
    assert.ok(result.data.decidedAt);
  });

  it('should reject from checklistComplete successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${testReview.id}/decision`,
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'rejected',
        rationale: 'Does not meet requirements'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const result = response.json();
    assert.strictEqual(result.data.reviewId, testReview.id);
    assert.strictEqual(result.data.status, 'rejected');
    assert.ok(result.data.decidedAt);
  });

  it('should conditionally approve with valid conditions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${testReview.id}/decision`,
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'conditionalApproved',
        rationale: 'Requires additional documentation',
        conditions: [
          {
            description: 'Provide additional financial statements',
            dueDate: '2026-12-31'
          }
        ]
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const result = response.json();
    assert.strictEqual(result.data.reviewId, testReview.id);
    assert.strictEqual(result.data.status, 'conditionalApproved');
    assert.ok(result.data.decidedAt);
  });

  it('should block decision from submitted state', async () => {
    // Create a review in submitted state through the API
    const orgResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-002',
        legalName: 'Test Organization 2',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create role assignment for this organization
    const secondAssignment: RoleAssignment = {
      userId: 'coordinator-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(secondAssignment);

    const reviewResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Another Test Review',
        summary: 'Another test review summary'
      }
    });

    const submittedReview = reviewResponse.json().data;

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${submittedReview.id}/decision`,
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'Looks good'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const result = response.json();
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
  });

  it('should return 400 for missing rationale', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${testReview.id}/decision`,
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'approved',
        rationale: ''
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const result = response.json();
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
  });

  it('should return 400 for conditionalApproved without conditions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${testReview.id}/decision`,
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'conditionalApproved',
        rationale: 'Needs conditions'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const result = response.json();
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
  });

  it('should return 404 for not-found review', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews/non-existent-review/decision',
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'Good to go'
      }
    });

    assert.strictEqual(response.statusCode, 404);
    const result = response.json();
    assert.strictEqual(result.error.code, 'NOT_FOUND');
  });

  // New test: decision authorization denied shared audit
  it('should persist shared access audit event for forbidden decision attempt', async () => {
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Use the same repositories as the main test suite
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    // Create a test organization through the server
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-003',
        legalName: 'Test Organization 3',
        organizationType: 'financial'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const organization = orgResponse.json().data;

    // Create a role assignment for the coordinator user who will submit the review
    const coordinatorAssignment: RoleAssignment = {
      userId: 'coordinator-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(coordinatorAssignment);

    // Create a test review in submitted state through the server
    const reviewResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'coordinator-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Test Review for Forbidden Decision',
        summary: 'Test review summary'
      }
    });

    // Assert that the review was created successfully
    assert.strictEqual(reviewResponse.statusCode, 201);
    const review = reviewResponse.json().data;
    assert.ok(review?.id, 'Review should have been created with a valid ID');

    // Update the review to checklistComplete state directly in the same repository
    const updatedReview: ShariahReview = {
      ...review,
      status: 'checklistComplete'
    };

    await repository.save(updatedReview);

    // Try to record a decision with a user who doesn't have coordinator role
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${updatedReview.id}/decision`,
      headers: {
        'x-actor-id': 'unauthorized-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'All requirements met'
      }
    });

    assert.strictEqual(response.statusCode, 403);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'recordShariahDecision');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, updatedReview.id);
    assert.strictEqual(event.outcome, 'forbidden');
    assert.strictEqual(event.reason, 'reviewer_required');
    assert.strictEqual(event.actorUserId, 'unauthorized-user');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/decision');
    assert.strictEqual(event.method, 'POST');
  });

  // New test: decision success shared audit
  it('should persist shared access audit event for successful decision recording', async () => {
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a new server with the access audit event repository
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    // Create a test organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-004',
        legalName: 'Test Organization 4',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create coordinator role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'authorized-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(assignment);

    // Create a test review in checklistComplete state
    const reviewResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Test Review for Successful Decision',
        summary: 'Test review summary'
      }
    });

    const review = reviewResponse.json().data;

    // Update the review to checklistComplete state directly in repository
    const updatedReview: ShariahReview = {
      ...review,
      status: 'checklistComplete'
    };

    await repository.save(updatedReview);

    // Record a decision with an authorized user
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${updatedReview.id}/decision`,
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'All requirements met'
      }
    });

    assert.strictEqual(response.statusCode, 200);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'recordShariahDecision');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, updatedReview.id);
    assert.strictEqual(event.outcome, 'success');
    assert.strictEqual(event.actorUserId, 'authorized-user');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/decision');
    assert.strictEqual(event.method, 'POST');
  });

  // New test: decision notFound shared audit
  it('should persist shared access audit event for notFound decision attempt', async () => {
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a new server with the access audit event repository
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    // Create a coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['manage-shariah-reviews'],
      status: 'active',
      isSystemReserved: true
    });

    // Create a test organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-005',
        legalName: 'Test Organization 5',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create coordinator role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'authorized-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(assignment);

    // Try to record a decision for a non-existent review
    const nonExistentReviewId = 'non-existent-review-id';
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${nonExistentReviewId}/decision`,
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'All requirements met'
      }
    });

    assert.strictEqual(response.statusCode, 404);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'recordShariahDecision');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, nonExistentReviewId);
    assert.strictEqual(event.outcome, 'notFound');
    assert.strictEqual(event.reason, 'review_not_found');
    assert.strictEqual(event.actorUserId, 'authorized-user');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/decision');
    assert.strictEqual(event.method, 'POST');
  });

  // New test: invalid decision input shared audit (missing rationale)
  it('should persist shared access audit event for invalid decision input (missing rationale)', async () => {
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a new server with the access audit event repository
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    // Create a coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['manage-shariah-reviews'],
      status: 'active',
      isSystemReserved: true
    });

    // Create a test organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-006',
        legalName: 'Test Organization 6',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create coordinator role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'authorized-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(assignment);

    // Create a test review in checklistComplete state
    const reviewResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Test Review for Invalid Decision Input',
        summary: 'Test review summary'
      }
    });

    const review = reviewResponse.json().data;

    // Update the review to checklistComplete state directly in repository
    const updatedReview: ShariahReview = {
      ...review,
      status: 'checklistComplete'
    };

    await repository.save(updatedReview);

    // Try to record a decision with missing rationale
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${updatedReview.id}/decision`,
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        outcome: 'approved',
        rationale: '' // Empty rationale should trigger validation error
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'recordShariahDecision');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, updatedReview.id);
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'invalid_decision_input');
    assert.strictEqual(event.actorUserId, 'authorized-user');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/decision');
    assert.strictEqual(event.method, 'POST');
  });

  // New test: missing actor context shared audit
  it('should persist shared access audit event for missing actor context', async () => {
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a new server with the access audit event repository
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    // Create a coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['manage-shariah-reviews'],
      status: 'active',
      isSystemReserved: true
    });

    // Create a test organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-007',
        legalName: 'Test Organization 7',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create coordinator role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'authorized-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(assignment);

    // Create a test review in checklistComplete state
    const reviewResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Test Review for Missing Actor Context',
        summary: 'Test review summary'
      }
    });

    const review = reviewResponse.json().data;

    // Update the review to checklistComplete state directly in repository
    const updatedReview: ShariahReview = {
      ...review,
      status: 'checklistComplete'
    };

    await repository.save(updatedReview);

    // Try to record a decision without x-actor-id header
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${updatedReview.id}/decision`,
      // No x-actor-id header
      body: {
        outcome: 'approved',
        rationale: 'All requirements met'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'recordShariahDecision');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, updatedReview.id);
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'missing_actor_context');
    assert.strictEqual(event.actorUserId, 'unknown');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/decision');
    assert.strictEqual(event.method, 'POST');
  });

  // New test: invalid decision state shared audit
  it('should persist shared access audit event for invalid decision state', async () => {
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a new server with the access audit event repository
    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleRepository: roleRepository,
      roleAssignmentRepository: roleAssignmentRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    // Create a coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['manage-shariah-reviews'],
      status: 'active',
      isSystemReserved: true
    });

    // Create a test organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      headers: {
        'x-actor-id': 'admin-user'
      },
      body: {
        registrationNumber: 'TEST-008',
        legalName: 'Test Organization 8',
        organizationType: 'financial'
      }
    });

    const organization = orgResponse.json().data;

    // Create coordinator role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'authorized-user',
      organizationId: organization.id,
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepository.save(assignment);

    // Create a test review in submitted state (not eligible for decision)
    const reviewResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        organizationId: organization.id,
        title: 'Test Review for Invalid Decision State',
        summary: 'Test review summary'
      }
    });

    const review = reviewResponse.json().data;
    // Keep the review in 'submitted' state - not eligible for decision

    // Try to record a decision on a review that's not in checklistComplete state
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/shariah-reviews/${review.id}/decision`,
      headers: {
        'x-actor-id': 'authorized-user'
      },
      body: {
        outcome: 'approved',
        rationale: 'All requirements met'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'recordShariahDecision');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, review.id);
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'invalid_review_status');
    assert.strictEqual(event.actorUserId, 'authorized-user');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews/:reviewId/decision');
    assert.strictEqual(event.method, 'POST');
  });
});
