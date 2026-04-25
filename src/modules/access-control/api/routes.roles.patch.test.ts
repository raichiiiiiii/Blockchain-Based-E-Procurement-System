import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';

describe('PATCH /api/v1/roles/{roleId}', () => {
  test('should update a role successfully', async () => {
    const server = createTestableServer();

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'tester',
        displayName: 'Tester',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Now update the role
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Senior Tester',
        permissions: ['read', 'write'],
        status: 'inactive'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(updateResponse.statusCode, 200);
    const updatedRole = updateResponse.json().data;

    // Check that the ID remains the same
    assert.strictEqual(updatedRole.id, roleId);

    // Check that mutable fields were updated
    assert.strictEqual(updatedRole.displayName, 'Senior Tester');
    assert.deepStrictEqual(updatedRole.permissions, ['read', 'write']);
    assert.strictEqual(updatedRole.status, 'inactive');

    // Check that immutable fields remained unchanged
    assert.strictEqual(updatedRole.roleCode, 'tester');
    assert.strictEqual(updatedRole.scope, 'organization');
    assert.strictEqual(updatedRole.isSystemReserved, false);
  });

  test('should return 404 when trying to update a non-existent role', async () => {
    const server = createTestableServer();

    // First create a role as admin
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'temp-role',
        displayName: 'Temp Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    const response = await server.inject({
      method: 'PATCH',
      url: '/api/v1/roles/non-existent-id',
      payload: {
        displayName: 'Updated Name'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 404);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.strictEqual(responseBody.error.message, 'Role not found');
  });

  test('should return 400 when trying to update with immutable fields', async () => {
    const server = createTestableServer();

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'tester2',
        displayName: 'Tester 2',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update with immutable field
    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        roleCode: 'new-code' // This is immutable
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when trying to update with invalid status', async () => {
    const server = createTestableServer();

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'tester3',
        displayName: 'Tester 3',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update with invalid status
    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        status: 'invalid-status'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when trying to update with empty body', async () => {
    const server = createTestableServer();

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'tester4',
        displayName: 'Tester 4',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update with empty body
    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {},
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  // New test: non-admin update denied
  test('should deny role update for non-admin users', async () => {
    const server = createTestableServer();

    // First create a role as admin
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role-update',
        displayName: 'Test Role Update',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update the role as non-admin
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Updated by non-admin'
      },
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(updateResponse.statusCode, 403);
    const responseBody = updateResponse.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');
  });

  // New test: admin update still succeeds
  test('should allow role update for admin users', async () => {
    const server = createTestableServer();

    // First create a role as admin
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'admin-test-update',
        displayName: 'Admin Test Update',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Update the role as admin
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Updated by admin'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(updateResponse.statusCode, 200);
    const responseBody = updateResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.displayName, 'Updated by admin');
  });

  // New audit test: successful update emits audit
  test('should emit audit event on successful role update', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'audit-update-test',
        displayName: 'Audit Update Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Now update the role
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Updated Name'
      },
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-user-789'
      }
    });

    assert.strictEqual(updateResponse.statusCode, 200);

    // Filter to just the update audit events
    const updateAudits = auditEvents.filter(e => e.action === 'updateRole');
    assert.strictEqual(updateAudits.length, 1);

    const auditEvent = updateAudits[0];
    assert.strictEqual(auditEvent.action, 'updateRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-user-789');
    assert.strictEqual(auditEvent.targetId, roleId);
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: notFound update emits audit
  test('should emit audit event when updating non-existent role', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const response = await server.inject({
      method: 'PATCH',
      url: '/api/v1/roles/non-existent-id',
      payload: {
        displayName: 'Updated Name'
      },
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-user-999'
      }
    });

    assert.strictEqual(response.statusCode, 404);

    // Filter to just the update audit events with notFound outcome
    const notFoundAudits = auditEvents.filter(e => e.action === 'updateRole' && e.outcome === 'notFound');
    assert.strictEqual(notFoundAudits.length, 1);

    const auditEvent = notFoundAudits[0];
    assert.strictEqual(auditEvent.action, 'updateRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'notFound');
    assert.strictEqual(auditEvent.actorId, 'test-user-999');
    assert.strictEqual(auditEvent.targetId, 'non-existent-id');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // Updated audit test: forbidden update now emits audit
  test('should emit audit event on forbidden role update', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role as admin
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'forbidden-update-test',
        displayName: 'Forbidden Update Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update the role as non-admin
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Updated by non-admin'
      },
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-forbidden-update'
      }
    });

    assert.strictEqual(updateResponse.statusCode, 403);

    // Filter to just the update audit events with forbidden outcome
    const forbiddenAudits = auditEvents.filter(e => e.action === 'updateRole' && e.outcome === 'forbidden');
    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'updateRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.actorId, 'test-user-forbidden-update');
    assert.strictEqual(auditEvent.targetId, roleId);
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
    assert.strictEqual(auditEvent.reason, 'admin_required');
  });

  // New audit test: invalid PATCH status does not emit update audit
  test('should not emit audit event on invalid role update with bad status', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'invalid-update-test',
        displayName: 'Invalid Update Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update with invalid status
    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        status: 'invalid-status'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    // Filter to just the update audit events
    const updateAudits = auditEvents.filter(e => e.action === 'updateRole');
    assert.strictEqual(updateAudits.length, 0);
  });

  // New audit test: empty PATCH body does not emit update audit
  test('should not emit audit event on invalid role update with empty body', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'empty-body-test',
        displayName: 'Empty Body Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update with empty body
    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {},
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    // Filter to just the update audit events
    const updateAudits = auditEvents.filter(e => e.action === 'updateRole');
    assert.strictEqual(updateAudits.length, 0);
  });
});
