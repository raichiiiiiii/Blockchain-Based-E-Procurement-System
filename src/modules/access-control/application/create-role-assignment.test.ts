import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createRoleAssignment } from './create-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';

test('should create a role assignment successfully', async () => {
  const repository = new InMemoryRoleAssignmentRepository();
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, repository);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, assignment);
});

test('should detect duplicate active assignment', async () => {
  const repository = new InMemoryRoleAssignmentRepository();
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  // Create the first assignment
  await createRoleAssignment(assignment, repository);
  
  // Try to create the same assignment again
  const result = await createRoleAssignment(assignment, repository);

  assert.equal(result.status, 'duplicate');
});

test('should allow new active assignment when existing is revoked', async () => {
  const repository = new InMemoryRoleAssignmentRepository();
  
  // Manually save a revoked assignment
  const revokedAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'revoked'
  };
  await repository.save(revokedAssignment);
  
  // Try to create an active assignment with the same tuple
  const activeAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };
  const result = await createRoleAssignment(activeAssignment, repository);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, activeAssignment);
});
