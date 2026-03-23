import { RoleAssignment } from '../domain/role-assignment.js';
import type { RoleAssignmentRepository } from '../application/role-assignment-repository.js';

export class InMemoryRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly assignments: RoleAssignment[] = [];

  async save(assignment: RoleAssignment): Promise<void> {
    this.assignments.push(assignment);
  }

  async findActiveByUserOrganizationRole(
    userId: string,
    organizationId: string,
    roleId: string
  ): Promise<RoleAssignment | null> {
    for (const assignment of this.assignments) {
      if (
        assignment.userId === userId &&
        assignment.organizationId === organizationId &&
        assignment.roleId === roleId &&
        assignment.status === 'active'
      ) {
        return assignment;
      }
    }
    return null;
  }

  async existsActiveAssignmentByUserAndOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    for (const assignment of this.assignments) {
      if (
        assignment.userId === userId &&
        assignment.organizationId === organizationId &&
        assignment.status === 'active'
      ) {
        return true;
      }
    }
    return false;
  }
}
