import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { removeRoleAssignment } from './remove-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';

test('should remove (revoke) an active role assignment successfully', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create an active assignment
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  await assignmentRepository.save(assignment);

  // Remove the assignment
  const result = await removeRoleAssignment('user1', 'org1', 'role1', assignmentRepository);

  assert.equal(result.status, 'removed');
  assert.ok(result.assignment);
  assert.equal(result.assignment.status, 'revoked');
  assert.equal(result.assignment.userId, 'user1');
  assert.equal(result.assignment.organizationId, 'org1');
  assert.equal(result.assignment.roleId, 'role1');
});

test('should return notFound when trying to remove a non-existent assignment', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Try to remove an assignment that doesn't exist
  const result = await removeRoleAssignment('user1', 'org1', 'role1', assignmentRepository);

  assert.equal(result.status, 'notFound');
});

test('should return alreadyRevoked when trying to remove an already revoked assignment', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create a revoked assignment
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'revoked'
  };

  await assignmentRepository.save(assignment);

  // Try to remove the already revoked assignment
  const result = await removeRoleAssignment('user1', 'org1', 'role1', assignmentRepository);

  assert.equal(result.status, 'alreadyRevoked');
  assert.ok(result.assignment);
  assert.equal(result.assignment.status, 'revoked');
  assert.equal(result.assignment.userId, 'user1');
  assert.equal(result.assignment.organizationId, 'org1');
  assert.equal(result.assignment.roleId, 'role1');
});
