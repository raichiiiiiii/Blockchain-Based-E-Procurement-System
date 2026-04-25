import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';

describe('POST /api/v1/roles', () => {
  test('should create a role successfully', async () => {
    const server = createTestableServer();

    const rolePayload = {
      roleCode: 'admin',
      displayName: 'Administrator',
      scope: 'organization',
      permissions: ['read', 'write', 'delete'],
      status: 'active',
      description: 'Full access role',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);

    // Assert that the id is present and is a string
    assert.ok(typeof responseBody.data.id === 'string');

    assert.strictEqual(responseBody.data.roleCode, rolePayload.roleCode);
    assert.strictEqual(responseBody.data.displayName, rolePayload.displayName);
    assert.strictEqual(responseBody.data.scope, rolePayload.scope);
    assert.deepStrictEqual(responseBody.data.permissions, rolePayload.permissions);
    assert.strictEqual(responseBody.data.status, rolePayload.status);
    assert.strictEqual(responseBody.data.isSystemReserved, rolePayload.isSystemReserved);
    assert.strictEqual(responseBody.data.description, rolePayload.description);
  });

  test('should return conflict when creating duplicate role', async () => {
    const server = createTestableServer();

    const rolePayload = {
      roleCode: 'viewer',
      displayName: 'Viewer',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    // First request
    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Second request with same roleCode and scope
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(secondResponse.statusCode, 409);
    const responseBody = secondResponse.json();
    assert.strictEqual(responseBody.error.code, 'CONFLICT');
    assert.strictEqual(responseBody.error.message, 'Role already exists');
  });

  test('should return 400 when required fields are missing', async () => {
    const server = createTestableServer();

    // Test with completely empty payload
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {},
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when scope is invalid', async () => {
    const server = createTestableServer();

    const invalidScopePayload = {
      roleCode: 'admin',
      displayName: 'Administrator',
      scope: 'invalidScope', // Invalid scope
      permissions: ['read', 'write'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: invalidScopePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when status is invalid', async () => {
    const server = createTestableServer();

    const invalidStatusPayload = {
      roleCode: 'admin',
      displayName: 'Administrator',
      scope: 'organization',
      permissions: ['read', 'write'],
      status: 'invalidStatus', // Invalid status
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: invalidStatusPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should handle omitted description correctly', async () => {
    const server = createTestableServer();

    const rolePayload = {
      roleCode: 'moderator',
      displayName: 'Moderator',
      scope: 'organization',
      permissions: ['read', 'moderate'],
      status: 'active',
      isSystemReserved: false
      // description is omitted
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.description, undefined);

    // Assert that the id is present and is a string
    assert.ok(typeof responseBody.data.id === 'string');
  });

  // New test: non-admin create denied
  test('should deny role creation for non-admin users', async () => {
    const server = createTestableServer();

    const rolePayload = {
      roleCode: 'test-role',
      displayName: 'Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');
  });

  // New test: admin create still succeeds
  test('should allow role creation for admin users', async () => {
    const server = createTestableServer();

    const rolePayload = {
      roleCode: 'admin-test',
      displayName: 'Admin Test Role',
      scope: 'organization',
      permissions: ['read', 'write'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.roleCode, rolePayload.roleCode);
  });

  // New audit test: successful create emits audit
  test('should emit audit event on successful role creation', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const rolePayload = {
      roleCode: 'audit-test',
      displayName: 'Audit Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-user-123'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(auditEvents.length, 1);

    const auditEvent = auditEvents[0];
    assert.strictEqual(auditEvent.action, 'createRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-user-123');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: duplicate create emits conflict audit
  test('should emit audit event on duplicate role creation attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const rolePayload = {
      roleCode: 'duplicate-test',
      displayName: 'Duplicate Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    // First request
    await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-user-456'
      }
    });

    // Second request (should conflict)
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-user-456'
      }
    });

    assert.strictEqual(response.statusCode, 409);
    // Filter to just the conflict audit events
    const conflictAudits = auditEvents.filter(e => e.outcome === 'conflict');
    assert.strictEqual(conflictAudits.length, 1);

    const auditEvent = conflictAudits[0];
    assert.strictEqual(auditEvent.action, 'createRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'conflict');
    assert.strictEqual(auditEvent.actorId, 'test-user-456');
    assert.strictEqual(auditEvent.targetId, 'unknown');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // Updated test: forbidden create now emits audit
  test('should emit audit event on forbidden role creation', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const rolePayload = {
      roleCode: 'forbidden-test',
      displayName: 'Forbidden Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-forbidden'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(auditEvents.length, 1);

    const auditEvent = auditEvents[0];
    assert.strictEqual(auditEvent.action, 'createRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.strictEqual(auditEvent.actorId, 'test-user-forbidden');
    assert.strictEqual(auditEvent.reason, 'admin_required');
  });

  // New test: invalid POST status does not emit audit
  test('should not emit audit event on invalid role creation with bad status', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const rolePayload = {
      roleCode: 'audit-test',
      displayName: 'Audit Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'invalid-status', // Invalid status
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(auditEvents.length, 0);
  });

  // New test: invalid POST scope does not emit audit
  test('should not emit audit event on invalid role creation with bad scope', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const rolePayload = {
      roleCode: 'audit-test',
      displayName: 'Audit Test Role',
      scope: 'invalid-scope', // Invalid scope
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(auditEvents.length, 0);
  });

  // Test for schema validation error using standardized envelope
  test('should return standardized validation error envelope for schema validation failure', async () => {
    const server = createTestableServer();

    // Send request with invalid data that fails schema validation
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        // Missing required fields
        roleCode: 'test-role'
        // Other required fields are missing
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    
    const responseBody = response.json();
    // Check standardized validation error envelope
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(typeof responseBody.error.message, 'string');
    // Should have details field even if empty
    assert.ok('details' in responseBody.error);
  });

  // Test for application validation error using standardized envelope
  test('should return standardized validation error envelope for application validation failure', async () => {
    const server = createTestableServer();

    // First create a role
    const rolePayload = {
      roleCode: 'test-role',
      displayName: 'Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Try to create the same role again (application validation failure - duplicate)
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(secondResponse.statusCode, 409);
    
    const responseBody = secondResponse.json();
    // Check standardized validation error envelope for conflict
    assert.strictEqual(responseBody.error.code, 'CONFLICT');
    assert.strictEqual(responseBody.error.message, 'Role already exists');
  });
});
