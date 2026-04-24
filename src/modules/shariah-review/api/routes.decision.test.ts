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
});
