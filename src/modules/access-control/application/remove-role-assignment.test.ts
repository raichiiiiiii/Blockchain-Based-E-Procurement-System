import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { removeRoleAssignment, type ProtectedAccessDependencies } from './remove-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Test double implementations for status lookups
class TestUserStatusLookup implements UserStatusLookup {
  private readonly statuses: Map<string, 'active' | 'inactive' | null>;
  
  constructor(statuses: Map<string, 'active' | 'inactive' | null> = new Map()) {
    this.statuses = statuses;
  }
  
  async getUserStatus(userId: string): Promise<'active' | 'inactive' | null> {
    return this.statuses.get(userId) ?? null;
  }
}

class TestMemberStatusLookup implements MemberStatusLookup {
  private readonly statuses: Map<string, 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null>;
  
  constructor(statuses: Map<string, 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null> = new Map()) {
    this.statuses = statuses;
  }
  
  async getMemberOrganizationStatus(organizationId: string): Promise<'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null> {
    return this.statuses.get(organizationId) ?? null;
  }
}

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

// New tests for deactivation-aware access evaluation

test('should deny access when actor user is inactive', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create an active assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  await assignmentRepository.save(assignment);

  // Create protected access dependencies with inactive actor user
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'inactive-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['inactive-actor', 'inactive']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'active']]))
  };

  const result = await removeRoleAssignment(
    'target-user',
    'org1',
    'role1',
    assignmentRepository,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'userInactive');
  assert.equal(result.message, 'User account is inactive');
});

test('should deny access when target organization is inactive', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create an active assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  await assignmentRepository.save(assignment);

  // Create protected access dependencies with active actor user and inactive organization
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'inactive']]))
  };

  const result = await removeRoleAssignment(
    'target-user',
    'org1',
    'role1',
    assignmentRepository,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'organizationInactive');
  assert.equal(result.message, 'Organization is inactive');
});

test('should deny access when target organization is suspended', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create an active assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  await assignmentRepository.save(assignment);

  // Create protected access dependencies with active actor user and suspended organization
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'suspended']]))
  };

  const result = await removeRoleAssignment(
    'target-user',
    'org1',
    'role1',
    assignmentRepository,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'organizationSuspended');
  assert.equal(result.message, 'Organization is suspended');
});

test('should allow removal when actor user and target organization are active', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create an active assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  await assignmentRepository.save(assignment);

  // Create protected access dependencies with active actor user and organization
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'active']]))
  };

  const result = await removeRoleAssignment(
    'target-user',
    'org1',
    'role1',
    assignmentRepository,
    protectedAccess
  );

  assert.equal(result.status, 'removed');
  assert.ok(result.assignment);
  assert.equal(result.assignment.status, 'revoked');
  assert.equal(result.assignment.userId, 'target-user');
  assert.equal(result.assignment.organizationId, 'org1');
  assert.equal(result.assignment.roleId, 'role1');
});

test('should maintain backward compatibility when no protected access dependencies are provided', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();

  // Create an active assignment
  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: 'org1',
    roleId: 'role1',
    status: 'active'
  };

  await assignmentRepository.save(assignment);

  // Call without protectedAccess parameter (backward compatibility)
  const result = await removeRoleAssignment('user1', 'org1', 'role1', assignmentRepository);

  assert.equal(result.status, 'removed');
  assert.ok(result.assignment);
  assert.equal(result.assignment.status, 'revoked');
  assert.equal(result.assignment.userId, 'user1');
  assert.equal(result.assignment.organizationId, 'org1');
  assert.equal(result.assignment.roleId, 'role1');
});
