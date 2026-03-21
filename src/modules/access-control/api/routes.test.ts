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
  
  // New audit test: forbidden create does not emit audit
  test('should not emit audit event on forbidden role creation', async () => {
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
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(auditEvents.length, 0);
  });
});

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
  
  // New audit test: forbidden update does not emit audit
  test('should not emit audit event on forbidden role update', async () => {
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
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(updateResponse.statusCode, 403);
    
    // Filter to just the update audit events
    const updateAudits = auditEvents.filter(e => e.action === 'updateRole');
    assert.strictEqual(updateAudits.length, 0);
  });
  
  // New audit test: invalid update does not emit audit
  test('should not emit audit event on invalid role update', async () => {
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
});

describe('GET /api/v1/roles', () => {
  test('should return empty array when no roles exist', async () => {
    const server = createTestableServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/roles'
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(Array.isArray(responseBody.data));
    assert.strictEqual(responseBody.data.length, 0);
  });

  test('should return all created roles', async () => {
    const server = createTestableServer();

    // Create two roles
    const role1 = {
      roleCode: 'admin',
      displayName: 'Administrator',
      scope: 'organization',
      permissions: ['read', 'write', 'delete'],
      status: 'active',
      isSystemReserved: false
    };

    const role2 = {
      roleCode: 'viewer',
      displayName: 'Viewer',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: true
    };

    await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: role1,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: role2,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Get all roles
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/roles'
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(Array.isArray(responseBody.data));
    assert.strictEqual(responseBody.data.length, 2);

    // Check that both roles are returned with correct data
    const returnedRoleCodes = responseBody.data.map((role: any) => role.roleCode);
    assert.ok(returnedRoleCodes.includes('admin'));
    assert.ok(returnedRoleCodes.includes('viewer'));

    // Verify the shape of returned roles
    const adminRole = responseBody.data.find((role: any) => role.roleCode === 'admin');
    assert.ok(typeof adminRole.id === 'string'); // Assert id is present and a string
    assert.strictEqual(adminRole.displayName, 'Administrator');
    assert.strictEqual(adminRole.scope, 'organization');
    assert.deepStrictEqual(adminRole.permissions, ['read', 'write', 'delete']);
    assert.strictEqual(adminRole.status, 'active');
    assert.strictEqual(adminRole.isSystemReserved, false);

    const viewerRole = responseBody.data.find((role: any) => role.roleCode === 'viewer');
    assert.ok(typeof viewerRole.id === 'string'); // Assert id is present and a string
    assert.strictEqual(viewerRole.displayName, 'Viewer');
    assert.strictEqual(viewerRole.scope, 'organization');
    assert.deepStrictEqual(viewerRole.permissions, ['read']);
    assert.strictEqual(viewerRole.status, 'active');
    assert.strictEqual(viewerRole.isSystemReserved, true);
  });

  test('should return success envelope with data array', async () => {
    const server = createTestableServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/roles'
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.ok(typeof responseBody === 'object');
    assert.ok('data' in responseBody);
    assert.ok(Array.isArray(responseBody.data));
  });
});
