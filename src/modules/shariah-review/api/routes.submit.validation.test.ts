import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('POST /api/v1/shariah-reviews', () => {
  test('should return 400 when x-actor-id header is missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
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
      payload: payload
      // x-actor-id header is missing
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');

    // Check that shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'submitShariahReview');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, 'unknown');
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'missing_actor_context');
    assert.strictEqual(event.actorUserId, 'unknown');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews');
    assert.strictEqual(event.method, 'POST');
  });

  test('should return 400 when x-actor-id header is blank/whitespace-only', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
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
        'x-actor-id': '   ' // Whitespace-only
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');

    // Check that shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'submitShariahReview');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, 'unknown');
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'missing_actor_context');
    assert.strictEqual(event.actorUserId, 'unknown');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews');
    assert.strictEqual(event.method, 'POST');
  });

  test('should return 400 when required body fields are missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    // Removed accessAuditEventRepository since this test should not expect audit events for schema validation

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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
      // Removed accessAuditEventRepository since this test should not expect audit events for schema validation
    });

    // Test with completely empty payload
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: {},
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message); // Message should be present

    // This test should NOT check for audit events since schema validation happens before route handler
  });

  test('should return 400 when title is whitespace-only (service invalidInput)', async () => {
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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository,
      accessAuditEventRepository: accessAuditEventRepository
    });

    const payload = {
      organizationId: 'org123',
      title: '   ', // Whitespace-only
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

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid review submission input');

    // Check that shared access audit event was recorded
    const events = await accessAuditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'shariah-review');
    assert.strictEqual(event.action, 'submitShariahReview');
    assert.strictEqual(event.targetType, 'shariahReview');
    assert.strictEqual(event.targetId, 'unknown');
    assert.strictEqual(event.outcome, 'validationError');
    assert.strictEqual(event.reason, 'invalid_input');
    assert.strictEqual(event.actorUserId, 'user456');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/shariah-reviews');
    assert.strictEqual(event.method, 'POST');
  });
});
