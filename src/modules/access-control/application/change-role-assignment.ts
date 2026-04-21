import type { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';
import type { RoleRepository } from './role-repository.js';

export type ChangeRoleAssignmentResult = 
  | { status: 'changed', oldAssignment: RoleAssignment, newAssignment: RoleAssignment }
  | { status: 'notFound' }
  | { status: 'roleNotFound' }
  | { status: 'duplicate' }
  | { status: 'sameRole' };

export async function changeRoleAssignment(
  userId: string,
  organizationId: string,
  currentRoleId: string,
  newRoleId: string,
  assignmentRepository: RoleAssignmentRepository,
  roleRepository: RoleRepository
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
