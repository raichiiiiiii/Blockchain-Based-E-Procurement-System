import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import type { RoleAssignment } from '../../access-control/domain/role-assignment.js';
import type {
  ShariahReviewChecklistAuditEvent
} from './routes.js';

describe('PUT /api/v1/shariah-reviews/:reviewId/checklist', () => {
  test('should return 400 when actor context is missing', async () => {
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
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          }
        ]
      }
      // No x-actor-id header
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('should return 404 when review is not found', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/nonexistent/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          }
        ]
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 404);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.strictEqual(responseBody.error.message, 'Review not found');
  });

  test('should save valid checklist and return checklistInProgress for submitted review', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z'
    };
    await repository.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // Capture audit events
    const auditEvents: ShariahReviewChecklistAuditEvent[] = [];
    const auditCallback = (event: any) => {
      if (event.action === 'saveShariahReviewChecklist') {
        auditEvents.push(event);
      }
    };

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          }
        ],
        reviewerComment: 'Test comment'
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.reviewId, 'review123');
    assert.strictEqual(responseBody.data.status, 'checklistInProgress');

    // Verify audit event was emitted
    assert.strictEqual(auditEvents.length, 1);
    assert.strictEqual(auditEvents[0].action, 'saveShariahReviewChecklist');
    assert.strictEqual(auditEvents[0].outcome, 'success');
    assert.strictEqual(auditEvents[0].actorId, 'coordinator-user');
  });

  test('should complete checklist and return checklistComplete when completeChecklist is true', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z'
    };
    await repository.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // Capture audit events
    const auditEvents: ShariahReviewChecklistAuditEvent[] = [];
    const auditCallback = (event: any) => {
      if (event.action === 'saveShariahReviewChecklist') {
        auditEvents.push(event);
      }
    };

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          },
          {
            itemCode: 'item2',
            outcome: 'pass',
            evidenceRefs: ['evidence-001']
          },
          {
            itemCode: 'item4',
            outcome: 'pass'
          }
        ],
        completeChecklist: true
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.reviewId, 'review123');
    assert.strictEqual(responseBody.data.status, 'checklistComplete');

    // Verify audit event was emitted
    assert.strictEqual(auditEvents.length, 1);
    assert.strictEqual(auditEvents[0].action, 'saveShariahReviewChecklist');
    assert.strictEqual(auditEvents[0].outcome, 'success');
    assert.strictEqual(auditEvents[0].actorId, 'coordinator-user');
  });

  test('should return 400 when failed item has no comment', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z'
    };
    await repository.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'fail'
            // No comment for failed outcome
          }
        ]
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Failed checklist item'));
    assert.ok(responseBody.error.message.includes('must have a comment'));
  });

  test('should return 400 when duplicate itemCode is provided', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z'
    };
    await repository.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          },
          {
            itemCode: 'item1', // Duplicate itemCode
            outcome: 'fail',
            comment: 'Test comment'
          }
        ]
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Duplicate itemCode entries are not allowed'));
  });

  test('should return 400 when trying to update checklist for review in final decision state', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a review in approved state (final decision state)
    const approvedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'approved', // Final decision state
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z',
      decidedAt: '2026-01-02T00:00:00Z',
      rationale: 'Approved'
    };
    await repository.save(approvedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          }
        ]
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Cannot save checklist for review in status: approved'));
  });

  test('should return 403 when user is not coordinator for the organization', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z'
    };
    await repository.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Note: No role assignment for this user in this organization

    // Capture audit events
    const auditEvents: ShariahReviewChecklistAuditEvent[] = [];
    const auditCallback = (event: any) => {
      if (event.action === 'saveShariahReviewChecklist') {
        auditEvents.push(event);
      }
    };

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item1',
            outcome: 'pass'
          }
        ]
      },
      headers: {
        'x-actor-id': 'regular-user' // Not a coordinator
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to save checklists');

    // Verify audit event was emitted
    assert.strictEqual(auditEvents.length, 1);
    assert.strictEqual(auditEvents[0].action, 'saveShariahReviewChecklist');
    assert.strictEqual(auditEvents[0].outcome, 'forbidden');
    assert.strictEqual(auditEvents[0].actorId, 'regular-user');
    assert.strictEqual(auditEvents[0].reason, 'coordinator_required');
  });

  test('should return 400 when evidence is required but missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review123',
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00Z'
    };
    await repository.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['save-shariah-checklist'],
      status: 'active',
      isSystemReserved: true
    });

    // Create role assignment
    await roleAssignmentRepository.save({
      userId: 'coordinator-user',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/shariah-reviews/review123/checklist',
      payload: {
        entries: [
          {
            itemCode: 'item2', // This item requires evidence according to seeded items
            outcome: 'pass'
            // No evidenceRefs provided
          }
        ],
        completeChecklist: true
      },
      headers: {
        'x-actor-id': 'coordinator-user'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Checklist item \'item2\' requires evidence'));
  });
});
