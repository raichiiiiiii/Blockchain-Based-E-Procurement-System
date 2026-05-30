import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toOptionalIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ExternalClientCredential } from '../application/external-client-credential.js';
import type { ExternalClientCredentialRepository } from '../application/external-client-credential-repository.js';

type ExternalClientCredentialRow = {
  client_id: string;
  client_name: string;
  scopes: unknown;
  status: ExternalClientCredential['status'];
  secret_hash: string;
  created_at: string | Date;
  revoked_at?: string | Date | null;
};

function toExternalClientCredential(row: ExternalClientCredentialRow): ExternalClientCredential {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    scopes: toStringArray(row.scopes) as ExternalClientCredential['scopes'],
    status: row.status,
    secretHash: row.secret_hash,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    revokedAt: toOptionalIsoString(row.revoked_at),
  };
}

export class PostgresExternalClientCredentialRepository implements ExternalClientCredentialRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async findByClientId(clientId: string): Promise<ExternalClientCredential | null> {
    const result = await this.db.query<ExternalClientCredentialRow>(
      `
        SELECT
          client_id,
          client_name,
          scopes,
          status,
          secret_hash,
          created_at,
          revoked_at
        FROM external_client_credentials
        WHERE client_id = $1
      `,
      [clientId],
    );

    return result.rows[0] ? toExternalClientCredential(result.rows[0]) : null;
  }
}
