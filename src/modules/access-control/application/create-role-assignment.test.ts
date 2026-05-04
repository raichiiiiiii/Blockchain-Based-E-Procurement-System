import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createRoleAssignment, type AssignmentValidationLookups, type ProtectedAccessDependencies } from './create-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { Role } from '../domain/role.js';
import type { MemberOrganization } from '../../membership/domain/member-organization.js';
import type { UserExistenceLookup } from '../../shared/application/user-existence-lookup.js';
import type { OrganizationMembershipLookup } from '../../shared/application/organization-membership-lookup.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Create minimal stub objects that satisfy the lookup interfaces
const stubUserExistenceLookup: UserExistenceLookup = {
  userExists: async () => true
};

const stubOrganizationMembershipLookup: OrganizationMembershipLookup = {
  isUserMemberOfOrganization: async () => true
};

const stubLookups: AssignmentValidationLookups = {
  userExistence: stubUserExistenceLookup,
  organizationMembership: stubOrganizationMembershipLookup
};

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

test('should create a role assignment successfully when role and organization exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, assignment);
});

test('should detect duplicate active assignment when role and organization exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  // Create the first assignment
  await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  // Try to create the same assignment again
  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  assert.equal(result.status, 'duplicate');
});

test('should allow new active assignment when existing is revoked and role and organization exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  // Manually save a revoked assignment
  const revokedAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'revoked'
  };
  await assignmentRepository.save(revokedAssignment);

  // Try to create an active assignment with the same tuple
  const activeAssignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };
  const result = await createRoleAssignment(activeAssignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, activeAssignment);
});

test('should return roleNotFound when role does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: 'non-existent-role-id',
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  assert.equal(result.status, 'roleNotFound');
});

test('should return organizationNotFound when organization does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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
    organizationId: 'non-existent-organization-id',
    roleId: persistedRole.id,
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  assert.equal(result.status, 'organizationNotFound');
});

test('should return userNotFound when user does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

  // Create a role
  const role: Role = {
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedRole = await roleRepository.save(role);

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  // Create lookups that report user doesn't exist
  const lookups: AssignmentValidationLookups = {
    userExistence: {
      userExists: async () => false
    },
    organizationMembership: {
      isUserMemberOfOrganization: async () => true
    }
  };

  const assignment: RoleAssignment = {
    userId: 'non-existent-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, lookups);

  assert.equal(result.status, 'userNotFound');
});

test('should return userNotMember when user is not a member of the organization', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

  // Create a role
  const role: Role = {
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedRole = await roleRepository.save(role);

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  // Create lookups that report user exists but is not a member
  const lookups: AssignmentValidationLookups = {
    userExistence: {
      userExists: async () => true
    },
    organizationMembership: {
      isUserMemberOfOrganization: async () => false
    }
  };

  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, lookups);

  assert.equal(result.status, 'userNotMember');
});

test('should proceed with existing validation when user exists and is a member', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

  // Create a role
  const role: Role = {
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  };

  const persistedRole = await roleRepository.save(role);

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  // Create lookups that report user exists and is a member
  const lookups: AssignmentValidationLookups = {
    userExistence: {
      userExists: async () => true
    },
    organizationMembership: {
      isUserMemberOfOrganization: async () => true
    }
  };

  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, lookups);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, assignment);
});

// New tests for deactivation-aware access evaluation

test('should deny access when actor user is inactive', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  // Create protected access dependencies with inactive actor user
  // Note: The organization domain fixture stays 'pendingReview', but the access-status lookup returns 'active'
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'inactive-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['inactive-actor', 'inactive']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'active']]))
  };

  const result = await createRoleAssignment(
    assignment, 
    assignmentRepository, 
    roleRepository, 
    memberOrganizationRepository, 
    stubLookups,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'userInactive');
  assert.equal(result.message, 'User account is inactive');
});

test('should deny access when target organization is inactive', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  // Create protected access dependencies with active actor user
  // Note: The organization domain fixture stays 'pendingReview', but the access-status lookup returns 'inactive'
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'inactive']]))
  };

  const result = await createRoleAssignment(
    assignment, 
    assignmentRepository, 
    roleRepository, 
    memberOrganizationRepository, 
    stubLookups,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'organizationInactive');
  assert.equal(result.message, 'Organization is inactive');
});

test('should deny access when target organization is suspended', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  // Create protected access dependencies with active actor user
  // Note: The organization domain fixture stays 'pendingReview', but the access-status lookup returns 'suspended'
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'suspended']]))
  };

  const result = await createRoleAssignment(
    assignment, 
    assignmentRepository, 
    roleRepository, 
    memberOrganizationRepository, 
    stubLookups,
    protectedAccess
  );

  assert.equal(result.status, 'accessDenied');
  assert.equal(result.reason, 'organizationSuspended');
  assert.equal(result.message, 'Organization is suspended');
});

test('should allow creation when actor user and target organization are active', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  // Create protected access dependencies with active actor user and organization
  // Note: The organization domain fixture stays 'pendingReview', but the access-status lookup returns 'active'
  const protectedAccess: ProtectedAccessDependencies = {
    actorUserId: 'active-actor',
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'active']]))
  };

  const result = await createRoleAssignment(
    assignment, 
    assignmentRepository, 
    roleRepository, 
    memberOrganizationRepository, 
    stubLookups,
    protectedAccess
  );

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, assignment);
});

test('should maintain backward compatibility when no protected access dependencies are provided', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

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

  // Create an organization (domain model only allows 'pendingReview' status)
  const organization: MemberOrganization = {
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  };

  const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

  const assignment: RoleAssignment = {
    userId: 'user1',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };

  // Call without protectedAccess parameter (backward compatibility)
  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository, stubLookups);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, assignment);
});
