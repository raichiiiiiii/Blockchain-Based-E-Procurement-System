import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type { ShariahReviewSubmitAuditEvent, ShariahReviewChecklistAuditEvent, ShariahReviewDecisionAuditEvent } from './routes.js';

describe('POST /api/v1/shariah-reviews', () => {
  test('should return 403 when user has active non-coordinator role assignment', async () => {
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
      roleCode: 'viewer',
      displayName: 'Viewer',
      scope: 'organization',
      permissions: ['view-shariah-review'],
      status: 'active',
      isSystemReserved: false
    });

    // Create an active non-coordinator assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: otherRole.id,
      status: 'active'
    });

    // Capture audit events
    const auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback
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
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to submit reviews');

    // Verify audit event was emitted
    assert.strictEqual(auditEvents.length, 1);
    const auditEvent = auditEvents[0] as ShariahReviewSubmitAuditEvent;
    assert.strictEqual(auditEvent.action, 'submitShariahReview');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'coordinator_required');
  });

  test('should return 403 when user has no assignments in the target organization', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

    // Create coordinator role
    await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['submit-shariah-review'],
      status: 'active',
      isSystemReserved: true
    });

    // Capture audit events
    const auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback
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
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to submit reviews');

    // Verify audit event was emitted
    assert.strictEqual(auditEvents.length, 1);
    const auditEvent = auditEvents[0] as ShariahReviewSubmitAuditEvent;
    assert.strictEqual(auditEvent.action, 'submitShariahReview');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'coordinator_required');
  });

  test('should return 403 when user only has revoked assignments in the target organization', async () => {
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

    // Create a revoked assignment for the user
    await roleAssignmentRepository.save({
      userId: 'user456',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'revoked'
    });

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
    assert.strictEqual(responseBody.error.message, 'User must have coordinator role to submit reviews');
  });

});
