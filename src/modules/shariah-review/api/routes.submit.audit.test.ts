import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type {
  ShariahReviewSubmitAuditEvent,
  ShariahReviewChecklistAuditEvent,
  ShariahReviewDecisionAuditEvent,
  ShariahReviewHistoryAuditEvent
} from './routes.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

type ShariahReviewAuditEvent =
  | ShariahReviewSubmitAuditEvent
  | ShariahReviewChecklistAuditEvent
  | ShariahReviewDecisionAuditEvent
  | ShariahReviewHistoryAuditEvent;

describe('POST /api/v1/shariah-reviews', () => {
  test('should emit audit event for successful submission', async () => {
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
      userId: 'user456',
      organizationId: 'org123',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    // Capture audit events
    const auditEvents: ShariahReviewAuditEvent[] = [];
    const auditCallback = (event: ShariahReviewAuditEvent) => {
      if (event.action === 'submitShariahReview') {
        auditEvents.push(event);
      }
    };

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      shariahReviewAudit: auditCallback,
      accessAuditEventRepository: accessAuditEventRepository
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

    // Verify shared access audit event was recorded
    const accessEvents = await accessAuditEventRepository.list();
    const accessEvent = accessEvents.at(-1);
    assert.ok(accessEvent);
    assert.strictEqual(accessEvent.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(accessEvent.module, 'shariah-review');
    assert.strictEqual(accessEvent.action, 'submitShariahReview');
    assert.strictEqual(accessEvent.targetType, 'shariahReview');
    assert.strictEqual(accessEvent.outcome, 'success');
    assert.strictEqual(accessEvent.actorUserId, 'user456');
    assert.ok(accessEvent.requestId);
    assert.ok(accessEvent.occurredAt);
    assert.ok(accessEvent.evidence.payloadHash);
    assert.strictEqual(accessEvent.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(accessEvent.route, '/api/v1/shariah-reviews');
    assert.strictEqual(accessEvent.method, 'POST');
    assert.strictEqual(accessEvent.targetId, auditEvent.targetId);
  });

  test('should emit audit event for forbidden submission', async () => {
    let auditEvents: ShariahReviewAuditEvent[] = [];
    const auditCallback = (event: ShariahReviewAuditEvent) => {
      if (event.action === 'submitShariahReview') {
        auditEvents.push(event);
      }
    };

    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

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
      shariahReviewAudit: auditCallback,
      accessAuditEventRepository: accessAuditEventRepository
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

    // Verify shared access audit event was recorded
    const accessEvents = await accessAuditEventRepository.list();
    const accessEvent = accessEvents.at(-1);
    assert.ok(accessEvent);
    assert.strictEqual(accessEvent.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(accessEvent.module, 'shariah-review');
    assert.strictEqual(accessEvent.action, 'submitShariahReview');
    assert.strictEqual(accessEvent.targetType, 'shariahReview');
    assert.strictEqual(accessEvent.targetId, 'unknown');
    assert.strictEqual(accessEvent.outcome, 'forbidden');
    assert.strictEqual(accessEvent.reason, 'coordinator_required');
    assert.strictEqual(accessEvent.actorUserId, 'user456');
    assert.ok(accessEvent.requestId);
    assert.ok(accessEvent.occurredAt);
    assert.ok(accessEvent.evidence.payloadHash);
    assert.strictEqual(accessEvent.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(accessEvent.route, '/api/v1/shariah-reviews');
    assert.strictEqual(accessEvent.method, 'POST');
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
    const auditEvents: ShariahReviewAuditEvent[] = [];
    const auditCallback = (event: ShariahReviewAuditEvent) => {
      if (event.action === 'submitShariahReview') {
        auditEvents.push(event);
      }
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

  // New test: success shared audit
  test('should persist shared access audit event for successful shariah review submission', async () => {
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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const payload = {
      organizationId: 'test-org',
      title: 'Test Shariah Review',
      summary: 'This is a test shariah review summary.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'test-coordinator'
      }
    });

    assert.strictEqual(response.statusCode, 201);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'submitShariahReview');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.outcome, 'success');
    assert.strictEqual(event.actorUserId, 'test-coordinator');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews');
    assert.strictEqual(event.method, 'POST');
    assert.notStrictEqual(event.targetId, 'unknown');
  });

  // New test: coordinator-denied shared audit
  test('should persist shared access audit event for coordinator-denied shariah review submission', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    // Create coordinator role
    await roleRepository.save({
      roleCode: 'coordinator',
      displayName: 'Coordinator',
      scope: 'organization',
      permissions: ['submit-shariah-review'],
      status: 'active',
      isSystemReserved: true
    });

    // Note: Not creating a coordinator assignment for the user to trigger the forbidden case

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const payload = {
      organizationId: 'test-org',
      title: 'Test Shariah Review',
      summary: 'This is a test shariah review summary.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'test-non-coordinator'
      }
    });

    assert.strictEqual(response.statusCode, 403);

    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'submitShariahReview');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.outcome, 'forbidden');
    assert.strictEqual(event.reason, 'coordinator_required');
    assert.strictEqual(event.actorUserId, 'test-non-coordinator');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews');
    assert.strictEqual(event.method, 'POST');
    assert.strictEqual(event.targetId, 'unknown');
  });
});
