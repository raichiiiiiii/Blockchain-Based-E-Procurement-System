import type { PlatformUserCredentialRepository } from '../application/platform-user-credential-repository.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';

type PlatformUserCredentialRow = {
  user_id: string;
  username: string;
  password_hash: string;
  actor_organization_id?: string | null;
  actor_role_codes?: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

function toCredential(row: PlatformUserCredentialRow): PlatformUserCredential {
  return {
    userId: row.user_id,
    username: row.username,
    passwordHash: row.password_hash,
    actorOrganizationId: row.actor_organization_id ?? undefined,
    actorRoleCodes: toStringArray(row.actor_role_codes),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export class PostgresPlatformUserCredentialRepository implements PlatformUserCredentialRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(credential: PlatformUserCredential): Promise<PlatformUserCredential> {
    await this.db.query(
      `
        INSERT INTO platform_users (user_id, created_at, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET updated_at = EXCLUDED.updated_at
      `,
      [credential.userId, credential.createdAt, credential.updatedAt],
    );

    const result = await this.db.query<PlatformUserCredentialRow>(
      `
        INSERT INTO platform_user_credentials (
          user_id,
          username,
          password_hash,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          password_hash = EXCLUDED.password_hash,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [
        credential.userId,
        credential.username,
        credential.passwordHash,
        credential.createdAt,
        credential.updatedAt,
      ],
    );

    return toCredential(result.rows[0]);
  }

  async findByUsername(username: string): Promise<PlatformUserCredential | null> {
    const result = await this.db.query<PlatformUserCredentialRow>(
      `
        SELECT
          credentials.user_id,
          credentials.username,
          credentials.password_hash,
          credentials.created_at,
          credentials.updated_at,
          membership.organization_id AS actor_organization_id,
          COALESCE(
            ARRAY_AGG(DISTINCT roles.role_code) FILTER (WHERE roles.role_code IS NOT NULL),
            ARRAY[]::TEXT[]
          ) AS actor_role_codes
        FROM platform_user_credentials credentials
        LEFT JOIN LATERAL (
          SELECT memberships.organization_id
          FROM organization_memberships memberships
          INNER JOIN member_organizations organizations
            ON organizations.id = memberships.organization_id
           AND organizations.status = 'active'
          WHERE memberships.user_id = credentials.user_id
            AND memberships.status = 'active'
          ORDER BY memberships.created_at ASC, memberships.organization_id ASC
          LIMIT 1
        ) membership ON TRUE
        LEFT JOIN role_assignments assignments
          ON assignments.user_id = credentials.user_id
         AND assignments.organization_id = membership.organization_id
         AND assignments.status = 'active'
        LEFT JOIN roles
          ON roles.id = assignments.role_id
         AND roles.status = 'active'
        WHERE credentials.username = $1
        GROUP BY
          credentials.user_id,
          credentials.username,
          credentials.password_hash,
          credentials.created_at,
          credentials.updated_at,
          membership.organization_id
      `,
      [username],
    );

    return result.rows[0] ? toCredential(result.rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<PlatformUserCredential | null> {
    const result = await this.db.query<PlatformUserCredentialRow>(
      `
        SELECT
          credentials.user_id,
          credentials.username,
          credentials.password_hash,
          credentials.created_at,
          credentials.updated_at,
          membership.organization_id AS actor_organization_id,
          COALESCE(
            ARRAY_AGG(DISTINCT roles.role_code) FILTER (WHERE roles.role_code IS NOT NULL),
            ARRAY[]::TEXT[]
          ) AS actor_role_codes
        FROM platform_user_credentials credentials
        LEFT JOIN LATERAL (
          SELECT memberships.organization_id
          FROM organization_memberships memberships
          INNER JOIN member_organizations organizations
            ON organizations.id = memberships.organization_id
           AND organizations.status = 'active'
          WHERE memberships.user_id = credentials.user_id
            AND memberships.status = 'active'
          ORDER BY memberships.created_at ASC, memberships.organization_id ASC
          LIMIT 1
        ) membership ON TRUE
        LEFT JOIN role_assignments assignments
          ON assignments.user_id = credentials.user_id
         AND assignments.organization_id = membership.organization_id
         AND assignments.status = 'active'
        LEFT JOIN roles
          ON roles.id = assignments.role_id
         AND roles.status = 'active'
        WHERE credentials.user_id = $1
        GROUP BY
          credentials.user_id,
          credentials.username,
          credentials.password_hash,
          credentials.created_at,
          credentials.updated_at,
          membership.organization_id
      `,
      [userId],
    );

    return result.rows[0] ? toCredential(result.rows[0]) : null;
  }
}
