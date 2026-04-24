import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import type { ShariahReviewSubmitAuditEvent, ShariahReviewChecklistAuditEvent } from './routes.js';

describe('POST /api/v1/shariah-reviews', () => {
  test('should submit a review successfully with coordinator role assignment', async () => {
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

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.organizationId, payload.organizationId);
    assert.strictEqual(responseBody.data.title, payload.title);
    assert.strictEqual(responseBody.data.summary, payload.summary);
    assert.strictEqual(responseBody.data.status, 'submitted');
    assert.strictEqual(responseBody.data.submittedByUserId, 'user456');
    assert.ok(responseBody.data.id);
    assert.ok(responseBody.data.createdAt);
  });

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
    const auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent) => {
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

  test('should return 400 when x-actor-id header is missing', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

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
      payload: payload
      // x-actor-id header is missing
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('should return 400 when x-actor-id header is blank/whitespace-only', async () => {
    const repository = new InMemoryShariahReviewRepository();
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();

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
        'x-actor-id': '   ' // Whitespace-only
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('should return 400 when required body fields are missing', async () => {
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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
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
    // Fastify validation error structure
    const responseBody = response.json();
    assert.ok(responseBody.message); // Fastify validation error has a message
  });

  test('should return 400 when title is whitespace-only (service invalidInput)', async () => {
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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
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
  });

  test('submittedByUserId in the success response should match x-actor-id', async () => {
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
      userId: 'specific-user-id',
      organizationId: 'org789',
      roleId: coordinatorRole.id,
      status: 'active'
    });

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const payload = {
      organizationId: 'org789',
      title: 'Another Review',
      summary: 'Summary for another review.'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'specific-user-id'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.submittedByUserId, 'specific-user-id');
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
    const auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent) => {
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
    const auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent) => {
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
    let auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent) => {
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
    const auditEvents: (ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent)[] = [];
    const auditCallback = (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent) => {
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

  test('should accept and return references when provided', async () => {
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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const payload = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.',
      references: [
        {
          type: 'attachment',
          name: 'document.pdf',
          uri: 'https://example.com/document.pdf',
          description: 'Test document',
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.deepStrictEqual(responseBody.data.references, payload.references);
  });

  test('should preserve existing behavior when references are omitted', async () => {
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

    const server = createTestableServer({
      shariahReviewRepository: repository,
      roleAssignmentRepository: roleAssignmentRepository,
      roleRepository: roleRepository
    });

    const payload = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.'
      // No references provided
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/shariah-reviews',
      payload: payload,
      headers: {
        'x-actor-id': 'user456'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.organizationId, payload.organizationId);
    assert.strictEqual(responseBody.data.title, payload.title);
    assert.strictEqual(responseBody.data.summary, payload.summary);
    assert.strictEqual(responseBody.data.status, 'submitted');
    assert.strictEqual(responseBody.data.submittedByUserId, 'user456');
    assert.ok(responseBody.data.id);
    assert.ok(responseBody.data.createdAt);
    // Confirm references field is not present in response when not provided
    assert.strictEqual(responseBody.data.references, undefined);
  });
});
