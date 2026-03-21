import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createRoleAssignment } from './create-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { Role } from '../domain/role.js';

test('should create a role assignment successfully when role exists', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  
  // First create a role
  const role: Role = {
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };
  
  const persistedRole = await roleRepository.save(role);
  
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedRole.id,
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, assignment);
});

test('should detect duplicate active assignment when role exists', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  
  // First create a role
  const role: Role = {
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };
  
  const persistedRole = await roleRepository.save(role);
  
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedRole.id,
    status: 'active'
  };

  // Create the first assignment
  await createRoleAssignment(assignment, assignmentRepository, roleRepository);
  
  // Try to create the same assignment again
  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository);

  assert.equal(result.status, 'duplicate');
});

test('should allow new active assignment when existing is revoked and role exists', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  
  // First create a role
  const role: Role = {
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };
  
  const persistedRole = await roleRepository.save(role);
  
  // Manually save a revoked assignment
  const revokedAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedRole.id,
    status: 'revoked'
  };
  await assignmentRepository.save(revokedAssignment);
  
  // Try to create an active assignment with the same tuple
  const activeAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedRole.id,
    status: 'active'
  };
  const result = await createRoleAssignment(activeAssignment, assignmentRepository, roleRepository);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, activeAssignment);
});

test('should return roleNotFound when role does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'non-existent-role-id',
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository);

  assert.equal(result.status, 'roleNotFound');
});
