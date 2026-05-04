import type { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';
import type { RoleRepository } from './role-repository.js';
import { evaluateProtectedAccess } from './evaluate-protected-access.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Define a type for the protected access dependencies
export type ProtectedAccessDependencies = {
  actorUserId: string;
  userStatusLookup: UserStatusLookup;
  memberStatusLookup: MemberStatusLookup;
};

export type ChangeRoleAssignmentResult = 
  | { status: 'changed', oldAssignment: RoleAssignment, newAssignment: RoleAssignment }
  | { status: 'notFound' }
  | { status: 'roleNotFound' }
  | { status: 'duplicate' }
  | { status: 'sameRole' }
  | { status: 'accessDenied', reason: string, message: string };

export async function changeRoleAssignment(
  userId: string,
  organizationId: string,
  currentRoleId: string,
  newRoleId: string,
  assignmentRepository: RoleAssignmentRepository,
  roleRepository: RoleRepository,
  protectedAccess?: ProtectedAccessDependencies
): Promise<ChangeRoleAssignmentResult> {
  // Reject if currentRoleId === newRoleId
  if (currentRoleId === newRoleId) {
    return { status: 'sameRole' };
  }

  // Validate newRoleId exists
  const newRole = await roleRepository.findById(newRoleId);
  if (!newRole) {
    return { status: 'roleNotFound' };
  }

  // Find the current active assignment for userId + organizationId + currentRoleId
  const currentAssignment = await assignmentRepository.findActiveByUserOrganizationRole(
    userId,
    organizationId,
    currentRoleId
  );

  // If not found, return notFound
  if (!currentAssignment) {
    return { status: 'notFound' };
  }

  // Run protected access/deactivation check if protectedAccess is provided
  if (protectedAccess) {
    const accessDecision = await evaluateProtectedAccess({
      userId: protectedAccess.actorUserId,
      organizationId: organizationId,
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

  // Check whether an active assignment already exists for userId + organizationId + newRoleId
  const existingNewAssignment = await assignmentRepository.findActiveByUserOrganizationRole(
    userId,
    organizationId,
    newRoleId
  );

  // If yes, return duplicate
  if (existingNewAssignment) {
    return { status: 'duplicate' };
  }

  // Revoke the current assignment
  const revokedAssignment: RoleAssignment = {
    ...currentAssignment,
    status: 'revoked'
  };
  await assignmentRepository.update(revokedAssignment);

  // Create a new active assignment with newRoleId
  const newAssignment: RoleAssignment = {
    userId,
    organizationId,
    roleId: newRoleId,
    status: 'active'
  };
  await assignmentRepository.save(newAssignment);

  // Return success with both assignments
  return { 
    status: 'changed', 
    oldAssignment: revokedAssignment, 
    newAssignment 
  };
}
