import { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';
import type { RoleRepository } from './role-repository.js';
import type { MemberOrganizationRepository } from '../../membership/application/member-organization-repository.js';
import type { UserExistenceLookup } from '../../shared/application/user-existence-lookup.js';
import type { OrganizationMembershipLookup } from '../../shared/application/organization-membership-lookup.js';
import { evaluateProtectedAccess } from './evaluate-protected-access.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Define a type for the lookup dependencies to create a typed seam
export type AssignmentValidationLookups = {
  userExistence: UserExistenceLookup;
  organizationMembership: OrganizationMembershipLookup;
};

// Define a type for the protected access dependencies
export type ProtectedAccessDependencies = {
  actorUserId: string;
  userStatusLookup: UserStatusLookup;
  memberStatusLookup: MemberStatusLookup;
};

export type CreateRoleAssignmentResult = 
  | { status: 'duplicate' }
  | { status: 'created', assignment: RoleAssignment }
  | { status: 'roleNotFound' }
  | { status: 'organizationNotFound' }
  | { status: 'userNotFound' }
  | { status: 'userNotMember' }
  | { status: 'accessDenied', reason: string, message: string };

export async function createRoleAssignment(
  assignment: RoleAssignment,
  assignmentRepository: RoleAssignmentRepository,
  roleRepository: RoleRepository,
  memberOrganizationRepository: MemberOrganizationRepository,
  lookups?: AssignmentValidationLookups,
  protectedAccess?: ProtectedAccessDependencies
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

  // Then check if the user exists
  if (lookups) {
    const userExists = await lookups.userExistence.userExists(assignment.userId);
    if (!userExists) {
      return { status: 'userNotFound' };
    }

    // Then check if the user is a member of the organization
    const isMember = await lookups.organizationMembership.isUserMemberOfOrganization(
      assignment.userId,
      assignment.organizationId
    );
    if (!isMember) {
      return { status: 'userNotMember' };
    }
  }

  // Run protected access/deactivation check if protectedAccess is provided
  if (protectedAccess) {
    const accessDecision = await evaluateProtectedAccess({
      userId: protectedAccess.actorUserId,
      organizationId: assignment.organizationId,
      userStatusLookup: protectedAccess.userStatusLookup,
      memberStatusLookup: protectedAccess.memberStatusLookup
    });

    if (accessDecision.status === 'denied') {
      return {
        status: 'accessDenied',
        reason: accessDecision.reason,
        message: accessDecision.message
      };
    }
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
