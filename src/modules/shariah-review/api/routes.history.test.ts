import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestableServer } from '../../../app/server.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type { RoleAssignment } from '../../access-control/domain/role-assignment.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

// Custom test repository that throws an error when findById is called
class ThrowingShariahReviewRepository extends InMemoryShariahReviewRepository {
  async findById(_id: string): Promise<ShariahReview | null> {
    throw new Error('Simulated database error during findById');
  }
}

test('Shariah review history endpoint', async (t) => {
  await t.test('returns 404 for non-existent review', async () => {
    const server = await createTestableServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/nonexistent/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });

    assert.equal(response.statusCode, 404);
    const payload = JSON.parse(response.payload);
    assert.equal(payload.error.code, 'NOT_FOUND');
  });

  await t.test('returns history for submitted-only review', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review1',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z'
    };

    await reviewRepo.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review1/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });

    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;

    assert.equal(data.reviewId, 'review1');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'submitted');
    assert.equal(data.history.length, 1);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[0].toStatus, 'submitted');
    assert.equal(data.history[0].fromStatus, null);
  });

  await t.test('returns history for checklistInProgress review', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();

    // Create a review with checklist in progress
    const inProgressReview: ShariahReview = {
      id: 'review2',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistInProgress',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z',
      checklist: {
        entries: [
          { itemCode: 'item1', outcome: 'pass' }
        ],
        status: 'checklistInProgress'
      }
    };

    await reviewRepo.save(inProgressReview);

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review2/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });

    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;

    assert.equal(data.reviewId, 'review2');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'checklistInProgress');
    assert.equal(data.history.length, 2);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[1].action, 'checklistSaved');
    assert.equal(data.history[1].toStatus, 'checklistInProgress');
  });

  await t.test('returns history for checklistComplete review without decision', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();

    // Create a review with completed checklist but no decision
    const completeReview: ShariahReview = {
      id: 'review3',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z',
      checklist: {
        entries: [
          { itemCode: 'item1', outcome: 'pass' },
          { itemCode: 'item2', outcome: 'pass' }
        ],
        status: 'checklistComplete'
      }
    };

    await reviewRepo.save(completeReview);

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review3/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });

    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;

    assert.equal(data.reviewId, 'review3');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'checklistComplete');
    assert.equal(data.history.length, 3);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[1].action, 'checklistSaved');
    assert.equal(data.history[2].action, 'checklistCompleted');
    assert.equal(data.history[2].toStatus, 'checklistComplete');
  });

  await t.test('returns history for conditionalApproved review with decision details', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();

    // Create a conditionally approved review
    const approvedReview: ShariahReview = {
      id: 'review4',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'conditionalApproved',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z',
      decidedAt: '2026-01-02T00:00:00.000Z',
      rationale: 'Approved with conditions',
      conditions: [
        {
          description: 'Update documentation',
          dueDate: '2026-06-01'
        }
      ],
      checklist: {
        entries: [
          { itemCode: 'item1', outcome: 'pass' },
          { itemCode: 'item2', outcome: 'pass' }
        ],
        status: 'checklistComplete'
      }
    };

    await reviewRepo.save(approvedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review4/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });

    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;

    assert.equal(data.reviewId, 'review4');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'conditionalApproved');
    assert.equal(data.history.length, 4);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[1].action, 'checklistSaved');
    assert.equal(data.history[2].action, 'checklistCompleted');
    assert.equal(data.history[3].action, 'decisionRecorded');
    assert.equal(data.history[3].toStatus, 'conditionalApproved');
    assert.equal(data.history[3].rationale, 'Approved with conditions');
    assert.ok(Array.isArray(data.history[3].conditions));
    assert.equal(data.history[3].conditions.length, 1);
    assert.equal(data.history[3].conditions[0].description, 'Update documentation');
    assert.equal(data.history[3].conditions[0].dueDate, '2026-06-01');
  });

  await t.test('should persist shared access audit event for successful history read', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review5',
      organizationId: 'org1',
      title: 'Test Review for Audit',
      summary: 'Test Summary for Audit',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z'
    };

    await reviewRepo.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review5/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });

    // Assert normal response is preserved
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;

    assert.equal(data.reviewId, 'review5');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'submitted');

    // Assert shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event

    assert.ok(event, 'Expected audit event to be recorded');

    assert.equal(event.schemaVersion, 'access-audit-event.v1');
    assert.equal(event.module, 'shariah-review');
    assert.equal(event.action, 'viewShariahReviewHistory');
    assert.equal(event.targetType, 'shariahReview');
    assert.equal(event.targetId, 'review5');
    assert.equal(event.outcome, 'success');
    assert.equal(event.actorUserId, 'user123');
    assert.ok(event.requestId, 'Expected requestId to exist');
    assert.ok(event.occurredAt, 'Expected occurredAt to exist');
    assert.ok(event.evidence.payloadHash, 'Expected payloadHash to exist');
    assert.equal(event.evidence.canonicalization, 'json-stable-v1');
    assert.equal(event.route, '/api/v1/shariah-reviews/:reviewId/history');
    assert.equal(event.method, 'GET');
  });

  await t.test('should persist shared access audit event for notFound history read', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const nonExistentReviewId = 'nonexistent-review-id';
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/shariah-reviews/${nonExistentReviewId}/history`,
      headers: {
        'x-actor-id': 'user123'
      }
    });

    // Assert normal 404 response is preserved
    assert.equal(response.statusCode, 404);
    const payload = JSON.parse(response.payload);
    assert.equal(payload.error.code, 'NOT_FOUND');
    assert.equal(payload.error.message, 'Review not found');

    // Assert shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event

    assert.ok(event, 'Expected audit event to be recorded');

    assert.equal(event.schemaVersion, 'access-audit-event.v1');
    assert.equal(event.module, 'shariah-review');
    assert.equal(event.action, 'viewShariahReviewHistory');
    assert.equal(event.targetType, 'shariahReview');
    assert.equal(event.targetId, nonExistentReviewId);
    assert.equal(event.outcome, 'notFound');
    assert.equal(event.reason, 'review_not_found');
    assert.equal(event.actorUserId, 'user123');
    assert.ok(event.requestId, 'Expected requestId to exist');
    assert.ok(event.occurredAt, 'Expected occurredAt to exist');
    assert.ok(event.evidence.payloadHash, 'Expected payloadHash to exist');
    assert.equal(event.evidence.canonicalization, 'json-stable-v1');
    assert.equal(event.route, '/api/v1/shariah-reviews/:reviewId/history');
    assert.equal(event.method, 'GET');
  });

  await t.test('should persist shared access audit event for forbidden history read', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review6',
      organizationId: 'org1',
      title: 'Test Review for Forbidden Audit',
      summary: 'Test Summary for Forbidden Audit',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z'
    };

    await reviewRepo.save(submittedReview);

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Note: We intentionally do NOT create a role assignment for the unauthorized user
    // This will cause the forbidden response

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review6/history',
      headers: {
        'x-actor-id': 'unauthorized-user'
      }
    });

    // Assert normal 403 response is preserved
    assert.equal(response.statusCode, 403);
    const payload = JSON.parse(response.payload);
    assert.equal(payload.error.code, 'FORBIDDEN');
    assert.equal(payload.error.message, 'Not authorized to view Shariah review history');

    // Assert shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event

    assert.ok(event, 'Expected audit event to be recorded');

    assert.equal(event.schemaVersion, 'access-audit-event.v1');
    assert.equal(event.module, 'shariah-review');
    assert.equal(event.action, 'viewShariahReviewHistory');
    assert.equal(event.targetType, 'shariahReview');
    assert.equal(event.targetId, 'review6');
    assert.equal(event.outcome, 'forbidden');
    assert.equal(event.reason, 'insufficient_permissions');
    assert.equal(event.actorUserId, 'unauthorized-user');
    assert.ok(event.requestId, 'Expected requestId to exist');
    assert.ok(event.occurredAt, 'Expected occurredAt to exist');
    assert.ok(event.evidence.payloadHash, 'Expected payloadHash to exist');
    assert.equal(event.evidence.canonicalization, 'json-stable-v1');
    assert.equal(event.route, '/api/v1/shariah-reviews/:reviewId/history');
    assert.equal(event.method, 'GET');
  });

  await t.test('should persist shared access audit event when history read fails unexpectedly', async () => {
    // Setup repositories
    const reviewRepo = new ThrowingShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create coordinator role
    const coordinatorRole = await roleRepo.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['view-review-history'],
      status: 'active',
      isSystemReserved: false
    });

    // Create role assignment for the user
    const assignment: RoleAssignment = {
      userId: 'user123',
      organizationId: 'org1',
      roleId: coordinatorRole.id,
      status: 'active'
    };

    await roleAssignmentRepo.save(assignment);

    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const reviewId = 'test-review-id';
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/shariah-reviews/${reviewId}/history`,
      headers: {
        'x-actor-id': 'user123'
      }
    });

    // Assert error response is preserved (likely 500)
    assert.equal(response.statusCode, 500);

    // Assert shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event

    assert.ok(event, 'Expected audit event to be recorded');

    assert.equal(event.schemaVersion, 'access-audit-event.v1');
    assert.equal(event.module, 'shariah-review');
    assert.equal(event.action, 'viewShariahReviewHistory');
    assert.equal(event.targetType, 'shariahReview');
    assert.equal(event.targetId, reviewId);
    assert.equal(event.outcome, 'error');
    assert.equal(event.reason, 'history_read_failed');
    assert.equal(event.actorUserId, 'user123');
    assert.ok(event.requestId, 'Expected requestId to exist');
    assert.ok(event.occurredAt, 'Expected occurredAt to exist');
    assert.ok(event.evidence.payloadHash, 'Expected payloadHash to exist');
    assert.equal(event.evidence.canonicalization, 'json-stable-v1');
    assert.equal(event.route, '/api/v1/shariah-reviews/:reviewId/history');
    assert.equal(event.method, 'GET');
  });
});
