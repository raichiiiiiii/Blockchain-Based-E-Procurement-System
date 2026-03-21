import { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from './role-assignment-repository.js';

export type CreateRoleAssignmentResult = 
  | { status: 'duplicate' }
  | { status: 'created', assignment: RoleAssignment };

export async function createRoleAssignment(
  assignment: RoleAssignment,
  repository: RoleAssignmentRepository
): Promise<CreateRoleAssignmentResult> {
  const existingAssignment = await repository.findActiveByUserOrganizationRole(
    assignment.userId,
    assignment.organizationId,
    assignment.roleId
  );

  if (existingAssignment) {
    return { status: 'duplicate' };
  }

  await repository.save(assignment);
  return { status: 'created', assignment };
}
