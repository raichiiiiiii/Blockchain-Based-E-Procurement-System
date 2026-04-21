import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { changeRoleAssignment } from './change-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { Role } from '../domain/role.js';

test('should change role assignment successfully', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();

  // Create roles
  const currentRole: Role = {
    roleCode: 'current-role',
    displayName: 'Current Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const newRole: Role = {
    roleCode: 'new-role',
    displayName: 'New Role',
    scope: 'organization',
    permissions: ['read', 'write'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedCurrentRole = await roleRepository.save(currentRole);
  const persistedNewRole = await roleRepository.save(newRole);

  // Create an active assignment with current role
  const currentAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedCurrentRole.id,
    status: 'active'
  };

  await assignmentRepository.save(currentAssignment);

  // Change the role assignment
  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository
  );

  assert.equal(result.status, 'changed');
  assert.ok(result.oldAssignment);
  assert.equal(result.oldAssignment.status, 'revoked');
  assert.ok(result.newAssignment);
  assert.equal(result.newAssignment.status, 'active');
  assert.equal(result.newAssignment.roleId, persistedNewRole.id);
});

test('should return notFound when current assignment does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();

  // Create a role
  const newRole: Role = {
    roleCode: 'new-role',
    displayName: 'New Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedNewRole = await roleRepository.save(newRole);

  // Try to change a non-existent assignment
  const result = await changeRoleAssignment(
    'user1',
    'org1',
    'non-existent-role-id',
    persistedNewRole.id,
    assignmentRepository,
    roleRepository
  );

  assert.equal(result.status, 'notFound');
});

test('should return roleNotFound when new role does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();

  // Create a current role
  const currentRole: Role = {
    roleCode: 'current-role',
    displayName: 'Current Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedCurrentRole = await roleRepository.save(currentRole);

  // Create an active assignment with current role
  const currentAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedCurrentRole.id,
    status: 'active'
  };

  await assignmentRepository.save(currentAssignment);

  // Try to change to a non-existent role
  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    'non-existent-role-id',
    assignmentRepository,
    roleRepository
  );

  assert.equal(result.status, 'roleNotFound');
});

test('should return duplicate when target role is already active', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();

  // Create roles
  const currentRole: Role = {
    roleCode: 'current-role',
    displayName: 'Current Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const newRole: Role = {
    roleCode: 'new-role',
    displayName: 'New Role',
    scope: 'organization',
    permissions: ['read', 'write'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedCurrentRole = await roleRepository.save(currentRole);
  const persistedNewRole = await roleRepository.save(newRole);

  // Create an active assignment with current role
  const currentAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedCurrentRole.id,
    status: 'active'
  };

  await assignmentRepository.save(currentAssignment);

  // Create an active assignment with new role (simulating the duplicate)
  const newAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedNewRole.id,
    status: 'active'
  };

  await assignmentRepository.save(newAssignment);

  // Try to change to the role that's already assigned
  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository
  );

  assert.equal(result.status, 'duplicate');
});

test('should return sameRole when currentRoleId equals newRoleId', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();

  // Try to change to the same role
  const result = await changeRoleAssignment(
    'user1',
    'org1',
    'some-role-id',
    'some-role-id',
    assignmentRepository,
    roleRepository
  );

  assert.equal(result.status, 'sameRole');
});

test('should return notFound when trying to change a revoked assignment', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();

  // Create roles
  const currentRole: Role = {
    roleCode: 'current-role',
    displayName: 'Current Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const newRole: Role = {
    roleCode: 'new-role',
    displayName: 'New Role',
    scope: 'organization',
    permissions: ['read', 'write'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedCurrentRole = await roleRepository.save(currentRole);
  const persistedNewRole = await roleRepository.save(newRole);

  // Create a revoked assignment with current role
  const currentAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: persistedCurrentRole.id,
    status: 'revoked'
  };

  await assignmentRepository.save(currentAssignment);

  // Try to change the revoked assignment
  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository
  );

  assert.equal(result.status, 'notFound');
});
