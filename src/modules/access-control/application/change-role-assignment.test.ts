import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { changeRoleAssignment, type ProtectedAccessDependencies } from './change-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { Role } from '../domain/role.js';
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

// New tests for deactivation-aware access evaluation

test('should deny access when actor user is inactive', async () => {
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

  // Create protected access dependencies with inactive actor user
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'inactive-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['inactive-actor', 'inactive']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'active']]))
  };

  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'userInactive');
  assert.equal(result.message, 'User account is inactive');
});

test('should deny access when target organization is inactive', async () => {
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

  // Create protected access dependencies with active actor user and inactive organization
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'inactive']]))
  };

  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'organizationInactive');
  assert.equal(result.message, 'Organization is inactive');
});

test('should deny access when target organization is suspended', async () => {
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

  // Create protected access dependencies with active actor user and suspended organization
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'suspended']]))
  };

  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'organizationSuspended');
  assert.equal(result.message, 'Organization is suspended');
});

test('should allow change when actor user and target organization are active', async () => {
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

  // Create protected access dependencies with active actor user and organization
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([['org1', 'active']]))
  };

  const result = await changeRoleAssignment(
    'user1',
    'org1',
    persistedCurrentRole.id,
    persistedNewRole.id,
    assignmentRepository,
    roleRepository,
    protectedAccess
  );

  assert.equal(result.status, 'changed');
  assert.ok(result.oldAssignment);
  assert.equal(result.oldAssignment.status, 'revoked');
  assert.ok(result.newAssignment);
  assert.equal(result.newAssignment.status, 'active');
  assert.equal(result.newAssignment.roleId, persistedNewRole.id);
});

test('should maintain backward compatibility when no protected access dependencies are provided', async () => {
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

  // Call without protectedAccess parameter (backward compatibility)
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
