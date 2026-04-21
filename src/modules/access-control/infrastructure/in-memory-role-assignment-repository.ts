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

  async findById(id: string): Promise<RoleAssignment | null> {
    for (const assignment of this.assignments) {
      if (assignment.userId === id.split(':')[0] && 
          assignment.organizationId === id.split(':')[1] && 
          assignment.roleId === id.split(':')[2]) {
        return assignment;
      }
    }
    return null;
  }

  async update(assignment: RoleAssignment): Promise<void> {
    // In a real implementation, we would update the assignment in storage
    // For this in-memory implementation, we're just ensuring the assignment exists
    // In a more robust implementation, we might replace the assignment in the array
    for (let i = 0; i < this.assignments.length; i++) {
      const existing = this.assignments[i];
      if (existing.userId === assignment.userId &&
          existing.organizationId === assignment.organizationId &&
          existing.roleId === assignment.roleId) {
        this.assignments[i] = assignment;
        return;
      }
    }
    // If not found, add it (this shouldn't happen in normal operation)
    this.assignments.push(assignment);
  }
}
