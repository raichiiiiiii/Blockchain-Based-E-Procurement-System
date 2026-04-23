import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { MemberOrganization } from '../../membership/domain/member-organization.js';
import { InMemoryUserExistenceLookup } from '../../membership/infrastructure/in-memory-user-existence-lookup.js';
import { InMemoryOrganizationMembershipLookup } from '../../membership/infrastructure/in-memory-organization-membership-lookup.js';

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

describe('POST /api/v1/role-assignments', () => {
  test('should create a role assignment successfully', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);

    // Assert that the response contains the correct data
    assert.strictEqual(responseBody.data.userId, assignmentPayload.userId);
    assert.strictEqual(responseBody.data.organizationId, assignmentPayload.organizationId);
    assert.strictEqual(responseBody.data.roleId, assignmentPayload.roleId);
    assert.strictEqual(responseBody.data.status, 'active');
  });

  test('should return conflict when creating duplicate active role assignment', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    // First request
    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Second request with same userId, organizationId, and roleId
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(secondResponse.statusCode, 409);
    const responseBody = secondResponse.json();
    assert.strictEqual(responseBody.error.code, 'CONFLICT');
    assert.strictEqual(responseBody.error.message, 'Role assignment already exists');
  });

  test('should return 400 when required fields are missing', async () => {
    const server = createTestableServer();

    // Test with missing userId
    const response1 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        organizationId: 'org_456',
        roleId: 'role_789'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response1.statusCode, 400);

    // Test with missing organizationId
    const response2 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        userId: 'user_123',
        roleId: 'role_789'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response2.statusCode, 400);

    // Test with missing roleId
    const response3 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        userId: 'user_123',
        organizationId: 'org_456'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response3.statusCode, 400);

    // Test with completely empty payload
    const response4 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {},
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response4.statusCode, 400);
  });

  test('should allow new assignment when previous assignment was revoked', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository
    });

    // create role through the same server
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    await assignmentRepository.save({
      userId: 'user_123',
      organizationId: persistedOrganization.id,
      roleId,
      status: 'revoked'
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        userId: 'user_123',
        organizationId: persistedOrganization.id,
        roleId
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, persistedOrganization.id);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'active');
  });

  test('should return 400 when role does not exist', async () => {
    const server = createTestableServer();

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: 'non-existent-role-id'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid roleId: Role does not exist');
  });

  test('should return 400 when organization does not exist', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: 'non-existent-org-id',
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid organizationId: Member organization does not exist');
  });

  test('should return 400 for non-existent user in role assignment', async () => {
    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations with no existing users
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: [] // No existing users
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [] // No memberships
    });

    // Create test server with injected lookups
    const server = createTestableServer({
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Try to create a role assignment with a non-existent user
    const assignmentPayload = {
      userId: 'non-existent-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid userId: User does not exist');
  });

  test('should return 400 for user not member of organization in role assignment', async () => {
    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations with existing user but no membership
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['existing-user']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [] // User is not a member of any organization
    });

    // Create test server with injected lookups
    const server = createTestableServer({
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Try to create a role assignment with a user that exists but is not a member of the organization
    const assignmentPayload = {
      userId: 'existing-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid userId: User is not a member of the specified organization');
  });

  test('should create role assignment when user exists and is member of organization', async () => {
    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['user1'] // User exists
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [{ userId: 'user1', organizationId: persistedOrganization.id }] // User is member of organization
    });

    // Create test server with injected lookups
    const server = createTestableServer({
      memberRepository: memberOrganizationRepository,
      userExistenceLookup,
      organizationMembershipLookup
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a role assignment with a user that exists and is a member of the organization
    const assignmentPayload = {
      userId: 'user1',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.userId, 'user1');
    assert.strictEqual(responseBody.data.organizationId, persistedOrganization.id);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'active');
  });

  // New test: non-admin create denied
  test('should deny role assignment creation for non-admin users', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');

    const forbiddenAudits = auditEvents.filter(
      (e) => e.action === 'createRoleAssignment' && e.outcome === 'forbidden'
    );

    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'admin_required');
    assert.ok(typeof auditEvent.requestId === 'string');
  });

  // New test: admin create still succeeds
  test('should allow role assignment creation for admin users', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, assignmentPayload.userId);
    assert.strictEqual(responseBody.data.organizationId, assignmentPayload.organizationId);
    assert.strictEqual(responseBody.data.roleId, assignmentPayload.roleId);
  });

  // New audit test: successful role assignment creation emits audit event
  test('should emit audit event on successful role assignment creation', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['user_123']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [{ userId: 'user_123', organizationId: persistedOrganization.id }]
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-123'
      }
    });

    assert.strictEqual(response.statusCode, 201);

    // Filter to just the createRoleAssignment audit events
    const createAssignmentAudits = auditEvents.filter(e => e.action === 'createRoleAssignment');
    assert.strictEqual(createAssignmentAudits.length, 1);

    const auditEvent = createAssignmentAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-actor-123');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: duplicate role assignment attempt emits audit event
  test('should emit audit event on duplicate role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG456',
      legalName: 'Test Organization 2',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['user_123']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [{ userId: 'user_123', organizationId: persistedOrganization.id }]
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    // First request to create the assignment
    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Second request with the same assignment details
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'duplicate-test-actor'
      }
    });

    assert.strictEqual(secondResponse.statusCode, 409);

    // Filter to just the conflict audit events for role assignment creation
    const conflictAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'conflict'
    );
    assert.strictEqual(conflictAudits.length, 1);

    const auditEvent = conflictAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'conflict');
    assert.strictEqual(auditEvent.actorId, 'duplicate-test-actor');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: invalid user role assignment attempt emits audit event
  test('should emit audit event on invalid user role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };
    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: []
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: []
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'non-existent-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-456'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const validationErrorAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'validationError'
    );
    assert.strictEqual(validationErrorAudits.length, 1);

    const auditEvent = validationErrorAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.actorId, 'test-actor-456');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: non-member role assignment attempt emits audit event
  test('should emit audit event on non-member role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };
    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['existing-user']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: []
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'existing-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-789'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const validationErrorAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'validationError'
    );
    assert.strictEqual(validationErrorAudits.length, 1);

    const auditEvent = validationErrorAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.actorId, 'test-actor-789');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: invalid role role assignment attempt emits audit event
  test('should emit audit event on invalid role role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Try to create a role assignment with a non-existent role
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: 'non-existent-role-id'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-invalid-role'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);

    // Filter to just the validationError audit events for role assignment creation with invalid role
    const validationErrorAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'validationError'
    );
    assert.strictEqual(validationErrorAudits.length, 1);

    const auditEvent = validationErrorAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.actorId, 'test-actor-invalid-role');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });
});

describe('DELETE /api/v1/role-assignments', () => {
  test('should remove (revoke) an active role assignment successfully', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);
    const responseBody = removeResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, orgId);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'revoked');
  });

  test('should return 404 when trying to remove a non-existent role assignment', async () => {
    const server = createTestableServer();

    const removeResponse = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&organizationId=org_123&roleId=role_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 404);
    const responseBody = removeResponse.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.strictEqual(responseBody.error.message, 'Role assignment not found');
  });

  test('should return 200 when trying to remove an already revoked role assignment', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Manually save a revoked assignment
    await assignmentRepository.save({
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId,
      status: 'revoked'
    });

    // Try to remove the already revoked assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);
    const responseBody = removeResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, orgId);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'revoked');
  });

  test('should return 400 when required query parameters are missing', async () => {
    const server = createTestableServer();

    // Test with missing userId
    const response1 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?organizationId=org_123&roleId=role_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response1.statusCode, 400);

    // Test with missing organizationId
    const response2 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&roleId=role_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response2.statusCode, 400);

    // Test with missing roleId
    const response3 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&organizationId=org_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response3.statusCode, 400);

    // Test with completely empty query
    const response4 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response4.statusCode, 400);
  });

  // New test: non-admin delete denied
  test('should deny role assignment removal for non-admin users', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository,
      roleAudit: auditCallback
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Try to remove the role assignment as non-admin
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(removeResponse.statusCode, 403);
    const responseBody = removeResponse.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');

    const forbiddenAudits = auditEvents.filter(
      (e) => e.action === 'removeRoleAssignment' && e.outcome === 'forbidden'
    );

    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'removeRoleAssignment');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'admin_required');
    assert.ok(typeof auditEvent.requestId === 'string');
  });

  // New test: admin delete still succeeds
  test('should allow role assignment removal for admin users', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment as admin
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);
    const responseBody = removeResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, orgId);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'revoked');
  });

  // New audit test: successful role assignment removal emits audit event
  test('should emit audit event on successful role assignment removal', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository,
      roleAudit: auditCallback
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-remover-456'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);

    // Filter to just the removeRoleAssignment audit events
    const removeAssignmentAudits = auditEvents.filter(e => e.action === 'removeRoleAssignment');
    assert.strictEqual(removeAssignmentAudits.length, 1);

    const auditEvent = removeAssignmentAudits[0];
    assert.strictEqual(auditEvent.action, 'removeRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-remover-456');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });
});

describe('PATCH /api/v1/role-assignments/change', () => {
  test('should change role assignment successfully', async () => {
    const server = createTestableServer();

    // First create two roles
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    const newRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'new-role',
        displayName: 'New Role',
        scope: 'organization',
        permissions: ['read', 'write'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newRoleResponse.statusCode, 201);
    const newRoleId = newRoleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: currentRoleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Change the role assignment
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: newRoleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(changeResponse.statusCode, 200);
    const responseBody = changeResponse.json();
    assert.ok(responseBody.data);
    assert.ok(responseBody.data.oldAssignment);
    assert.ok(responseBody.data.newAssignment);
    assert.strictEqual(responseBody.data.oldAssignment.status, 'revoked');
    assert.strictEqual(responseBody.data.newAssignment.status, 'active');
    assert.strictEqual(responseBody.data.newAssignment.roleId, newRoleId);
  });

  test('should return 404 when current assignment does not exist', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Try to change a non-existent assignment
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: 'non-existent-role-id',
      newRoleId: roleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(changeResponse.statusCode, 404);
    const responseBody = changeResponse.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.strictEqual(responseBody.error.message, 'Role assignment not found');
  });

  test('should return 400 when new role does not exist', async () => {
    const server = createTestableServer();

    // First create a role
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: currentRoleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Try to change to a non-existent role
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: 'non-existent-role-id'
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(changeResponse.statusCode, 400);
    const responseBody = changeResponse.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid newRoleId: Role does not exist');
  });

  test('should return 409 when target role is already active', async () => {
    const server = createTestableServer();

    // First create two roles
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    const newRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'new-role',
        displayName: 'New Role',
        scope: 'organization',
        permissions: ['read', 'write'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newRoleResponse.statusCode, 201);
    const newRoleId = newRoleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment with current role
    const currentAssignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: currentRoleId
    };

    const currentAssignmentResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: currentAssignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentAssignmentResponse.statusCode, 201);

    // Create a role assignment with new role (simulating the duplicate)
    const newAssignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: newRoleId
    };

    const newAssignmentResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: newAssignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newAssignmentResponse.statusCode, 201);

    // Try to change to the role that's already assigned
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: newRoleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(changeResponse.statusCode, 409);
    const responseBody = changeResponse.json();
    assert.strictEqual(responseBody.error.code, 'CONFLICT');
    assert.strictEqual(responseBody.error.message, 'Target role assignment already exists');
  });

  test('should return 400 when currentRoleId equals newRoleId', async () => {
    const server = createTestableServer();

    // Try to change to the same role
    const changePayload = {
      userId: 'user_123',
      organizationId: 'org_123',
      currentRoleId: 'some-role-id',
      newRoleId: 'some-role-id'
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(changeResponse.statusCode, 400);
    const responseBody = changeResponse.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Current and new role IDs must be different');
  });

  test('should return 400 when required body fields are missing', async () => {
    const server = createTestableServer();

    // Test with missing userId
    const response1 = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: {
        organizationId: 'org_123',
        currentRoleId: 'current-role-id',
        newRoleId: 'new-role-id'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response1.statusCode, 400);

    // Test with missing organizationId
    const response2 = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: {
        userId: 'user_123',
        currentRoleId: 'current-role-id',
        newRoleId: 'new-role-id'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response2.statusCode, 400);

    // Test with missing currentRoleId
    const response3 = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: {
        userId: 'user_123',
        organizationId: 'org_123',
        newRoleId: 'new-role-id'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response3.statusCode, 400);

    // Test with missing newRoleId
    const response4 = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: {
        userId: 'user_123',
        organizationId: 'org_123',
        currentRoleId: 'current-role-id'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response4.statusCode, 400);

    // Test with completely empty payload
    const response5 = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: {},
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response5.statusCode, 400);
  });

  // New test: non-admin change denied
  test('should deny role assignment change for non-admin users', async () => {
    const server = createTestableServer();

    // First create two roles
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    const newRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'new-role',
        displayName: 'New Role',
        scope: 'organization',
        permissions: ['read', 'write'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newRoleResponse.statusCode, 201);
    const newRoleId = newRoleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: currentRoleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Try to change the role assignment as non-admin
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: newRoleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(changeResponse.statusCode, 403);
    const responseBody = changeResponse.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');
  });

  // New test: admin change still succeeds
  test('should allow role assignment change for admin users', async () => {
    const server = createTestableServer();

    // First create two roles
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    const newRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'new-role',
        displayName: 'New Role',
        scope: 'organization',
        permissions: ['read', 'write'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newRoleResponse.statusCode, 201);
    const newRoleId = newRoleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: currentRoleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Change the role assignment as admin
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: newRoleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(changeResponse.statusCode, 200);
    const responseBody = changeResponse.json();
    assert.ok(responseBody.data);
    assert.ok(responseBody.data.oldAssignment);
    assert.ok(responseBody.data.newAssignment);
    assert.strictEqual(responseBody.data.oldAssignment.status, 'revoked');
    assert.strictEqual(responseBody.data.newAssignment.status, 'active');
    assert.strictEqual(responseBody.data.newAssignment.roleId, newRoleId);
  });

  // New audit test: successful role assignment change emits audit event
  test('should emit audit event on successful role assignment change', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create two roles
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    const newRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'new-role',
        displayName: 'New Role',
        scope: 'organization',
        permissions: ['read', 'write'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newRoleResponse.statusCode, 201);
    const newRoleId = newRoleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: currentRoleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Change the role assignment
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: newRoleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-changer-789'
      }
    });

    assert.strictEqual(changeResponse.statusCode, 200);

    // Filter to just the changeRoleAssignment audit events
    const changeAssignmentAudits = auditEvents.filter(e => e.action === 'changeRoleAssignment');
    assert.strictEqual(changeAssignmentAudits.length, 1);

    const auditEvent = changeAssignmentAudits[0];
    assert.strictEqual(auditEvent.action, 'changeRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-changer-789');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });
});
