import type { RoleAssignment } from '../domain/role-assignment.js';

export interface RoleAssignmentRepository {
  save(assignment: RoleAssignment): Promise<void>;
  findActiveByUserOrganizationRole(
    userId: string,
    organizationId: string,
    roleId: string
  ): Promise<RoleAssignment | null>;
}
