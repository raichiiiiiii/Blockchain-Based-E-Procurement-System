import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';

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
