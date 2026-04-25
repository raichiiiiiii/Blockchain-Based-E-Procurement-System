import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type { ShariahReviewSubmitAuditEvent, ShariahReviewChecklistAuditEvent, ShariahReviewDecisionAuditEvent } from './routes.js';

describe('POST /api/v1/shariah-reviews', () => {
  test('should emit audit event for successful submission', async () => {
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

    // Verify successful response
    assert.strictEqual(response.statusCode, 201);

    // Verify audit event was emitted
    assert.strictEqual(auditEvents.length, 1);
    const auditEvent = auditEvents[0] as ShariahReviewSubmitAuditEvent;
    assert.strictEqual(auditEvent.action, 'submitShariahReview');
    assert.strictEqual(auditEvent.targetType, 'shariahReview');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'user456');
    assert.ok(auditEvent.requestId);
    assert.ok(auditEvent.timestamp);
    assert.ok(auditEvent.targetId);
  });

  test('should emit audit event for forbidden submission', async () => {
    let auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent) => {
      auditEvents.push(event);
    };

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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: {
        organizationId: 'org_123',
        submissionReference: 'SUB-001',
        title: 'Test Review',
        summary: 'Test summary'
      },
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 403);

    const forbiddenAudits = auditEvents.filter(
      (e) => e.action === 'submitShariahReview' && e.outcome === 'forbidden'
    ) as ShariahReviewSubmitAuditEvent[];

    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'submitShariahReview');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'coordinator_required');
    assert.ok(typeof auditEvent.requestId === 'string');
  });

  test('should not emit audit event for invalid submission', async () => {
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

    // Empty payload to trigger validation error
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: {},
      headers: {
        'x-actor-id': 'user456'
      }
    });

    // Verify bad request response
    assert.strictEqual(response.statusCode, 400);

    // Verify no audit event was emitted
    assert.strictEqual(auditEvents.length, 0);
  });

});
