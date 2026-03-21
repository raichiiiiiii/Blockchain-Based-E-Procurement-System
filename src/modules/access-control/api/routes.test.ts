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
  });
});
