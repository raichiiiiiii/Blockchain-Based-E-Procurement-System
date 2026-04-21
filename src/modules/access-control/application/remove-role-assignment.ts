import type { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';

export type RemoveRoleAssignmentResult = 
  | { status: 'removed', assignment: RoleAssignment }
  | { status: 'notFound' }
  | { status: 'alreadyRevoked', assignment: RoleAssignment };

export async function removeRoleAssignment(
  userId: string,
  organizationId: string,
  roleId: string,
  assignmentRepository: RoleAssignmentRepository
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
