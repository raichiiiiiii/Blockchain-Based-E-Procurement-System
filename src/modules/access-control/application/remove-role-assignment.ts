import type { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';
import { evaluateProtectedAccess } from './evaluate-protected-access.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Define a type for the protected access dependencies
export type ProtectedAccessDependencies = {
  actorUserId: string;
  userStatusLookup: UserStatusLookup;
  memberStatusLookup: MemberStatusLookup;
};

export type RemoveRoleAssignmentResult = 
  | { status: 'removed', assignment: RoleAssignment }
  | { status: 'notFound' }
  | { status: 'alreadyRevoked', assignment: RoleAssignment }
  | { status: 'accessDenied', reason: string, message: string };

export async function removeRoleAssignment(
  userId: string,
  organizationId: string,
  roleId: string,
  assignmentRepository: RoleAssignmentRepository,
  protectedAccess?: ProtectedAccessDependencies
): Promise<RemoveRoleAssignmentResult> {
  // Create a composite ID to find the assignment
  const assignmentId = `${userId}:${organizationId}:${roleId}`;
  
  // Find the assignment
  const assignment = await assignmentRepository.findById(assignmentId);
  
  // If assignment doesn't exist, return notFound
  if (!assignment) {
    return { status: 'notFound' };
  }
  
  // If assignment is already revoked, return alreadyRevoked
  if (assignment.status === 'revoked') {
    return { status: 'alreadyRevoked', assignment };
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
  
  // Create a revoked version of the assignment
  const revokedAssignment: RoleAssignment = {
    ...assignment,
    status: 'revoked'
  };
  
  // Update the assignment in the repository
  await assignmentRepository.update(revokedAssignment);
  
  // Return the revoked assignment
  return { status: 'removed', assignment: revokedAssignment };
}
