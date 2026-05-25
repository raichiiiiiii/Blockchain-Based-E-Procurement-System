import { randomUUID } from 'node:crypto';
import type { PersistedRole, RoleRepository } from '../application/role-repository.js';
import type { Role, RoleScope, RoleStatus } from '../domain/role.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';

type RoleRow = {
  id: string;
  role_code: string;
  display_name: string;
  scope: RoleScope;
  description: string | null;
  permissions: unknown;
  status: RoleStatus;
  is_system_reserved: boolean;
};

function toPersistedRole(row: RoleRow): PersistedRole {
  return {
    id: row.id,
    roleCode: row.role_code,
    displayName: row.display_name,
    scope: row.scope,
    description: row.description ?? undefined,
    permissions: toStringArray(row.permissions),
    status: row.status,
    isSystemReserved: row.is_system_reserved,
  };
}

export class PostgresRoleRepository implements RoleRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(role: Role): Promise<PersistedRole> {
    const result = await this.db.query<RoleRow>(
      `
        INSERT INTO roles (
          id,
          role_code,
          display_name,
          scope,
          description,
          permissions,
          status,
          is_system_reserved
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        ON CONFLICT (role_code, scope)
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions,
          status = EXCLUDED.status,
          is_system_reserved = EXCLUDED.is_system_reserved,
          updated_at = now()
        RETURNING *
      `,
      [
        `role_${randomUUID()}`,
        role.roleCode,
        role.displayName,
        role.scope,
        role.description ?? null,
        JSON.stringify(role.permissions),
        role.status,
        role.isSystemReserved,
      ],
    );

    return toPersistedRole(result.rows[0]);
  }

  async findByRoleCode(roleCode: string, scope: RoleScope): Promise<PersistedRole | null> {
    const result = await this.db.query<RoleRow>(
      'SELECT * FROM roles WHERE role_code = $1 AND scope = $2',
      [roleCode, scope],
    );

    return result.rows[0] ? toPersistedRole(result.rows[0]) : null;
  }

  async findAll(): Promise<PersistedRole[]> {
    const result = await this.db.query<RoleRow>(
      'SELECT * FROM roles ORDER BY role_code, scope',
    );

    return result.rows.map(row => toPersistedRole(row));
  }

  async findById(id: string): Promise<PersistedRole | null> {
    const result = await this.db.query<RoleRow>(
      'SELECT * FROM roles WHERE id = $1',
      [id],
    );

    return result.rows[0] ? toPersistedRole(result.rows[0]) : null;
  }

  async update(role: PersistedRole): Promise<PersistedRole | null> {
    const result = await this.db.query<RoleRow>(
      `
        UPDATE roles
        SET
          display_name = $2,
          description = $3,
          permissions = $4::jsonb,
          status = $5,
          is_system_reserved = $6,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [
        role.id,
        role.displayName,
        role.description ?? null,
        JSON.stringify(role.permissions),
        role.status,
        role.isSystemReserved,
      ],
    );

    return result.rows[0] ? toPersistedRole(result.rows[0]) : null;
  }
}
