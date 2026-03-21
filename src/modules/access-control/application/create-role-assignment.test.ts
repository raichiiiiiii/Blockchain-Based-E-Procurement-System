import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createRoleAssignment } from './create-role-assignment.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { Role } from '../domain/role.js';
import type { MemberOrganization } from '../../membership/domain/member-organization.js';

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

  // Create an organization
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

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository);

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

  // Create an organization
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
  await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository);

  // Try to create the same assignment again
  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository);

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

  // Create an organization
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
  const result = await createRoleAssignment(activeAssignment, assignmentRepository, roleRepository, memberOrganizationRepository);

  assert.equal(result.status, 'created');
  assert.deepEqual(result.assignment, activeAssignment);
});

test('should return roleNotFound when role does not exist', async () => {
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

  // Create an organization
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

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository);

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

  const result = await createRoleAssignment(assignment, assignmentRepository, roleRepository, memberOrganizationRepository);

  assert.equal(result.status, 'organizationNotFound');
});
