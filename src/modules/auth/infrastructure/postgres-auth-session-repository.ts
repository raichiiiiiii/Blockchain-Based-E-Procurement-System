import type { AuthSessionRepository } from '../application/auth-session-repository.js';
import type { AuthSession, AuthSessionStatus } from '../domain/auth-session.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';

type AuthSessionRow = {
  session_id: string;
  token_hash: string;
  actor_user_id: string;
  actor_organization_id: string | null;
  actor_role_codes: string[];
  status: AuthSessionStatus;
  issued_at: Date | string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  authentication_method: 'localPassword';
};

function toAuthSession(row: AuthSessionRow): AuthSession {
  return {
    sessionId: row.session_id,
    tokenHash: row.token_hash,
    actorUserId: row.actor_user_id,
    actorOrganizationId: row.actor_organization_id ?? undefined,
    actorRoleCodes: toStringArray(row.actor_role_codes),
    status: row.status,
    issuedAt: toIsoString(row.issued_at),
    expiresAt: toIsoString(row.expires_at),
    revokedAt: toOptionalIsoString(row.revoked_at),
    authenticationMethod: row.authentication_method,
  };
}

export class PostgresAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(session: AuthSession): Promise<AuthSession> {
    const result = await this.db.query<AuthSessionRow>(
      `
        INSERT INTO auth_sessions (
          session_id,
          token_hash,
          actor_user_id,
          actor_organization_id,
          actor_role_codes,
          status,
          issued_at,
          expires_at,
          revoked_at,
          authentication_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (session_id)
        DO UPDATE SET
          token_hash = EXCLUDED.token_hash,
          actor_user_id = EXCLUDED.actor_user_id,
          actor_organization_id = EXCLUDED.actor_organization_id,
          actor_role_codes = EXCLUDED.actor_role_codes,
          status = EXCLUDED.status,
          issued_at = EXCLUDED.issued_at,
          expires_at = EXCLUDED.expires_at,
          revoked_at = EXCLUDED.revoked_at,
          authentication_method = EXCLUDED.authentication_method
        RETURNING *
      `,
      [
        session.sessionId,
        session.tokenHash,
        session.actorUserId,
        session.actorOrganizationId ?? null,
        session.actorRoleCodes,
        session.status,
        session.issuedAt,
        session.expiresAt,
        session.revokedAt ?? null,
        session.authenticationMethod,
      ],
    );

    return toAuthSession(result.rows[0]);
  }

  async findById(sessionId: string): Promise<AuthSession | null> {
    const result = await this.db.query<AuthSessionRow>(
      'SELECT * FROM auth_sessions WHERE session_id = $1',
      [sessionId],
    );

    return result.rows[0] ? toAuthSession(result.rows[0]) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const result = await this.db.query<AuthSessionRow>(
      'SELECT * FROM auth_sessions WHERE token_hash = $1',
      [tokenHash],
    );

    return result.rows[0] ? toAuthSession(result.rows[0]) : null;
  }
}
