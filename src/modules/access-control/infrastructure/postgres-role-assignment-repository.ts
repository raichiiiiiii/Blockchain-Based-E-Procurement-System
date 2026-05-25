import type { RoleAssignmentRepository } from '../application/role-assignment-repository.js';
import type { RoleAssignment, RoleAssignmentStatus } from '../domain/role-assignment.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';

type RoleAssignmentRow = {
  user_id: string;
  organization_id: string;
  role_id: string;
  status: RoleAssignmentStatus;
};

function toRoleAssignment(row: RoleAssignmentRow): RoleAssignment {
  return {
    userId: row.user_id,
    organizationId: row.organization_id,
    roleId: row.role_id,
    status: row.status,
  };
}

function parseAssignmentId(id: string): [string, string, string] {
  const [userId, organizationId, roleId] = id.split(':');
  return [userId, organizationId, roleId];
}

export class PostgresRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(assignment: RoleAssignment): Promise<void> {
    await this.db.query(
      `
        INSERT INTO role_assignments (
          user_id,
          organization_id,
          role_id,
          status
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, organization_id, role_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = now()
      `,
      [
        assignment.userId,
        assignment.organizationId,
        assignment.roleId,
        assignment.status,
      ],
    );
  }

  async findActiveByUserOrganizationRole(
    userId: string,
    organizationId: string,
    roleId: string
  ): Promise<RoleAssignment | null> {
    const result = await this.db.query<RoleAssignmentRow>(
      `
        SELECT * FROM role_assignments
        WHERE user_id = $1
          AND organization_id = $2
          AND role_id = $3
          AND status = 'active'
      `,
      [userId, organizationId, roleId],
    );

    return result.rows[0] ? toRoleAssignment(result.rows[0]) : null;
  }

  async existsActiveAssignmentByUserAndOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
        SELECT 1 FROM role_assignments
        WHERE user_id = $1
          AND organization_id = $2
          AND status = 'active'
        LIMIT 1
      `,
      [userId, organizationId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async findById(id: string): Promise<RoleAssignment | null> {
    const [userId, organizationId, roleId] = parseAssignmentId(id);
    const result = await this.db.query<RoleAssignmentRow>(
      `
        SELECT * FROM role_assignments
        WHERE user_id = $1
          AND organization_id = $2
          AND role_id = $3
      `,
      [userId, organizationId, roleId],
    );

    return result.rows[0] ? toRoleAssignment(result.rows[0]) : null;
  }

  async update(assignment: RoleAssignment): Promise<void> {
    await this.save(assignment);
  }
}
