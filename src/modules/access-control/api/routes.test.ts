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
      payload: rolePayload
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
      payload: rolePayload
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Second request with same roleCode and scope
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload
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
      payload: {}
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
      payload: invalidScopePayload
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
      payload: invalidStatusPayload
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
      payload: rolePayload
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.description, undefined);
    
    // Assert that the id is present and is a string
    assert.ok(typeof responseBody.data.id === 'string');
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
    
    const response = await server.inject({
      method: 'PATCH',
      url: '/api/v1/roles/non-existent-id',
      payload: {
        displayName: 'Updated Name'
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
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update with empty body
    const response = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {}
    });

    assert.strictEqual(response.statusCode, 400);
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
      payload: role1
    });

    await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: role2
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
