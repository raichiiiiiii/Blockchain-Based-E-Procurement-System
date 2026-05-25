import type { PlatformUserCredentialRepository } from '../application/platform-user-credential-repository.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString } from '../../../infrastructure/database/postgres-row-utils.js';

type PlatformUserCredentialRow = {
  user_id: string;
  username: string;
  password_hash: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function toCredential(row: PlatformUserCredentialRow): PlatformUserCredential {
  return {
    userId: row.user_id,
    username: row.username,
    passwordHash: row.password_hash,
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
      'SELECT * FROM platform_user_credentials WHERE username = $1',
      [username],
    );

    return result.rows[0] ? toCredential(result.rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<PlatformUserCredential | null> {
    const result = await this.db.query<PlatformUserCredentialRow>(
      'SELECT * FROM platform_user_credentials WHERE user_id = $1',
      [userId],
    );

    return result.rows[0] ? toCredential(result.rows[0]) : null;
  }
}
