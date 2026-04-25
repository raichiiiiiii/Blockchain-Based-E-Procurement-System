import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';

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
