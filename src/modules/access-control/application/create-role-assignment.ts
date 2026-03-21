import { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';
import type { RoleRepository } from './role-repository.js';
import type { MemberOrganizationRepository } from '../../membership/application/member-organization-repository.js';

export type CreateRoleAssignmentResult = 
  | { status: 'duplicate' }
  | { status: 'created', assignment: RoleAssignment }
  | { status: 'roleNotFound' }
  | { status: 'organizationNotFound' };

export async function createRoleAssignment(
  assignment: RoleAssignment,
  assignmentRepository: RoleAssignmentRepository,
  roleRepository: RoleRepository,
  memberOrganizationRepository: MemberOrganizationRepository
): Promise<CreateRoleAssignmentResult> {
  // First check if the role exists
  const role = await roleRepository.findById(assignment.roleId);
  if (!role) {
    return { status: 'roleNotFound' };
  }

  // Then check if the organization exists
  const organization = await memberOrganizationRepository.findById(assignment.organizationId);
  if (!organization) {
    return { status: 'organizationNotFound' };
  }

  // Then check for duplicate active assignment
  const existingAssignment = await assignmentRepository.findActiveByUserOrganizationRole(
    assignment.userId,
    assignment.organizationId,
    assignment.roleId
  );

  if (existingAssignment) {
    return { status: 'duplicate' };
  }

  await assignmentRepository.save(assignment);
  return { status: 'created', assignment };
}
