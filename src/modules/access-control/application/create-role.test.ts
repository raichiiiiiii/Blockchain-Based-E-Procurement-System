import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createRole } from './create-role.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import type { Role } from '../domain/role.js';

test('successful role creation', async () => {
  const repository = new InMemoryRoleRepository();

  const role: Role = {
    roleCode: 'admin',
    displayName: 'Administrator',
    scope: 'organization',
    description: 'Full access role',
    permissions: ['read', 'write', 'delete'],
    status: 'active',
    isSystemReserved: false
  };

  const result = await createRole(role, repository);

  assert.strictEqual(result.status, 'created');
  assert.ok(result.role.id);
  assert.match(result.role.id, /^role_/);

  assert.deepStrictEqual(
    {
      roleCode: result.role.roleCode,
      displayName: result.role.displayName,
      scope: result.role.scope,
      description: result.role.description,
      permissions: result.role.permissions,
      status: result.role.status,
      isSystemReserved: result.role.isSystemReserved
    },
    role
  );
});

test('duplicate role detection', async () => {
  const repository = new InMemoryRoleRepository();
  
  const role: Role = {
    roleCode: 'admin',
    displayName: 'Administrator',
    scope: 'organization',
    description: 'Full access role',
    permissions: ['read', 'write', 'delete'],
    status: 'active',
    isSystemReserved: false
  };

  // Create the role first time
  await createRole(role, repository);
  
  // Try to create the same role again
  const result = await createRole(role, repository);
  
  assert.strictEqual(result.status, 'duplicate');
});

test('same roleCode in same scope is duplicate', async () => {
  const repository = new InMemoryRoleRepository();
  
  const role1: Role = {
    roleCode: 'viewer',
    displayName: 'Viewer',
    scope: 'organization',
    description: 'Read-only access',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const role2: Role = {
    roleCode: 'viewer',
    displayName: 'Different Viewer Name',
    scope: 'organization',
    description: 'Different description',
    permissions: ['read', 'write'],
    status: 'inactive',
    isSystemReserved: true
  };

  // Create the first role
  await createRole(role1, repository);
  
  // Try to create a different role with the same roleCode and scope
  const result = await createRole(role2, repository);
  
  assert.strictEqual(result.status, 'duplicate');
});
